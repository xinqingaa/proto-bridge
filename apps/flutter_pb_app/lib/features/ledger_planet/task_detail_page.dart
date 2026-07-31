import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'task_models.dart';

/// Task detail — Evidence: `ledger-planet.task-detail` (claimable).
class TaskDetailPage extends StatefulWidget {
  const TaskDetailPage({
    super.key,
    this.taskId = 't2',
    this.variant = 'claimable',
  });

  final String taskId;
  final String variant;

  static TaskDetailPage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return TaskDetailPage(
      taskId: map['taskId']?.toString() ?? 't2',
      variant: map['variant']?.toString() ?? 'claimable',
    );
  }

  @override
  State<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends State<TaskDetailPage> {
  bool _claimed = false;

  BenefitTask get _task => taskById(widget.taskId);

  bool get _completed =>
      widget.variant == 'completed' || widget.variant == 'claimable';

  bool get _claimable => widget.variant == 'claimable';

  void _claim() {
    setState(() => _claimed = true);
    AppPop.success('奖励已放入券包');
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final progressValue = _completed
        ? 1.0
        : (_task.target == 0 ? 0.0 : _task.progress / _task.target);
    final progressLabel =
        '${_completed ? _task.target : _task.progress}/${_task.target}';

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '任务详情', showBack: true),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          _HeroSection(task: _task, completed: _completed),
          SizedBox(height: 18),
          _ProgressSection(
            progressValue: progressValue,
            progressLabel: progressLabel,
          ),
          SizedBox(height: 18),
          _StepsSection(completed: _completed),
          SizedBox(height: 18),
          if (!_completed)
            CommonButton(
              label: '去完成',
              block: true,
              onPressed: () => AppPop.toast('去完成（证据范围外）'),
            )
          else if (_claimable)
            CommonButton(
              label: _claimed ? '已领取' : '领取奖励',
              block: true,
              disabled: _claimed,
              onPressed: _claimed ? null : _claim,
            )
          else
            const CommonButton(
              label: '已完成',
              block: true,
              variant: CommonButtonVariant.outlined,
              disabled: true,
            ),
        ],
      ),
    );
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({required this.task, required this.completed});

  final BenefitTask task;
  final bool completed;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Color.lerp(TS.colors.primary, TS.colors.surface, 0.92),
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(
          color: Color.lerp(TS.colors.primary, TS.colors.border, 0.74)!,
        ),
        boxShadow: [
          BoxShadow(
            color: TS.colors.onBackground.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: TS.colors.primary,
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(
              Icons.track_changes,
              color: TS.colors.onPrimary,
              size: 24,
            ),
          ),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '每日任务',
                  style: TS.textStyle.caption.copyWith(color: TS.colors.primary),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(task.title, style: TS.textStyle.title),
                Text(
                  task.subtitle,
                  style: TS.textStyle.content.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: TS.spacing.sm,
              vertical: TS.spacing.xs,
            ),
            decoration: BoxDecoration(
              color: completed
                  ? TS.colors.secondarySoft
                  : TS.colors.primarySoft,
              borderRadius: BorderRadius.circular(TS.radius.full),
            ),
            child: Text(
              completed ? '已达成' : '进行中',
              style: TS.textStyle.captionStrong.copyWith(
                color: completed
                    ? TS.colors.onSurfaceMuted
                    : TS.colors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressSection extends StatelessWidget {
  const _ProgressSection({
    required this.progressValue,
    required this.progressLabel,
  });

  final double progressValue;
  final String progressLabel;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('完成进度', style: TS.textStyle.subtitle),
            Text(
              progressLabel,
              style: TS.textStyle.subtitle.copyWith(color: TS.colors.primary),
            ),
          ],
        ),
        SizedBox(height: TS.spacing.smPlus),
        CommonProgress(value: progressValue),
        SizedBox(height: TS.spacing.smPlus),
        Container(
          padding: EdgeInsets.all(TS.spacing.smPlus),
          decoration: BoxDecoration(
            color: Color.lerp(TS.colors.primary, Colors.transparent, 0.94),
            border: Border(
              left: BorderSide(color: TS.colors.primary, width: 3),
            ),
          ),
          child: Row(
            children: [
              Icon(Icons.monetization_on_outlined, color: TS.colors.primary),
              SizedBox(width: 10),
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
      ],
    );
  }
}

class _StepsSection extends StatelessWidget {
  const _StepsSection({required this.completed});

  final bool completed;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('完成方式', style: TS.textStyle.subtitle),
        SizedBox(height: TS.spacing.smPlus),
        _StepRow(
          icon: completed ? Icons.check : null,
          index: completed ? null : '1',
          title: '新增一笔有效流水',
          subtitle: '支出或收入均可，金额需大于 0',
        ),
        SizedBox(height: TS.spacing.smPlus),
        const _StepRow(
          icon: Icons.local_fire_department,
          title: '保持连续记录',
          subtitle: '连续完成可解锁成长任务',
        ),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    this.icon,
    this.index,
    required this.title,
    required this.subtitle,
  });

  final IconData? icon;
  final String? index;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: TS.colors.primary),
          ),
          child: icon != null
              ? Icon(icon, size: 16, color: TS.colors.primary)
              : Text(
                  index ?? '',
                  style: TS.textStyle.label.copyWith(color: TS.colors.primary),
                ),
        ),
        SizedBox(width: TS.spacing.smPlus),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TS.textStyle.subtitle),
              Text(
                subtitle,
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
