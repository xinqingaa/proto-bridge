import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/app_bar.dart';
import '../../common/widgets/button.dart';
import '../../common/widgets/checkbox.dart';
import '../../common/widgets/radio_group.dart';
import '../../common/widgets/select.dart';
import '../../common/widgets/switch_control.dart';
import '../../common/widgets/text_area.dart';
import '../../theme/ts.dart';
import 'cold_chain_v3_models.dart';

/// Resolution form — Evidence screen `cold-chain-ops.resolution-form`.
class ColdChainV3ResolutionFormPage extends StatefulWidget {
  const ColdChainV3ResolutionFormPage({
    super.key,
    this.variant = ColdChainV3FormVariant.empty,
  });

  final ColdChainV3FormVariant variant;

  factory ColdChainV3ResolutionFormPage.fromRouteArgs(Object? args) {
    var variant = ColdChainV3FormVariant.empty;
    if (args is Map && args['variant'] is String) {
      variant = ColdChainV3FormVariant.values.firstWhere(
        (v) => v.name == args['variant'],
        orElse: () => ColdChainV3FormVariant.empty,
      );
    }
    return ColdChainV3ResolutionFormPage(variant: variant);
  }

  @override
  State<ColdChainV3ResolutionFormPage> createState() =>
      _ColdChainV3ResolutionFormPageState();
}

class _ColdChainV3ResolutionFormPageState
    extends State<ColdChainV3ResolutionFormPage> {
  String? _cause;
  String? _action;
  ColdChainV3Outcome? _outcome;
  bool _checkDriver = false;
  bool _checkCooling = false;
  bool _checkCargo = false;
  bool _continueMonitoring = true;
  String? _supervisor;
  String? _validationError;
  bool _showSupervisorSection = true;
  final _notes = TextEditingController();

  static const _excursionMinutes = 47;

  @override
  void initState() {
    super.initState();
    _applyVariant(widget.variant);
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  void _applyVariant(ColdChainV3FormVariant variant) {
    _showSupervisorSection = true;
    _validationError = null;
    switch (variant) {
      case ColdChainV3FormVariant.empty:
        break;
      case ColdChainV3FormVariant.readyToSubmit:
      case ColdChainV3FormVariant.confirmDialogOpen:
      case ColdChainV3FormVariant.submitted:
        _seedReadyForm(withSupervisor: true);
        break;
      case ColdChainV3FormVariant.approvalRequired:
        _seedReadyForm(withSupervisor: false);
        break;
      case ColdChainV3FormVariant.approvalValidationError:
        _seedReadyForm(withSupervisor: false);
        _validationError = '超温已持续 47 分钟，必须指定值班主管后才能提交。';
        break;
      case ColdChainV3FormVariant.validationError:
        _validationError = '请补全异常原因、处置动作和三项现场确认。';
        break;
    }

    if (variant == ColdChainV3FormVariant.confirmDialogOpen) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _submit();
      });
    } else if (variant == ColdChainV3FormVariant.submitted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          AppPop.success('处置记录已提交，异常转为持续监控');
        }
      });
    }
  }

  void _seedReadyForm({required bool withSupervisor}) {
    _cause = ColdChainV3FormOptions.causes.first;
    _action = ColdChainV3FormOptions.actions.first;
    _outcome = ColdChainV3Outcome.cooling;
    _checkDriver = true;
    _checkCooling = true;
    _checkCargo = true;
    _continueMonitoring = true;
    _supervisor =
        withSupervisor ? ColdChainV3FormOptions.supervisors.first : null;
  }

  bool get _requiresSupervisor => _excursionMinutes > 45;

  Future<void> _submit() async {
    final missingCore = _cause == null ||
        _action == null ||
        !_checkDriver ||
        !_checkCooling ||
        !_checkCargo;
    if (missingCore) {
      setState(() {
        _validationError = '请补全异常原因、处置动作和三项现场确认。';
      });
      return;
    }
    if (_requiresSupervisor && (_supervisor == null || _supervisor!.isEmpty)) {
      setState(() {
        _showSupervisorSection = true;
        _validationError = '超温已持续 47 分钟，必须指定值班主管后才能提交。';
      });
      return;
    }

    setState(() => _validationError = null);
    final confirmed = await AppPop.confirm(
      title: '确认提交处置记录？',
      content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
      confirmText: '确认提交',
      cancelText: '取消',
    );
    if (!mounted) return;
    if (confirmed) {
      AppPop.success('处置记录已提交，异常转为持续监控');
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '提交处置',
        showBack: true,
        elevated: false,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: EdgeInsets.all(TS.spacing.md),
              children: [
                _CaseSummary(),
                if (_validationError != null) ...[
                  SizedBox(height: TS.spacing.md),
                  _ValidationBanner(message: _validationError!),
                ],
                SizedBox(height: TS.spacing.md),
                _SectionCard(
                  title: '处置判断',
                  requiredBadge: true,
                  description: '根据司机反馈与设备状态记录本次异常原因。',
                  child: Column(
                    children: [
                      CommonSelect<String>(
                        label: '异常原因',
                        hint: '请选择异常原因',
                        value: _cause,
                        options: [
                          for (final c in ColdChainV3FormOptions.causes)
                            CommonSelectOption(value: c, label: c),
                        ],
                        onChanged: (v) => setState(() => _cause = v),
                      ),
                      SizedBox(height: TS.spacing.sm),
                      CommonSelect<String>(
                        label: '处置动作',
                        hint: '请选择处置动作',
                        value: _action,
                        options: [
                          for (final a in ColdChainV3FormOptions.actions)
                            CommonSelectOption(value: a, label: a),
                        ],
                        onChanged: (v) => setState(() => _action = v),
                      ),
                      SizedBox(height: TS.spacing.sm),
                      CommonRadioGroup<ColdChainV3Outcome>(
                        label: '当前结果',
                        value: _outcome,
                        options: [
                          for (final (value, label)
                              in ColdChainV3FormOptions.outcomes)
                            CommonSelectOption(value: value, label: label),
                        ],
                        onChanged: (v) => setState(() => _outcome = v),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: TS.spacing.md),
                _SectionCard(
                  title: '现场确认',
                  requiredBadge: true,
                  description: '以下检查项会进入交付记录。',
                  child: Column(
                    children: [
                      CommonCheckbox(
                        label: '已联系司机并确认车辆安全',
                        value: _checkDriver,
                        onChanged: (v) =>
                            setState(() => _checkDriver = v ?? false),
                      ),
                      CommonCheckbox(
                        label: '已检查主制冷与备用制冷状态',
                        value: _checkCooling,
                        onChanged: (v) =>
                            setState(() => _checkCooling = v ?? false),
                      ),
                      CommonCheckbox(
                        label: '货箱未开封且无可见损伤',
                        value: _checkCargo,
                        onChanged: (v) =>
                            setState(() => _checkCargo = v ?? false),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: TS.spacing.md),
                _SectionCard(
                  title: '后续安排',
                  description: '提交后调度中心将按此安排继续跟踪。',
                  child: Column(
                    children: [
                      CommonSwitch(
                        label: '保持每 2 分钟温度监控',
                        value: _continueMonitoring,
                        onChanged: (v) =>
                            setState(() => _continueMonitoring = v),
                      ),
                      SizedBox(height: TS.spacing.sm),
                      CommonTextArea(
                        controller: _notes,
                        label: '处置说明',
                      ),
                    ],
                  ),
                ),
                if (_showSupervisorSection && _requiresSupervisor) ...[
                  SizedBox(height: TS.spacing.md),
                  _SectionCard(
                    title: '主管审批',
                    requiredBadge: true,
                    description: '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CommonSelect<String>(
                          label: '值班主管',
                          hint: '请选择值班主管',
                          value: _supervisor,
                          errorText:
                              _validationError != null && _supervisor == null
                                  ? '请选择值班主管'
                                  : null,
                          options: [
                            for (final s in ColdChainV3FormOptions.supervisors)
                              CommonSelectOption(value: s, label: s),
                          ],
                          onChanged: (v) => setState(() => _supervisor = v),
                        ),
                        SizedBox(height: TS.spacing.sm),
                        Text(
                          '当前异常持续 47 分钟，已触发主管审批阈值。',
                          style: TS.textStyle.caption,
                        ),
                      ],
                    ),
                  ),
                ],
                SizedBox(height: TS.spacing.md),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                TS.spacing.md,
                TS.spacing.sm,
                TS.spacing.md,
                TS.spacing.md,
              ),
              child: CommonButton(
                label: '审核并提交',
                tone: CommonButtonTone.action,
                variant: CommonButtonVariant.flat,
                block: true,
                onPressed: _submit,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CaseSummary extends StatelessWidget {
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
          Icon(Icons.verified_user, color: TS.colors.error),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SH-2048 · 严重超温', style: TS.textStyle.subtitle),
                SizedBox(height: TS.spacing.xxs),
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
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.error.withValues(alpha: 0.35)),
      ),
      child: Text(
        message,
        style: TS.textStyle.content.copyWith(color: TS.colors.error),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
    this.description,
    this.requiredBadge = false,
  });

  final String title;
  final String? description;
  final bool requiredBadge;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: TS.colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TS.radius.lg),
        side: BorderSide(color: TS.colors.border),
      ),
      child: Padding(
        padding: EdgeInsets.all(TS.spacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(title, style: TS.textStyle.subtitle),
                if (requiredBadge) ...[
                  SizedBox(width: TS.spacing.sm),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: TS.spacing.sm,
                      vertical: TS.spacing.xxs,
                    ),
                    decoration: BoxDecoration(
                      color: TS.colors.errorSoft,
                      borderRadius: BorderRadius.circular(TS.radius.full),
                    ),
                    child: Text(
                      '必填',
                      style: TS.textStyle.captionStrong.copyWith(
                        color: TS.colors.error,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            if (description != null) ...[
              SizedBox(height: TS.spacing.xs),
              Text(description!, style: TS.textStyle.caption),
            ],
            SizedBox(height: TS.spacing.md),
            child,
          ],
        ),
      ),
    );
  }
}
