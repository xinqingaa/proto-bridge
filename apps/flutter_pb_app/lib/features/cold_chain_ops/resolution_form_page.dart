import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'fixtures.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.resolution-form`
class ResolutionFormPage extends StatefulWidget {
  const ResolutionFormPage({
    super.key,
    this.variant = ResolutionVariant.defaultForm,
    this.shipmentId = 'SH-2048',
  });

  final ResolutionVariant variant;
  final String shipmentId;

  static ResolutionFormPage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const {};
    return ResolutionFormPage(
      variant: parseResolutionVariant(map['variant']),
      shipmentId: map['shipmentId']?.toString() ?? 'SH-2048',
    );
  }

  @override
  State<ResolutionFormPage> createState() => _ResolutionFormPageState();
}

class _ResolutionFormPageState extends State<ResolutionFormPage> {
  late ResolutionVariant _variant;
  String? _cause;
  String? _action;
  String? _outcome;
  bool _checkDriver = false;
  bool _checkCooling = false;
  bool _checkCargo = false;
  bool _continueMonitoring = true;
  String? _supervisor;
  String? _validationMessage;
  final _notes = TextEditingController();

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
    _hydrateVariant(_variant);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_variant == ResolutionVariant.confirmDialogOpen) {
        _submit(forceConfirmPrompt: true);
      }
    });
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  // Evidence default/active excursion cases always expose supervisor-approval
  // because over-temp already exceeds the 45-minute threshold.
  bool get _requiresSupervisorApproval => true;

  void _hydrateVariant(ResolutionVariant variant) {
    switch (variant) {
      case ResolutionVariant.readyToSubmit:
      case ResolutionVariant.confirmDialogOpen:
      case ResolutionVariant.submitted:
        _cause = kCauseOptions.first;
        _action = kActionOptions.first;
        _outcome = kOutcomeFalling;
        _checkDriver = true;
        _checkCooling = true;
        _checkCargo = true;
        _continueMonitoring = true;
        _supervisor = kSupervisorOptions.first;
        _notes.text = '已切换备用制冷，箱温开始回落。';
        _validationMessage = null;
      case ResolutionVariant.approvalRequired:
        _cause = kCauseOptions.first;
        _action = kActionOptions.first;
        _outcome = kOutcomeFalling;
        _checkDriver = true;
        _checkCooling = true;
        _checkCargo = true;
        _supervisor = null;
        _validationMessage = null;
      case ResolutionVariant.approvalValidationError:
        _cause = kCauseOptions.first;
        _action = kActionOptions.first;
        _outcome = kOutcomeFalling;
        _checkDriver = true;
        _checkCooling = true;
        _checkCargo = true;
        _supervisor = null;
        _validationMessage = '请选择值班主管后再提交。';
      case ResolutionVariant.validationError:
        _cause = null;
        _action = null;
        _outcome = null;
        _checkDriver = false;
        _checkCooling = false;
        _checkCargo = false;
        _supervisor = null;
        _validationMessage = '请完善必填项后再提交。';
      case ResolutionVariant.defaultForm:
        _validationMessage = null;
    }
  }

  Future<void> _submit({bool forceConfirmPrompt = false}) async {
    final missingFields = _cause == null ||
        _action == null ||
        _outcome == null ||
        !_checkDriver ||
        !_checkCooling ||
        !_checkCargo;

    if (missingFields && !forceConfirmPrompt) {
      setState(() {
        _variant = ResolutionVariant.validationError;
        _validationMessage = '请完善必填项后再提交。';
      });
      return;
    }

    if (_requiresSupervisorApproval &&
        (_supervisor == null || _supervisor!.isEmpty) &&
        !forceConfirmPrompt) {
      setState(() {
        _variant = ResolutionVariant.approvalValidationError;
        _validationMessage = '请选择值班主管后再提交。';
      });
      return;
    }

    final confirmed = forceConfirmPrompt ||
        await AppPop.confirm(
          title: '确认提交处置记录？',
          content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
          confirmText: '确认提交',
          cancelText: '取消',
        );
    if (!mounted) return;
    if (!confirmed) {
      if (forceConfirmPrompt) {
        setState(() => _variant = ResolutionVariant.readyToSubmit);
      }
      return;
    }

    setState(() {
      _variant = ResolutionVariant.submitted;
      _validationMessage = null;
    });
    AppPop.success('处置记录已提交');
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final submitted = _variant == ResolutionVariant.submitted;

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '提交处置', showBack: true),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          _CaseSummary(shipmentId: widget.shipmentId),
          if (_validationMessage != null) ...[
            SizedBox(height: TS.spacing.md),
            _ValidationBanner(message: _validationMessage!),
          ],
          SizedBox(height: TS.spacing.md),
          _RequiredFormSection(
            title: '处置判断',
            description: '根据司机反馈与设备状态记录本次异常原因。',
            children: [
              CommonSelect<String>(
                label: '异常原因',
                hint: '请选择',
                value: _cause,
                enabled: !submitted,
                options: [
                  for (final o in kCauseOptions)
                    CommonSelectOption(value: o, label: o),
                ],
                onChanged: (v) => setState(() => _cause = v),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonSelect<String>(
                label: '处置动作',
                hint: '请选择',
                value: _action,
                enabled: !submitted,
                options: [
                  for (final o in kActionOptions)
                    CommonSelectOption(value: o, label: o),
                ],
                onChanged: (v) => setState(() => _action = v),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonRadioGroup<String>(
                label: '当前结果',
                value: _outcome,
                enabled: !submitted,
                options: [
                  for (final o in kOutcomeOptions)
                    CommonSelectOption(value: o, label: o),
                ],
                onChanged: (v) => setState(() => _outcome = v),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.lg),
          _RequiredFormSection(
            title: '现场确认',
            description: '以下检查项会进入交付记录。',
            children: [
              CommonCheckbox(
                label: '已联系司机并确认车辆安全',
                value: _checkDriver,
                enabled: !submitted,
                onChanged: (v) => setState(() => _checkDriver = v ?? false),
              ),
              CommonCheckbox(
                label: '已检查主制冷与备用制冷状态',
                value: _checkCooling,
                enabled: !submitted,
                onChanged: (v) => setState(() => _checkCooling = v ?? false),
              ),
              CommonCheckbox(
                label: '货箱未开封且无可见损伤',
                value: _checkCargo,
                enabled: !submitted,
                onChanged: (v) => setState(() => _checkCargo = v ?? false),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.lg),
          CommonFormSection(
            title: '后续安排',
            description: '提交后调度中心将按此安排继续跟踪。',
            children: [
              CommonSwitch(
                label: '保持每 2 分钟温度监控',
                value: _continueMonitoring,
                enabled: !submitted,
                onChanged: (v) => setState(() => _continueMonitoring = v),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonTextArea(
                controller: _notes,
                label: '处置说明',
                enabled: !submitted,
              ),
            ],
          ),
          SizedBox(height: TS.spacing.lg),
          _RequiredFormSection(
            title: '主管审批',
            description: '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
            children: [
              CommonSelect<String>(
                label: '值班主管',
                hint: '请选择',
                value: _supervisor,
                enabled: !submitted,
                options: [
                  for (final o in kSupervisorOptions)
                    CommonSelectOption(value: o, label: o),
                ],
                onChanged: (v) => setState(() => _supervisor = v),
              ),
              SizedBox(height: TS.spacing.sm),
              Text(
                '当前异常持续 47 分钟，已触发主管审批阈值。',
                style: TS.textStyle.caption.copyWith(
                  color: TS.colors.onSurfaceMuted,
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          Text(
            '提交后会保留当前传感器读数与操作时间。',
            style: TS.textStyle.caption.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
          SizedBox(height: TS.spacing.md),
          CommonButton(
            label: submitted ? '已提交' : '审核并提交',
            block: true,
            tone: CommonButtonTone.action,
            disabled: submitted,
            onPressed: submitted ? null : () => _submit(),
          ),
        ],
      ),
    );
  }
}

class _CaseSummary extends StatelessWidget {
  const _CaseSummary({required this.shipmentId});

  final String shipmentId;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.health_and_safety_outlined,
              color: TS.colors.error, size: TS.sizing.iconMd),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$shipmentId · 严重超温',
                  style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  '当前 10.8°C · 上限 8°C · 已持续 47 分钟',
                  style: TS.textStyle.caption.copyWith(color: TS.colors.error),
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
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.md),
        border: Border.all(color: TS.colors.error.withValues(alpha: 0.35)),
      ),
      child: Text(
        message,
        style: TS.textStyle.content.copyWith(color: TS.colors.error),
      ),
    );
  }
}

class _RequiredFormSection extends StatelessWidget {
  const _RequiredFormSection({
    required this.title,
    required this.description,
    required this.children,
  });

  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    // Maps to Evidence `form-section`. Screenshot "必填" chip is approximated
    // via description prefix because CommonFormSection has no required slot.
    return CommonFormSection(
      title: title,
      description: '必填 · $description',
      children: children,
    );
  }
}
