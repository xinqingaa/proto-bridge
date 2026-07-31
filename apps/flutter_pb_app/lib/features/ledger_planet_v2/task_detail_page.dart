import 'package:flutter/material.dart';

import '../../common/widgets/app_bar.dart';
import '../../common/widgets/button.dart';
import '../../common/widgets/progress.dart';
import '../../theme/ts.dart';

class TaskDetailV2Page extends StatelessWidget {
  const TaskDetailV2Page({super.key});

  factory TaskDetailV2Page.fromRouteArgs(Object? arguments) {
    return const TaskDetailV2Page();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '任务详情',
        showBack: true,
        elevated: false,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(TS.spacing.md),
        child: Column(
          children: [
            const _TaskHero(),
            const SizedBox(height: 18),
            const _ProgressSection(),
            const SizedBox(height: 18),
            const _StepsSection(),
            const SizedBox(height: 18),
            const CommonButton(
              label: '领取奖励',
              variant: CommonButtonVariant.flat,
              tone: CommonButtonTone.action,
              size: CommonControlSize.md,
              block: true,
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskHero extends StatelessWidget {
  const _TaskHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 113,
      padding: EdgeInsets.symmetric(horizontal: TS.spacing.lg),
      decoration: BoxDecoration(
        color: TS.colors.primarySoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.primary.withAlpha(90)),
        boxShadow: [
          BoxShadow(
            color: TS.colors.onSurface.withAlpha(18),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: TS.colors.primary,
              borderRadius: BorderRadius.circular(TS.radius.lg),
            ),
            child: Icon(Icons.gps_fixed, size: 32, color: TS.colors.onPrimary),
          ),
          SizedBox(width: TS.spacing.md),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '每日任务',
                  style: TS.textStyle.content.copyWith(
                    color: TS.colors.primary,
                  ),
                ),
                Text(
                  '查看本周图表',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TS.textStyle.title,
                ),
                Text(
                  '打开图表分析页',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TS.textStyle.content.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: TS.spacing.sm),
          Container(
            width: 56,
            height: 26,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: TS.colors.successSoft,
              borderRadius: BorderRadius.circular(TS.radius.sm),
            ),
            child: Text(
              '已达成',
              style: TS.textStyle.caption.copyWith(color: TS.colors.success),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressSection extends StatelessWidget {
  const _ProgressSection();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 125,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('完成进度', style: TS.textStyle.titleSm),
              Text(
                '1/1',
                style: TS.textStyle.titleSm.copyWith(color: TS.colors.primary),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.smPlus),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 2),
            child: CommonProgress(value: 1),
          ),
          SizedBox(height: TS.spacing.smPlus),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: TS.colors.primarySoft,
                border: Border(left: BorderSide(color: TS.colors.primary)),
              ),
              padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
              child: Row(
                children: [
                  Icon(
                    Icons.attach_money,
                    size: TS.sizing.iconLg,
                    color: TS.colors.primary,
                  ),
                  SizedBox(width: TS.spacing.smPlus),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text('奖励 ', style: TS.textStyle.subtitle),
                          Text('¥3 体验券', style: TS.textStyle.subtitle),
                        ],
                      ),
                      Text('完成后自动进入券包', style: TS.textStyle.caption),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepsSection extends StatelessWidget {
  const _StepsSection();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 122,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('完成方式', style: TS.textStyle.titleSm),
          SizedBox(height: TS.spacing.sm),
          const _StepRow(
            icon: Icons.check,
            title: '新增一笔有效流水',
            subtitle: '支出或收入均可，金额需大于 0',
          ),
          const SizedBox(height: 6),
          const _StepRow(
            icon: Icons.local_fire_department_outlined,
            title: '保持连续记录',
            subtitle: '连续完成可解锁成长任务',
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 38,
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: TS.colors.primary),
            ),
            child: Icon(icon, size: TS.sizing.iconMd, color: TS.colors.primary),
          ),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TS.textStyle.content),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
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
