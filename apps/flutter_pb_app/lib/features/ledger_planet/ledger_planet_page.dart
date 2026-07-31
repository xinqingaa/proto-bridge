import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'task_models.dart';

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

class _LedgerPlanetPageState extends State<LedgerPlanetPage>
    with SingleTickerProviderStateMixin {
  static const _tabItems = [
    CommonTabItem(value: 'all', label: '全部'),
    CommonTabItem(value: 'todo', label: '待完成'),
    CommonTabItem(value: 'done', label: '已完成'),
  ];

  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _tabItems.length, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  List<BenefitTask> _rowsFor(int index) {
    if (widget.variant == 'claimable') {
      if (index != 0) return const [];
      return kLedgerTasks
          .where((item) => item.rewardState == RewardState.claimable)
          .toList();
    }
    switch (index) {
      case 1:
        return kLedgerTasks
            .where((item) => item.status == TaskStatus.todo)
            .toList();
      case 2:
        return kLedgerTasks
            .where((item) => item.status == TaskStatus.done)
            .toList();
      default:
        return kLedgerTasks;
    }
  }

  String _emptyTitle(int index) {
    switch (index) {
      case 1:
        return '暂无待完成任务';
      case 2:
        return '暂无已完成任务';
      default:
        return '没有任务';
    }
  }

  String _emptyDescription(int index) {
    switch (index) {
      case 1:
        return '新任务会出现在这里。';
      case 2:
        return '完成后会出现在这里。';
      default:
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

  Widget _panel(int index) {
    final rows = _rowsFor(index);
    if (rows.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.only(top: TS.spacing.xl),
        children: [
          CommonEmptyState(
            title: _emptyTitle(index),
            description: _emptyDescription(index),
          ),
        ],
      );
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.only(top: TS.spacing.xs),
      itemCount: rows.length,
      separatorBuilder: (_, _) => SizedBox(height: TS.spacing.smPlus),
      itemBuilder: (context, i) {
        final task = rows[i];
        return _TaskTicket(task: task, onTap: () => _open(task));
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '任务', showBack: true),
      body: Padding(
        padding: EdgeInsets.fromLTRB(
          TS.spacing.md,
          TS.spacing.md,
          TS.spacing.md,
          0,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CommonTabs(
              controller: _tabs,
              items: _tabItems,
              selectionStyle: CommonTabSelectionStyle.pill,
              isScrollable: false,
            ),
            SizedBox(height: TS.spacing.sm),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await Future<void>.delayed(const Duration(milliseconds: 400));
                },
                child: CommonTabView(
                  controller: _tabs,
                  children: [
                    for (var i = 0; i < _tabItems.length; i++) _panel(i),
                  ],
                ),
              ),
            ),
          ],
        ),
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

  CommonChipTone get _chipTone {
    if (_claimable) return CommonChipTone.warning;
    if (task.status == TaskStatus.done) return CommonChipTone.success;
    return CommonChipTone.primary;
  }

  String get _chipLabel {
    if (_claimable) return '待领取';
    if (task.status == TaskStatus.done) return '已完成';
    return '去完成';
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
                  child: CommonChip(
                    label: _chipLabel,
                    tone: _chipTone,
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
