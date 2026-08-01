import 'package:flutter/material.dart';

import '../../common/widgets/app_bar.dart';
import '../../common/widgets/button.dart';
import '../../common/widgets/chip.dart';
import '../../common/widgets/progress.dart';
import '../../theme/ts.dart';

/// Ledger Planet V2 任务详情（claimable Checkpoint）。
///
/// 固定 Evidence：
/// - Case `ledger-planet.task-detail::claimable::...@claimable-task-detail`
/// - revision `revision-2026-08-01t064215479-b283232e`
class TaskDetailV2Page extends StatelessWidget {
  const TaskDetailV2Page({super.key});

  factory TaskDetailV2Page.fromRouteArgs(Object? _) => const TaskDetailV2Page();

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '任务详情',
        showBack: true,
        elevated: false,
      ),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          const _HeroCard(),
          SizedBox(height: TS.spacing.md),
          const _ProgressSection(),
          SizedBox(height: TS.spacing.md),
          const _StepsSection(),
          SizedBox(height: TS.spacing.lg),
          CommonButton(
            label: '领取奖励',
            tone: CommonButtonTone.action,
            variant: CommonButtonVariant.flat,
            size: CommonControlSize.md,
            block: true,
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: TS.colors.primary,
              borderRadius: BorderRadius.circular(TS.radius.md),
            ),
            alignment: Alignment.center,
            child: Icon(Icons.radar, color: TS.colors.onPrimary, size: 28),
          ),
          SizedBox(width: TS.spacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '每日任务',
                  style: TS.textStyle.caption.copyWith(color: TS.colors.primary),
                ),
                Text('查看本周图表', style: TS.textStyle.title),
                Text(
                  '打开图表分析页',
                  style: TS.textStyle.content.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: TS.spacing.sm),
          const CommonChip(
            label: '已达成',
            tone: CommonChipTone.success,
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text('完成进度', style: TS.textStyle.subtitle),
            const Spacer(),
            Text(
              '1/1',
              style: TS.textStyle.subtitle.copyWith(color: TS.colors.primary),
            ),
          ],
        ),
        SizedBox(height: TS.spacing.sm),
        const CommonProgress(value: 1),
        SizedBox(height: TS.spacing.md),
        Container(
          padding: EdgeInsets.all(TS.spacing.md),
          decoration: BoxDecoration(
            color: TS.colors.primarySoft,
            borderRadius: BorderRadius.circular(TS.radius.md),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 3,
                  decoration: BoxDecoration(
                    color: TS.colors.primary,
                    borderRadius: BorderRadius.circular(TS.radius.full),
                  ),
                ),
                SizedBox(width: TS.spacing.smPlus),
                Icon(Icons.monetization_on_outlined, color: TS.colors.primary),
                SizedBox(width: TS.spacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('奖励 ¥3 体验券', style: TS.textStyle.subtitle),
                      Text(
                        '完成后自动进入券包',
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
        ),
      ],
    );
  }
}

class _StepsSection extends StatelessWidget {
  const _StepsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('完成方式', style: TS.textStyle.subtitle),
        SizedBox(height: TS.spacing.md),
        const _StepRow(
          icon: Icons.check_circle,
          title: '新增一笔有效流水',
          description: '支出或收入均可，金额需大于 0',
        ),
        SizedBox(height: TS.spacing.md),
        const _StepRow(
          icon: Icons.local_fire_department,
          title: '保持连续记录',
          description: '连续完成可解锁成长任务',
        ),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: TS.colors.primary, size: 22),
        SizedBox(width: TS.spacing.smPlus),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TS.textStyle.content),
              Text(
                description,
                style: TS.textStyle.caption.copyWith(
                  color: TS.colors.onSurfaceMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
