import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'cold_chain_fixtures.dart';
import 'cold_chain_models.dart';
import 'cold_chain_providers.dart';

class ResolutionFormPage extends ConsumerStatefulWidget {
  const ResolutionFormPage({super.key, required this.args});

  final ResolutionFormArgs args;

  @override
  ConsumerState<ResolutionFormPage> createState() => _ResolutionFormPageState();
}

class _ResolutionFormPageState extends ConsumerState<ResolutionFormPage> {
  late final TextEditingController _notes;
  var _overlayScheduled = false;

  @override
  void initState() {
    super.initState();
    _notes = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final state = ref.read(resolutionFormProvider(widget.args));
      _notes.text = state.notes;
      if (_overlayScheduled) return;
      _overlayScheduled = true;
      _presentInitialOverlay(state);
    });
  }

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _presentInitialOverlay(ResolutionFormState state) async {
    if (widget.args.variantId == 'confirm-dialog-open') {
      await _confirmSubmit();
    } else if (widget.args.variantId == 'submitted') {
      AppPop.toast('处置记录已提交，异常转为持续监控');
    }
  }

  Future<void> _onSubmit() async {
    final next = ref
        .read(resolutionFormProvider(widget.args).notifier)
        .submit();
    if (next == 'confirm-dialog-open') {
      await _confirmSubmit();
    }
  }

  Future<void> _confirmSubmit() async {
    final confirmed = await AppPop.confirm(
      title: '确认提交处置记录？',
      content: '提交后异常将转为持续监控，当前记录不可直接覆盖。',
      confirmText: '确认提交',
    );
    if (!mounted || !confirmed) return;
    ref.read(resolutionFormProvider(widget.args).notifier).markSubmitted();
    AppPop.toast('处置记录已提交，异常转为持续监控');
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final state = ref.watch(resolutionFormProvider(widget.args));
    final notifier = ref.read(resolutionFormProvider(widget.args).notifier);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: '提交处置',
        showBack: true,
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(TS.spacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: EdgeInsets.all(TS.spacing.md),
              decoration: BoxDecoration(
                color: TS.colors.errorSoft,
                borderRadius: BorderRadius.circular(TS.radius.lg),
              ),
              child: Row(
                children: [
                  const CommonIcon(
                    name: CommonIconName.shieldCheck,
                    size: CommonIconSize.lg,
                    tone: CommonIconTone.error,
                  ),
                  SizedBox(width: TS.spacing.smPlus),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${state.args.shipmentId} · 严重超温',
                          style: TS.textStyle.subtitle,
                        ),
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
            ),
            if (state.validationMessage.isNotEmpty) ...[
              SizedBox(height: TS.spacing.smPlus),
              Container(
                padding: EdgeInsets.all(TS.spacing.smPlus),
                decoration: BoxDecoration(
                  color: TS.colors.errorSoft,
                  borderRadius: BorderRadius.circular(TS.radius.md),
                ),
                child: Row(
                  children: [
                    const CommonIcon(
                      name: CommonIconName.alertCircle,
                      size: CommonIconSize.md,
                      tone: CommonIconTone.error,
                    ),
                    SizedBox(width: TS.spacing.sm),
                    Expanded(
                      child: Text(
                        state.validationMessage,
                        style: TS.textStyle.content.copyWith(
                          color: TS.colors.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            SizedBox(height: TS.spacing.smPlus),
            CommonCard(
              child: CommonFormSection(
                title: '处置判断',
                description: '根据司机反馈与设备状态记录本次异常原因。',
                showRequiredMark: true,
                children: [
                  CommonMenuField<String>(
                    label: '异常原因',
                    hint: '选择已确认的原因',
                    value: state.cause.isEmpty ? null : state.cause,
                    options: [
                      for (final item in resolutionCauses)
                        CommonChoiceOption(value: item, label: item),
                    ],
                    errorText:
                        state.validationMessage.isNotEmpty &&
                            state.cause.isEmpty
                        ? '请选择异常原因'
                        : null,
                    onChanged: notifier.setCause,
                  ),
                  SizedBox(height: TS.spacing.smPlus),
                  CommonMenuField<String>(
                    label: '处置动作',
                    hint: '选择已执行的动作',
                    value: state.action.isEmpty ? null : state.action,
                    options: [
                      for (final item in resolutionActions)
                        CommonChoiceOption(value: item, label: item),
                    ],
                    errorText:
                        state.validationMessage.isNotEmpty &&
                            state.action.isEmpty
                        ? '请选择处置动作'
                        : null,
                    onChanged: notifier.setAction,
                  ),
                  SizedBox(height: TS.spacing.smPlus),
                  CommonRadioGroup<String>(
                    label: '当前结果',
                    value: state.outcome.isEmpty ? null : state.outcome,
                    options: [
                      for (final item in outcomeOptions)
                        CommonChoiceOption(value: item, label: item),
                    ],
                    onChanged: notifier.setOutcome,
                  ),
                ],
              ),
            ),
            SizedBox(height: TS.spacing.smPlus),
            CommonCard(
              child: CommonFormSection(
                title: '现场确认',
                description: '以下检查项会进入交付记录。',
                showRequiredMark: true,
                children: [
                  CommonCheckbox(
                    label: '已联系司机并确认车辆安全',
                    value: state.checkedDriver,
                    onChanged: notifier.setDriver,
                  ),
                  CommonCheckbox(
                    label: '已检查主制冷与备用制冷状态',
                    value: state.checkedCooling,
                    onChanged: notifier.setCooling,
                  ),
                  CommonCheckbox(
                    label: '货箱未开封且无可见损伤',
                    value: state.checkedCargo,
                    onChanged: notifier.setCargo,
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
                    value: state.continueMonitoring,
                    onChanged: notifier.setMonitoring,
                  ),
                  SizedBox(height: TS.spacing.sm),
                  CommonTextArea(
                    controller: _notes,
                    label: '处置说明',
                    showLabel: true,
                    onChanged: notifier.setNotes,
                  ),
                ],
              ),
            ),
            SizedBox(height: TS.spacing.smPlus),
            CommonCard(
              child: CommonFormSection(
                title: '主管审批',
                description: '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
                showRequiredMark: true,
                children: [
                  CommonMenuField<String>(
                    label: '值班主管',
                    hint: '选择本次处置的复核人',
                    value: state.supervisor.isEmpty ? null : state.supervisor,
                    options: [
                      for (final item in dutySupervisors)
                        CommonChoiceOption(value: item, label: item),
                    ],
                    errorText:
                        widget.args.variantId == 'approval-validation-error' &&
                            state.supervisor.isEmpty
                        ? '请选择值班主管'
                        : null,
                    onChanged: notifier.setSupervisor,
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
            Row(
              children: [
                const CommonIcon(name: CommonIconName.clipboardCheck),
                SizedBox(width: TS.spacing.sm),
                Expanded(
                  child: Text(
                    '提交后会保留当前传感器读数与操作时间。',
                    style: TS.textStyle.caption,
                  ),
                ),
              ],
            ),
            SizedBox(height: TS.spacing.md),
            CommonButton(
              key: ColdChainKeys.submitResolution,
              label: '审核并提交',
              block: true,
              onPressed: _onSubmit,
            ),
            SizedBox(height: TS.spacing.xl),
          ],
        ),
      ),
    );
  }
}
