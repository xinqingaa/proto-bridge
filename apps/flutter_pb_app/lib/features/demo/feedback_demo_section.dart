import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class FeedbackDemoSection extends StatelessWidget {
  const FeedbackDemoSection({super.key});

  @override
  Widget build(BuildContext context) {
    return DemoCategoryPage(
      title: 'Feedback / 反馈',
      description: '所有弹层统一通过 AppPop 调用 unified_popups。',
      children: [
        DemoGroup(
          title: 'AppPop',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CommonButton(
                label: 'Toast',
                block: true,
                onPressed: () => AppPop.toast('操作成功'),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: 'Confirm',
                block: true,
                variant: CommonButtonVariant.tonal,
                tone: CommonButtonTone.primary,
                onPressed: () async {
                  final ok = await AppPop.confirm(
                    title: '确认删除',
                    content: '删除后无法恢复',
                  );
                  AppPop.toast(ok ? '已确认' : '已取消');
                },
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: 'BottomSheet',
                block: true,
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.primary,
                onPressed: () {
                  AppPop.sheet<void>(
                    title: '底部面板',
                    builder: (context, handle) => Padding(
                      padding: EdgeInsets.all(TS.spacing.md),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('BottomSheet 内容', style: TS.textStyle.content),
                          SizedBox(height: TS.spacing.md),
                          CommonButton(
                            label: '关闭',
                            block: true,
                            onPressed: handle.dismiss,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: 'Loading',
                block: true,
                variant: CommonButtonVariant.tonal,
                tone: CommonButtonTone.secondary,
                onPressed: () async {
                  await AppPop.runLoading(
                    message: '提交中',
                    task: Future<void>.delayed(
                      const Duration(milliseconds: 1200),
                    ),
                  );
                  AppPop.toast('已完成');
                },
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: 'FlowSheet',
                block: true,
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.secondary,
                onPressed: () async {
                  final controller = FlowSheetController<String>();
                  final result = await AppPop.flowSheet<String>(
                    controller: controller,
                    title: '分步面板',
                    initialPage: _DemoFlowStepOne(controller: controller),
                  );
                  if (result != null) AppPop.toast('完成：$result');
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DemoFlowStepOne extends FlowSheetPage<void> {
  const _DemoFlowStepOne({required this.controller})
    : super(id: 'demo_flow_step_1');

  final FlowSheetController<String> controller;

  @override
  State<_DemoFlowStepOne> createState() => _DemoFlowStepOneState();
}

class _DemoFlowStepOneState extends FlowSheetPageState<_DemoFlowStepOne, void> {
  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('第一步', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.sm),
          Text('FlowSheet 多步面板', style: TS.textStyle.content),
          const Spacer(),
          CommonButton(
            label: '下一步',
            block: true,
            onPressed: () {
              nav.push<void>(_DemoFlowStepTwo(controller: widget.controller));
            },
          ),
        ],
      ),
    );
  }
}

class _DemoFlowStepTwo extends FlowSheetPage<void> {
  const _DemoFlowStepTwo({required this.controller})
    : super(id: 'demo_flow_step_2', maintainState: true);

  final FlowSheetController<String> controller;

  @override
  State<_DemoFlowStepTwo> createState() => _DemoFlowStepTwoState();
}

class _DemoFlowStepTwoState extends FlowSheetPageState<_DemoFlowStepTwo, void> {
  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('第二步', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.sm),
          Text('可返回上一步或完成流程', style: TS.textStyle.content),
          const Spacer(),
          CommonButton(
            label: '返回',
            block: true,
            variant: CommonButtonVariant.outlined,
            tone: CommonButtonTone.primary,
            onPressed: nav.pop,
          ),
          SizedBox(height: TS.spacing.sm),
          CommonButton(
            label: '完成',
            block: true,
            onPressed: () => widget.controller.closeAll('已确认'),
          ),
        ],
      ),
    );
  }
}
