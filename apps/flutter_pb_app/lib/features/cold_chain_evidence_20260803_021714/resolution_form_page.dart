import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'fixtures.dart';
import 'models.dart';

class EvidenceResolutionFormPage extends StatefulWidget {
  const EvidenceResolutionFormPage({
    super.key,
    this.initialVariant = EvidenceResolutionVariant.defaultView,
    this.showConfirmation = false,
  });

  factory EvidenceResolutionFormPage.fromRouteArgs(Object? arguments) {
    final args = arguments is Map ? arguments : const <Object?, Object?>{};
    final variant = args['variant'];
    return EvidenceResolutionFormPage(
      initialVariant: resolutionVariantFrom(variant),
      showConfirmation: variant == 'confirm-dialog-open',
    );
  }

  final EvidenceResolutionVariant initialVariant;
  final bool showConfirmation;

  @override
  State<EvidenceResolutionFormPage> createState() =>
      _EvidenceResolutionFormPageState();
}

class _EvidenceResolutionFormPageState
    extends State<EvidenceResolutionFormPage> {
  late EvidenceResolutionVariant _variant = widget.initialVariant;
  late ResolutionDraft _draft = _initialDraft(widget.initialVariant);
  final TextEditingController _notesController = TextEditingController();

  static ResolutionDraft _initialDraft(EvidenceResolutionVariant variant) {
    return switch (variant) {
      EvidenceResolutionVariant.readyToSubmit ||
      EvidenceResolutionVariant.submitted => readyResolutionDraft,
      EvidenceResolutionVariant.approvalRequired ||
      EvidenceResolutionVariant.approvalValidationError =>
        approvalRequiredDraft,
      _ => const ResolutionDraft(),
    };
  }

  bool get _showCoreErrors =>
      _variant == EvidenceResolutionVariant.validationError;
  bool get _showApprovalError =>
      _variant == EvidenceResolutionVariant.approvalValidationError;

  @override
  void initState() {
    super.initState();
    _notesController.text = _draft.notes;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.showConfirmation) {
        _confirmSubmit();
      } else if (_variant == EvidenceResolutionVariant.submitted) {
        AppPop.success('处置记录已提交，异常转为持续监控');
      }
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _update(ResolutionDraft next) {
    setState(() {
      _draft = next;
      if (_variant == EvidenceResolutionVariant.validationError ||
          _variant == EvidenceResolutionVariant.approvalValidationError) {
        _variant = EvidenceResolutionVariant.defaultView;
      }
    });
  }

  Future<void> _submit() async {
    if (!_draft.coreComplete) {
      setState(() => _variant = EvidenceResolutionVariant.validationError);
      return;
    }
    if (_draft.supervisor == null) {
      setState(
        () => _variant = EvidenceResolutionVariant.approvalValidationError,
      );
      return;
    }
    await _confirmSubmit();
  }

  Future<void> _confirmSubmit() async {
    final confirmed = await AppPop.confirm(
      title: '确认提交处置记录？',
      content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
      confirmText: '确认提交',
      cancelText: '取消',
    );
    if (!confirmed || !mounted) return;
    setState(() => _variant = EvidenceResolutionVariant.submitted);
    AppPop.success('处置记录已提交，异常转为持续监控');
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      appBar: const CommonAppBar(title: '提交处置', showBack: true),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          const _CaseSummary(),
          if (_showCoreErrors || _showApprovalError) ...[
            SizedBox(height: TS.spacing.smPlus),
            _ValidationBanner(
              message: _showApprovalError
                  ? '超温已持续 47 分钟，必须指定值班主管后才能提交。'
                  : '请补全异常原因、处置动作和三项现场确认。',
            ),
          ],
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: CommonFormSection(
              title: '处置判断  必填',
              description: '根据司机反馈与设备状态记录本次异常原因。',
              children: [
                CommonSelect<String>(
                  label: '异常原因',
                  hint: '请选择异常原因',
                  value: _draft.cause,
                  errorText: _showCoreErrors && _draft.cause == null
                      ? '请选择异常原因'
                      : null,
                  options: const [
                    CommonSelectOption(value: 'cooling-unit', label: '制冷机组异常'),
                    CommonSelectOption(value: 'door-open', label: '货箱门异常开启'),
                    CommonSelectOption(value: 'sensor', label: '探头读数异常'),
                  ],
                  onChanged: (value) => _update(
                    value == null
                        ? _draft.copyWith(clearCause: true)
                        : _draft.copyWith(cause: value),
                  ),
                ),
                SizedBox(height: TS.spacing.smPlus),
                CommonSelect<String>(
                  label: '处置动作',
                  hint: '请选择处置动作',
                  value: _draft.action,
                  errorText: _showCoreErrors && _draft.action == null
                      ? '请选择处置动作'
                      : null,
                  options: const [
                    CommonSelectOption(
                      value: 'backup-cooling',
                      label: '切换备用制冷',
                    ),
                    CommonSelectOption(value: 'stop-check', label: '停车检查货箱'),
                    CommonSelectOption(
                      value: 'replace-sensor',
                      label: '更换温度探头',
                    ),
                  ],
                  onChanged: (value) => _update(
                    value == null
                        ? _draft.copyWith(clearAction: true)
                        : _draft.copyWith(action: value),
                  ),
                ),
                SizedBox(height: TS.spacing.smPlus),
                CommonRadioGroup<String>(
                  label: '当前结果',
                  value: _draft.outcome,
                  options: const [
                    CommonSelectOption(value: 'falling', label: '温度开始回落'),
                    CommonSelectOption(value: 'rising', label: '温度仍在上升'),
                    CommonSelectOption(value: 'unknown', label: '暂时无法确认'),
                  ],
                  onChanged: (value) => _update(
                    value == null
                        ? _draft.copyWith(clearOutcome: true)
                        : _draft.copyWith(outcome: value),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: CommonFormSection(
              title: '现场确认  必填',
              description: '以下检查项会进入交付记录。',
              children: [
                CommonCheckbox(
                  label: '已联系司机并确认车辆安全',
                  value: _draft.driverChecked,
                  onChanged: (value) =>
                      _update(_draft.copyWith(driverChecked: value ?? false)),
                ),
                CommonCheckbox(
                  label: '已检查主制冷与备用制冷状态',
                  value: _draft.coolingChecked,
                  onChanged: (value) =>
                      _update(_draft.copyWith(coolingChecked: value ?? false)),
                ),
                CommonCheckbox(
                  label: '货箱未开封且无可见损伤',
                  value: _draft.cargoChecked,
                  onChanged: (value) =>
                      _update(_draft.copyWith(cargoChecked: value ?? false)),
                ),
                if (_showCoreErrors && !_draft.checksComplete)
                  Text(
                    '请完成三项现场确认',
                    style: TS.textStyle.caption.copyWith(
                      color: TS.colors.error,
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: CommonFormSection(
              title: '后续安排',
              description: '提交后调度中心将按此安排继续跟踪。',
              children: [
                CommonSwitch(
                  label: '保持每 2 分钟温度监控',
                  value: _draft.continueMonitoring,
                  onChanged: (value) =>
                      _update(_draft.copyWith(continueMonitoring: value)),
                ),
                SizedBox(height: TS.spacing.sm),
                CommonTextArea(
                  controller: _notesController,
                  label: '处置说明',
                  hint: '补充现场情况与后续安排',
                  onChanged: (value) => _draft = _draft.copyWith(notes: value),
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: CommonFormSection(
              title: '主管审批  必填',
              description: '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
              children: [
                CommonSelect<String>(
                  label: '值班主管',
                  hint: '请选择值班主管',
                  value: _draft.supervisor,
                  errorText: _showApprovalError ? '请选择值班主管' : null,
                  options: const [
                    CommonSelectOption(value: 'lin-lan', label: '华东值班经理 · 林岚'),
                  ],
                  onChanged: (value) => _update(
                    value == null
                        ? _draft.copyWith(clearSupervisor: true)
                        : _draft.copyWith(supervisor: value),
                  ),
                ),
                SizedBox(height: TS.spacing.sm),
                Text('当前异常持续 47 分钟，已触发主管审批阈值。', style: TS.textStyle.caption),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.md),
          CommonButton(
            label: '审核并提交',
            block: true,
            loading: false,
            onPressed: _submit,
          ),
          SizedBox(height: TS.spacing.xxl),
        ],
      ),
    );
  }
}

class _CaseSummary extends StatelessWidget {
  const _CaseSummary();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          Icon(Icons.verified_user_outlined, color: TS.colors.error),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SH-2048 · 严重超温', style: TS.textStyle.subtitle),
                SizedBox(height: TS.spacing.xs),
                Text(
                  '当前 10.8°C · 上限 8°C · 已持续 47 分钟',
                  style: TS.textStyle.caption,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ValidationBanner extends StatelessWidget {
  const _ValidationBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline, color: TS.colors.error),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Text(
              message,
              style: TS.textStyle.content.copyWith(color: TS.colors.error),
            ),
          ),
        ],
      ),
    );
  }
}
