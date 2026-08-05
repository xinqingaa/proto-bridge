import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.resolution-form`
class ResolutionFormPage extends StatefulWidget {
  const ResolutionFormPage({
    super.key,
    this.shipmentId = 'SH-2048',
    this.variant = 'default',
  });

  final String shipmentId;
  final String variant;

  static ResolutionFormPage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return ResolutionFormPage(
      shipmentId: map['shipmentId']?.toString() ?? 'SH-2048',
      variant: map['variant']?.toString() ?? 'default',
    );
  }

  @override
  State<ResolutionFormPage> createState() => _ResolutionFormPageState();
}

class _ResolutionFormPageState extends State<ResolutionFormPage> {
  late String _variant;
  String? _cause;
  String? _action;
  String? _outcome;
  final Set<String> _checks = {};
  bool _continueMonitoring = true;
  String? _supervisor;
  String? _causeError;
  String? _actionError;
  String? _bannerError;
  bool _submittedToast = false;
  bool _overlayScheduled = false;
  final _notes = TextEditingController();

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
    _applyVariant(_variant);
  }

  @override
  void didUpdateWidget(covariant ResolutionFormPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.variant != widget.variant) {
      setState(() {
        _variant = widget.variant;
        _applyVariant(_variant);
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_overlayScheduled) return;
    _overlayScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_variant == 'confirm-dialog-open') {
        _confirmSubmit(auto: true);
      } else if (_variant == 'submitted') {
        _showSubmittedToast();
      }
    });
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  void _applyVariant(String variant) {
    _cause = null;
    _action = null;
    _outcome = '温度开始回落';
    _checks.clear();
    _supervisor = null;
    _causeError = null;
    _actionError = null;
    _bannerError = null;
    _continueMonitoring = true;
    _submittedToast = false;

    final filled = variant == 'ready-to-submit' ||
        variant == 'approval-required' ||
        variant == 'approval-validation-error' ||
        variant == 'confirm-dialog-open' ||
        variant == 'submitted';

    if (filled) {
      _cause = '制冷机组异常';
      _action = '切换备用制冷';
      _outcome = '温度开始回落';
      _checks.addAll(kChecklistLabels);
    }

    if (variant == 'ready-to-submit' ||
        variant == 'confirm-dialog-open' ||
        variant == 'submitted') {
      _supervisor = '华东值班经理 · 林岚';
    }

    if (variant == 'validation-error') {
      _bannerError = '请补全异常原因、处置动作和三项现场确认。';
      _causeError = '请选择异常原因';
      _actionError = '请选择处置动作';
      _outcome = null;
      _checks.clear();
    }

    if (variant == 'approval-validation-error') {
      _bannerError = '超温已持续 47 分钟，必须指定值班主管后才能提交。';
      _supervisor = null;
    }
  }

  bool get _requiresSupervisor => true;

  String? _validate() {
    if (_cause == null || _action == null || _checks.length < 3) {
      return '请补全异常原因、处置动作和三项现场确认。';
    }
    if (_requiresSupervisor && (_supervisor == null || _supervisor!.isEmpty)) {
      return '超温已持续 47 分钟，必须指定值班主管后才能提交。';
    }
    return null;
  }

  Future<void> _onSubmit() async {
    final error = _validate();
    if (error != null) {
      setState(() {
        _bannerError = error;
        _causeError = _cause == null ? '请选择异常原因' : null;
        _actionError = _action == null ? '请选择处置动作' : null;
        _variant = _cause != null && _action != null && _checks.length == 3
            ? 'approval-validation-error'
            : 'validation-error';
      });
      return;
    }
    await _confirmSubmit();
  }

  Future<void> _confirmSubmit({bool auto = false}) async {
    final ok = await AppPop.confirm(
      title: '确认提交处置记录？',
      content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
      confirmText: '确认提交',
      cancelText: '取消',
    );
    if (!mounted) return;
    if (!ok) {
      if (auto) setState(() => _variant = 'ready-to-submit');
      return;
    }
    setState(() {
      _variant = 'submitted';
      _bannerError = null;
    });
    _showSubmittedToast();
  }

  void _showSubmittedToast() {
    if (_submittedToast) return;
    _submittedToast = true;
    AppPop.toast(
      '处置记录已提交，异常转为持续监控',
      type: ToastType.success,
    );
  }

  Widget _sectionTitle(String title, {bool required = false}) {
    return Row(
      children: [
        Text(title, style: TS.textStyle.subtitle),
        if (required) ...[
          SizedBox(width: TS.spacing.xs),
          const CommonBadge(
            label: '必填',
            semanticTone: CommonBadgeTone.error,
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '提交处置', showBack: true),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          _CaseSummary(shipmentId: widget.shipmentId),
          if (_bannerError != null) ...[
            SizedBox(height: TS.spacing.smPlus),
            _ValidationBanner(message: _bannerError!),
          ],
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle('处置判断', required: true),
                SizedBox(height: TS.spacing.xs),
                Text(
                  '根据司机反馈与设备状态记录本次异常原因。',
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
                SizedBox(height: TS.spacing.md),
                CommonSelect<String>(
                  label: '异常原因',
                  value: _cause,
                  errorText: _causeError,
                  options: [
                    for (final o in kCauseOptions)
                      CommonSelectOption(value: o, label: o),
                  ],
                  onChanged: (value) => setState(() {
                    _cause = value;
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
                      CommonSelectOption(value: o, label: o),
                  ],
                  onChanged: (value) => setState(() {
                    _action = value;
                    _actionError = null;
                  }),
                ),
                SizedBox(height: TS.spacing.md),
                CommonRadioGroup<String>(
                  label: '当前结果',
                  value: _outcome,
                  options: [
                    for (final o in kOutcomeOptions)
                      CommonSelectOption(value: o, label: o),
                  ],
                  onChanged: (value) => setState(() => _outcome = value),
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle('现场确认', required: true),
                SizedBox(height: TS.spacing.xs),
                Text(
                  '以下检查项会进入交付记录。',
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
                SizedBox(height: TS.spacing.sm),
                for (final label in kChecklistLabels)
                  CommonCheckbox(
                    value: _checks.contains(label),
                    label: label,
                    onChanged: (checked) => setState(() {
                      if (checked == true) {
                        _checks.add(label);
                      } else {
                        _checks.remove(label);
                      }
                    }),
                  ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle('后续安排'),
                SizedBox(height: TS.spacing.xs),
                Text(
                  '提交后调度中心将按此安排继续跟踪。',
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
                SizedBox(height: TS.spacing.sm),
                CommonSwitch(
                  value: _continueMonitoring,
                  label: '保持每 2 分钟温度监控',
                  onChanged: (value) =>
                      setState(() => _continueMonitoring = value),
                ),
                SizedBox(height: TS.spacing.sm),
                CommonTextArea(
                  controller: _notes,
                  label: '处置说明',
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionTitle('主管审批', required: true),
                SizedBox(height: TS.spacing.xs),
                Text(
                  '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
                SizedBox(height: TS.spacing.md),
                CommonSelect<String>(
                  label: '值班主管',
                  value: _supervisor,
                  options: [
                    for (final o in kSupervisorOptions)
                      CommonSelectOption(value: o, label: o),
                  ],
                  onChanged: (value) => setState(() => _supervisor = value),
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
          ),
          SizedBox(height: TS.spacing.md),
          Text(
            '提交后会保留当前传感器读数与操作时间。',
            style: TS.textStyle.caption.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
          SizedBox(height: TS.spacing.sm),
          CommonButton(
            label: '审核并提交',
            block: true,
            onPressed: _onSubmit,
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
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.error.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.verified_user, color: TS.colors.error),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$shipmentId · 严重超温',
                  style: TS.textStyle.subtitle,
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  '当前 10.8°C · 上限 8°C · 已持续 47 分钟',
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
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.error_outline, color: TS.colors.error),
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
