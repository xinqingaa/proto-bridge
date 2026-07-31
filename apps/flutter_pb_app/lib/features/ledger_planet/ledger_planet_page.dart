import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'task_models.dart';

enum _TaskTab { all, todo, done }

/// Task list — Evidence: `ledger-planet.task-list` (default / claimable).
class LedgerPlanetPage extends StatefulWidget {
  const LedgerPlanetPage({
    super.key,
    this.variant = 'default',
  });

  /// `default` shows all mock tasks; `claimable` keeps only claimable rows.
  final String variant;

  @override
  State<LedgerPlanetPage> createState() => _LedgerPlanetPageState();
}

class _LedgerPlanetPageState extends State<LedgerPlanetPage> {
  _TaskTab _tab = _TaskTab.all;

  static const _filters = [
    CommonFilterItem(value: 'all', label: '全部'),
    CommonFilterItem(value: 'todo', label: '待完成'),
    CommonFilterItem(value: 'done', label: '已完成'),
  ];

  List<BenefitTask> _rowsFor(_TaskTab tab) {
    if (widget.variant == 'claimable') {
      if (tab != _TaskTab.all) return const [];
      return kLedgerTasks
          .where((item) => item.rewardState == RewardState.claimable)
          .toList();
    }
    switch (tab) {
      case _TaskTab.todo:
        return kLedgerTasks
            .where((item) => item.status == TaskStatus.todo)
            .toList();
      case _TaskTab.done:
        return kLedgerTasks
            .where((item) => item.status == TaskStatus.done)
            .toList();
      case _TaskTab.all:
        return kLedgerTasks;
    }
  }

  String get _emptyTitle {
    switch (_tab) {
      case _TaskTab.todo:
        return '暂无待完成任务';
      case _TaskTab.done:
        return '暂无已完成任务';
      case _TaskTab.all:
        return '没有任务';
    }
  }

  String get _emptyDescription {
    switch (_tab) {
      case _TaskTab.todo:
        return '新任务会出现在这里。';
      case _TaskTab.done:
        return '完成后会出现在这里。';
      case _TaskTab.all:
        return '稍后再来看看。';
    }
  }

  void _open(BenefitTask task) {
    final detailVariant = task.rewardState == RewardState.claimable
        ? 'claimable'
        : task.status == TaskStatus.done
            ? 'completed'
            : 'default';
    Navigator.of(context).pushNamed(
      AppRoutes.ledgerPlanetTaskDetail,
      arguments: <String, String>{
        'taskId': task.id,
        'variant': detailVariant,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final rows = _rowsFor(_tab);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '任务', showBack: true),
      body: CommonScrollableDataList(
        onRefresh: () async {
          await Future<void>.delayed(const Duration(milliseconds: 400));
        },
        padding: EdgeInsets.all(TS.spacing.md),
        itemCount: 1,
        itemBuilder: (context, _) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CommonFilterBar(
                items: _filters,
                selected: {_tab.name},
                onSelected: (value) {
                  setState(() {
                    _tab = _TaskTab.values.firstWhere((t) => t.name == value);
                  });
                },
              ),
              SizedBox(height: TS.spacing.sm),
              if (rows.isEmpty)
                Padding(
                  padding: EdgeInsets.only(top: TS.spacing.xl),
                  child: CommonEmptyState(
                    title: _emptyTitle,
                    description: _emptyDescription,
                  ),
                )
              else
                for (var i = 0; i < rows.length; i++) ...[
                  if (i > 0) SizedBox(height: TS.spacing.smPlus),
                  _TaskTicket(task: rows[i], onTap: () => _open(rows[i])),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _TaskTicket extends StatelessWidget {
  const _TaskTicket({required this.task, required this.onTap});

  final BenefitTask task;
  final VoidCallback onTap;

  bool get _claimable => task.rewardState == RewardState.claimable;
  bool get _doneMuted =>
      task.status == TaskStatus.done && !_claimable;

  ({String label, Color bg, Color fg}) get _chip {
    if (_claimable) {
      return (
        label: '待领取',
        bg: TS.colors.warningSoft,
        fg: TS.colors.warning,
      );
    }
    if (task.status == TaskStatus.done) {
      return (
        label: '已完成',
        bg: TS.colors.successSoft,
        fg: TS.colors.success,
      );
    }
    return (
      label: '去完成',
      bg: TS.colors.primarySoft,
      fg: TS.colors.primary,
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final face = faceValue(task.reward);
    final faceBg = _claimable
        ? Color.lerp(TS.colors.warning, TS.colors.surface, 0.86)!
        : _doneMuted
            ? Color.lerp(TS.colors.onSurfaceMuted, TS.colors.surface, 0.9)!
            : Color.lerp(TS.colors.primary, TS.colors.surface, 0.88)!;
    final faceFg = _claimable
        ? TS.colors.warning
        : _doneMuted
            ? TS.colors.onSurfaceMuted
            : TS.colors.primary;
    final chip = _chip;

    return Material(
      color: TS.colors.surface,
      elevation: TS.elevation.card,
      shadowColor: TS.colors.onBackground.withValues(alpha: 0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TS.radius.lg),
        side: BorderSide(color: TS.colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Opacity(
          opacity: _doneMuted ? 0.78 : 1,
          child: IntrinsicHeight(
            child: Row(
              children: [
                Container(
                  width: 76,
                  padding: EdgeInsets.symmetric(
                    horizontal: TS.spacing.sm,
                    vertical: TS.spacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: faceBg,
                    border: Border(
                      right: BorderSide(
                        color: Color.lerp(faceFg, TS.colors.border, 0.72)!,
                        style: BorderStyle.solid,
                        width: 1,
                      ),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        face.primary,
                        style: TS.textStyle.title.copyWith(
                          color: faceFg,
                          height: 1,
                        ),
                      ),
                      SizedBox(height: TS.spacing.xxs),
                      Text(
                        face.hint,
                        style: TS.textStyle.caption.copyWith(
                          color: Color.lerp(
                            faceFg,
                            TS.colors.onSurfaceMuted,
                            0.28,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.symmetric(
                      horizontal: TS.spacing.smPlus,
                      vertical: TS.spacing.md,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(task.title, style: TS.textStyle.subtitle),
                        SizedBox(height: TS.spacing.xxs),
                        Text(
                          task.subtitle,
                          style: TS.textStyle.caption.copyWith(
                            color: TS.colors.onSurfaceMuted,
                          ),
                        ),
                        Text(
                          '${task.cycle} · 奖励 ${task.reward}',
                          style: TS.textStyle.caption.copyWith(
                            color: TS.colors.onSurfaceMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.only(right: TS.spacing.md),
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: TS.spacing.sm,
                      vertical: TS.spacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: chip.bg,
                      borderRadius: BorderRadius.circular(TS.radius.full),
                    ),
                    child: Text(
                      chip.label,
                      style: TS.textStyle.captionStrong.copyWith(color: chip.fg),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
