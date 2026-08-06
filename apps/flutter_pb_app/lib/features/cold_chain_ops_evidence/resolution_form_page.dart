import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.resolution-form`
class ResolutionFormEvidencePage extends StatefulWidget {
  const ResolutionFormEvidencePage({
    super.key,
    this.exceptionId = 'ex-017',
    this.shipmentId = 'SH-2048',
    this.variant = 'default',
  });

  final String exceptionId;
  final String shipmentId;
  final String variant;

  static ResolutionFormEvidencePage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return ResolutionFormEvidencePage(
      exceptionId: map['exceptionId']?.toString() ?? 'ex-017',
      shipmentId: map['shipmentId']?.toString() ?? 'SH-2048',
      variant: map['variant']?.toString() ?? 'default',
    );
  }

  @override
  State<ResolutionFormEvidencePage> createState() =>
      _ResolutionFormEvidencePageState();
}

class _ResolutionFormEvidencePageState extends State<ResolutionFormEvidencePage> {
  late String _variant;
  String? _cause;
  String? _action;
  String? _outcome;
  String? _supervisor;
  bool _checkDriver = false;
  bool _checkCooling = false;
  bool _checkCargo = false;
  bool _continueMonitoring = true;
  String? _validationMessage;
  String? _causeError;
  String? _actionError;
  String? _supervisorError;
  final _notes = TextEditingController();

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
    _applyVariant(widget.variant);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_variant == 'confirm-dialog-open') {
        _confirmSubmit(showFromVariant: true);
      } else if (_variant == 'submitted') {
        AppPop.success('处置记录已提交，异常转为持续监控');
      }
    });
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  void _applyVariant(String variant) {
    final filled = variant == 'ready-to-submit' ||
        variant == 'approval-required' ||
        variant == 'approval-validation-error' ||
        variant == 'confirm-dialog-open' ||
        variant == 'submitted';
    if (filled) {
      _cause = 'cooling-unit-fault';
      _action = 'switch-backup-cooling';
      _outcome = 'cooling-down';
      _checkDriver = true;
      _checkCooling = true;
      _checkCargo = true;
      _continueMonitoring = true;
    }
    if (variant == 'ready-to-submit' ||
        variant == 'confirm-dialog-open' ||
        variant == 'submitted') {
      _supervisor = 'lin-lan';
    }
    if (variant == 'validation-error') {
      _validationMessage = '请补全异常原因、处置动作和三项现场确认。';
      _causeError = '请选择异常原因';
      _actionError = '请选择处置动作';
    }
    if (variant == 'approval-validation-error') {
      _validationMessage = '超温已持续 47 分钟，必须指定值班主管后才能提交。';
      _supervisorError = '请选择值班主管';
      _supervisor = null;
    }
  }

  bool get _checksComplete => _checkDriver && _checkCooling && _checkCargo;

  void _submit() {
    setState(() {
      _causeError = null;
      _actionError = null;
      _supervisorError = null;
      _validationMessage = null;
    });

    final missingBasics =
        _cause == null || _action == null || !_checksComplete;
    if (missingBasics) {
      setState(() {
        _variant = 'validation-error';
        _validationMessage = '请补全异常原因、处置动作和三项现场确认。';
        if (_cause == null) _causeError = '请选择异常原因';
        if (_action == null) _actionError = '请选择处置动作';
      });
      return;
    }

    if (_supervisor == null) {
      setState(() {
        _variant = 'approval-validation-error';
        _validationMessage = '超温已持续 47 分钟，必须指定值班主管后才能提交。';
        _supervisorError = '请选择值班主管';
      });
      return;
    }

    _confirmSubmit();
  }

  Future<void> _confirmSubmit({bool showFromVariant = false}) async {
    if (!showFromVariant) {
      setState(() => _variant = 'confirm-dialog-open');
    }
    final ok = await AppPop.confirm(
      title: '确认提交处置记录？',
      content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
      confirmText: '确认提交',
      cancelText: '取消',
    );
    if (!mounted) return;
    if (ok) {
      setState(() => _variant = 'submitted');
      AppPop.success('处置记录已提交，异常转为持续监控');
    } else {
      setState(() => _variant = 'ready-to-submit');
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final summary = kResolutionSummary;

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '提交处置', showBack: true),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          _CaseSummary(summary: summary),
          if (_validationMessage != null) ...[
            SizedBox(height: TS.spacing.sm),
            _ValidationBanner(message: _validationMessage!),
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
                  value: _cause,
                  errorText: _causeError,
                  options: [
                    for (final o in kCauseOptions)
                      CommonSelectOption(value: o.value, label: o.label),
                  ],
                  onChanged: (v) => setState(() {
                    _cause = v;
                    _causeError = null;
                  }),
                ),
                SizedBox(height: TS.spacing.md),
                CommonSelect<String>(
                  label: '处置动作',
                  value: _action,
                  errorText: _actionError,
                  options: [
                    for (final o in kActionOptions)
                      CommonSelectOption(value: o.value, label: o.label),
                  ],
                  onChanged: (v) => setState(() {
                    _action = v;
                    _actionError = null;
                  }),
                ),
                SizedBox(height: TS.spacing.md),
                CommonRadioGroup<String>(
                  label: '当前结果',
                  value: _outcome,
                  options: [
                    for (final o in kOutcomeOptions)
                      CommonSelectOption(value: o.value, label: o.label),
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
                  value: _checkDriver,
                  label: '已联系司机并确认车辆安全',
                  onChanged: (v) => setState(() => _checkDriver = v ?? false),
                ),
                CommonCheckbox(
                  value: _checkCooling,
                  label: '已检查主制冷与备用制冷状态',
                  onChanged: (v) => setState(() => _checkCooling = v ?? false),
                ),
                CommonCheckbox(
                  value: _checkCargo,
                  label: '货箱未开封且无可见损伤',
                  onChanged: (v) => setState(() => _checkCargo = v ?? false),
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
                  value: _continueMonitoring,
                  label: '保持每 2 分钟温度监控',
                  onChanged: (v) => setState(() => _continueMonitoring = v),
                ),
                SizedBox(height: TS.spacing.sm),
                CommonTextArea(
                  controller: _notes,
                  label: '处置说明',
                  hint: '补充现场情况（可选）',
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.md),
          _SectionCard(
            title: '主管审批',
            description: '当前异常持续 47 分钟，已触发主管审批阈值。',
            child: CommonSelect<String>(
              label: '值班主管',
              value: _supervisor,
              errorText: _supervisorError,
              options: [
                for (final o in kSupervisorOptions)
                  CommonSelectOption(value: o.value, label: o.label),
              ],
              onChanged: (v) => setState(() {
                _supervisor = v;
                _supervisorError = null;
              }),
            ),
          ),
          SizedBox(height: TS.spacing.lg),
          CommonButton(
            label: '审核并提交',
            variant: CommonButtonVariant.flat,
            tone: CommonButtonTone.action,
            size: CommonControlSize.md,
            block: true,
            onPressed: _submit,
          ),
          SizedBox(height: TS.spacing.xl),
        ],
      ),
    );
  }
}

class _CaseSummary extends StatelessWidget {
  const _CaseSummary({required this.summary});

  final ResolutionCaseSummary summary;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          Icon(Icons.verified_user_outlined, color: TS.colors.error),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(summary.title, style: TS.textStyle.subtitle),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  summary.detail,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
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
    TS.of(context);
    return Container(
      padding: EdgeInsets.all(TS.spacing.smPlus),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.md),
        border: Border.all(color: TS.colors.error.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, color: TS.colors.error, size: TS.sizing.iconMd),
          SizedBox(width: TS.spacing.sm),
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
    TS.of(context);
    final desc = [
      if (requiredBadge) '必填',
      ?description,
    ].join(' · ');
    return Material(
      color: TS.colors.surface,
      borderRadius: BorderRadius.circular(TS.radius.lg),
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(TS.spacing.md),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(TS.radius.lg),
          border: Border.all(color: TS.colors.border),
        ),
        child: CommonFormSection(
          title: title,
          description: desc.isEmpty ? null : desc,
          children: [child],
        ),
      ),
    );
  }
}
