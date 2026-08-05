import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'models.dart';

class V6ResolutionFormPage extends StatefulWidget {
  const V6ResolutionFormPage({
    super.key,
    this.initialMode = V6ResolutionMode.defaultState,
  });

  final V6ResolutionMode initialMode;

  factory V6ResolutionFormPage.fromRouteArgs(Object? args) {
    return V6ResolutionFormPage(
      initialMode: V6ResolutionModeParsing.fromArgs(args),
    );
  }

  @override
  State<V6ResolutionFormPage> createState() => _V6ResolutionFormPageState();
}

class _V6ResolutionFormPageState extends State<V6ResolutionFormPage> {
  late V6ResolutionMode _mode;
  final TextEditingController _notesController = TextEditingController();

  String? _cause;
  String? _action;
  String? _outcome;
  String? _supervisor;
  bool _driverChecked = false;
  bool _coolingChecked = false;
  bool _cargoChecked = false;
  bool _monitoring = false;

  static const _causeOptions = [
    CommonSelectOption(value: 'unit', label: '制冷机组异常'),
    CommonSelectOption(value: 'vehicle', label: '车辆颠簸导致温控波动'),
    CommonSelectOption(value: 'probe', label: '探头故障'),
  ];

  static const _actionOptions = [
    CommonSelectOption(value: 'backup', label: '切换备用制冷'),
    CommonSelectOption(value: 'repair', label: '联系维修'),
    CommonSelectOption(value: 'observe', label: '继续观察'),
  ];

  static const _supervisorOptions = [
    CommonSelectOption(value: 'east-manager', label: '华东值班经理 · 林岚'),
  ];

  static const _outcomeOptions = [
    CommonSelectOption(value: 'falling', label: '温度开始回落'),
    CommonSelectOption(value: 'rising', label: '温度仍在上升'),
    CommonSelectOption(value: 'unknown', label: '暂时无法确认'),
  ];

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    _seedForMode();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.initialMode == V6ResolutionMode.confirmDialogOpen) {
        _showConfirmDialog();
      } else if (widget.initialMode == V6ResolutionMode.submitted) {
        AppPop.success('处置记录已提交，异常转为持续监控');
      }
    });
  }

  void _seedForMode() {
    final completed =
        _mode == V6ResolutionMode.approvalRequired ||
        _mode == V6ResolutionMode.approvalValidationError ||
        _mode == V6ResolutionMode.confirmDialogOpen ||
        _mode == V6ResolutionMode.readyToSubmit;

    if (completed) {
      _cause = 'unit';
      _action = 'backup';
      _outcome = 'falling';
      _driverChecked = true;
      _coolingChecked = true;
      _cargoChecked = true;
      _monitoring = true;
    }
    if (_mode == V6ResolutionMode.readyToSubmit ||
        _mode == V6ResolutionMode.confirmDialogOpen) {
      _supervisor = 'east-manager';
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  bool get _hasValidationError => _mode == V6ResolutionMode.validationError;

  bool get _hasApprovalError =>
      _mode == V6ResolutionMode.approvalValidationError;

  void _clearErrorState() {
    if (_hasValidationError || _hasApprovalError) {
      _mode = V6ResolutionMode.defaultState;
    }
  }

  void _submit() {
    if (_cause == null ||
        _action == null ||
        !_driverChecked ||
        !_coolingChecked ||
        !_cargoChecked) {
      setState(() => _mode = V6ResolutionMode.validationError);
      return;
    }
    if (_supervisor == null) {
      setState(() => _mode = V6ResolutionMode.approvalValidationError);
      return;
    }
    _showConfirmDialog();
  }

  Future<void> _showConfirmDialog() async {
    final confirmed = await AppPop.confirm(
      title: '确认提交处置记录?',
      content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
      confirmText: '确认提交',
      cancelText: '取消',
    );
    if (!mounted || !confirmed) return;

    setState(() {
      _mode = V6ResolutionMode.submitted;
      _cause = null;
      _action = null;
      _outcome = null;
      _supervisor = null;
      _driverChecked = false;
      _coolingChecked = false;
      _cargoChecked = false;
      _monitoring = false;
      _notesController.clear();
    });
    AppPop.success('处置记录已提交，异常转为持续监控');
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
      body: ListView(
        key: const ValueKey('v6-page-scroll'),
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          const _CaseSummary(),
          if (_hasValidationError)
            const _FormErrorBanner(message: '请补全异常原因、处置动作和三项现场确认。'),
          if (_hasApprovalError)
            const _FormErrorBanner(message: '超温已持续 47 分钟，必须指定值班主管后才能提交。'),
          SizedBox(height: TS.spacing.md),
          _FormSectionCard(
            title: '处置判断  必填',
            description: '根据司机反馈与设备状态记录本次异常原因。',
            children: [
              CommonSelect<String>(
                label: '异常原因',
                value: _cause,
                options: _causeOptions,
                errorText: _hasValidationError && _cause == null
                    ? '请选择异常原因'
                    : null,
                onChanged: (value) {
                  setState(() {
                    _cause = value;
                    _clearErrorState();
                  });
                },
              ),
              CommonSelect<String>(
                label: '处置动作',
                value: _action,
                options: _actionOptions,
                errorText: _hasValidationError && _action == null
                    ? '请选择处置动作'
                    : null,
                onChanged: (value) {
                  setState(() {
                    _action = value;
                    _clearErrorState();
                  });
                },
              ),
              CommonRadioGroup<String>(
                label: '当前结果',
                value: _outcome,
                options: _outcomeOptions,
                onChanged: (value) {
                  setState(() {
                    _outcome = value;
                    _clearErrorState();
                  });
                },
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          _FormSectionCard(
            title: '现场确认  必填',
            description: '以下检查项会进入交付记录。',
            children: [
              CommonCheckbox(
                label: '已联系司机并确认车辆安全',
                value: _driverChecked,
                onChanged: (value) {
                  setState(() {
                    _driverChecked = value ?? false;
                    _clearErrorState();
                  });
                },
              ),
              CommonCheckbox(
                label: '已检查主制冷与备用制冷状态',
                value: _coolingChecked,
                onChanged: (value) {
                  setState(() {
                    _coolingChecked = value ?? false;
                    _clearErrorState();
                  });
                },
              ),
              CommonCheckbox(
                label: '货箱未开封且无可见损伤',
                value: _cargoChecked,
                onChanged: (value) {
                  setState(() {
                    _cargoChecked = value ?? false;
                    _clearErrorState();
                  });
                },
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          _FormSectionCard(
            title: '后续安排',
            description: '提交后调度中心将按此安排继续跟踪。',
            children: [
              CommonSwitch(
                label: '保持每 2 分钟温度监控',
                value: _monitoring,
                onChanged: (value) => setState(() => _monitoring = value),
              ),
              CommonTextArea(
                controller: _notesController,
                label: '处置说明',
                hint: '请输入处置说明',
                minLines: 3,
                maxLines: 5,
                onChanged: (_) {},
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          _FormSectionCard(
            title: '主管审批  必填',
            description: '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
            children: [
              CommonSelect<String>(
                label: '值班主管',
                hint: '请选择值班主管',
                value: _supervisor,
                options: _supervisorOptions,
                onChanged: (value) {
                  setState(() {
                    _supervisor = value;
                    _clearErrorState();
                  });
                },
              ),
              Text('当前异常持续 47 分钟，已触发主管审批阈值。', style: TS.textStyle.caption),
              Text('提交后会保留当前传感器读数与操作时间。', style: TS.textStyle.caption),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          CommonButton(
            label: '审核并提交',
            block: true,
            tone: CommonButtonTone.action,
            onPressed: _submit,
          ),
          SizedBox(height: TS.spacing.md),
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
          Icon(
            Icons.verified_user_outlined,
            color: TS.colors.error,
            size: TS.sizing.iconLg,
          ),
          SizedBox(width: TS.spacing.md),
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

class _FormErrorBanner extends StatelessWidget {
  const _FormErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: TS.spacing.md),
      child: Container(
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
      ),
    );
  }
}

class _FormSectionCard extends StatelessWidget {
  const _FormSectionCard({
    required this.title,
    required this.description,
    required this.children,
  });

  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.border),
      ),
      child: Material(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        child: CommonFormSection(
          title: title,
          description: description,
          children: children,
        ),
      ),
    );
  }
}
