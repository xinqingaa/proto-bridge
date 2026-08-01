import 'package:flutter/material.dart';

import '../../common/widgets/app_bar.dart';
import '../../common/widgets/empty_state.dart';
import '../../common/widgets/scrollable_data_list.dart';
import '../../common/widgets/tab_view.dart';
import '../../common/widgets/tabs.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';

/// Ledger Planet V2 任务列表。
///
/// 固定 Evidence：
/// - Handoff `handoff-2026-08-01t064221989-26eb7abe`
/// - default / filter-todo / filter-done / empty Cases
class LedgerPlanetV2Page extends StatefulWidget {
  const LedgerPlanetV2Page({super.key});

  @override
  State<LedgerPlanetV2Page> createState() => _LedgerPlanetV2PageState();
}

class _LedgerPlanetV2PageState extends State<LedgerPlanetV2Page>
    with SingleTickerProviderStateMixin {
  static const _tabItems = [
    CommonTabItem(value: 'all', label: '全部'),
    CommonTabItem(value: 'todo', label: '待完成'),
    CommonTabItem(value: 'done', label: '已完成'),
  ];

  /// Evidence keys: todo → t1,t3；done → t2；all → t1,t2,t3。
  static const _tasks = [
    _TaskData(
      key: 't1',
      filter: _TaskFilter.todo,
      value: '3',
      unit: '星币',
      title: '记一笔',
      description: '今日完成 1 笔记账',
      meta: '每日 · 奖励 3 星币',
      status: '去完成',
      tone: _TaskTone.primary,
    ),
    _TaskData(
      key: 't2',
      filter: _TaskFilter.done,
      value: '5',
      unit: '星币',
      title: '查看本周图表',
      description: '打开图表分析页',
      meta: '每周 · 奖励 5 星币',
      status: '待领取',
      tone: _TaskTone.warning,
      opensClaimableDetail: true,
    ),
    _TaskData(
      key: 't3',
      filter: _TaskFilter.todo,
      value: '¥3',
      unit: '体验券',
      title: '连续记账 3 天',
      description: '成长任务',
      meta: '成长 · 奖励 ¥3 体验券',
      status: '去完成',
      tone: _TaskTone.primary,
    ),
  ];

  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _tabItems.length, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  List<_TaskData> _rowsFor(String tab) {
    switch (tab) {
      case 'todo':
        return _tasks.where((t) => t.filter == _TaskFilter.todo).toList();
      case 'done':
        return _tasks.where((t) => t.filter == _TaskFilter.done).toList();
      default:
        return List<_TaskData>.from(_tasks);
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '任务',
        showBack: true,
        elevated: false,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              TS.spacing.md,
              TS.spacing.md,
              TS.spacing.md,
              0,
            ),
            child: SizedBox(
              height: TS.sizing.controlMd,
              child: CommonTabs(
                controller: _tabs,
                isScrollable: false,
                selectionStyle: CommonTabSelectionStyle.pill,
                items: _tabItems,
              ),
            ),
          ),
          Expanded(
            child: CommonTabView(
              controller: _tabs,
              children: [
                for (final item in _tabItems) _TaskPanel(rows: _rowsFor(item.value)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskPanel extends StatelessWidget {
  const _TaskPanel({required this.rows});

  final List<_TaskData> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return const CommonEmptyState(
        title: '没有任务',
        description: '稍后再来看看。',
      );
    }

    return CommonScrollableDataList(
      padding: EdgeInsets.all(TS.spacing.md),
      itemCount: rows.length,
      onRefresh: () async {},
      separatorBuilder: (_, index) => SizedBox(height: TS.spacing.smPlus),
      itemBuilder: (context, index) {
        final task = rows[index];
        return _TaskRow(
          task: task,
          onTap: task.opensClaimableDetail
              ? () => Navigator.of(context).pushNamed(
                    AppRoutes.ledgerPlanetV2TaskDetail,
                  )
              : null,
        );
      },
    );
  }
}

enum _TaskFilter { todo, done }

enum _TaskTone { primary, warning }

class _TaskData {
  const _TaskData({
    required this.key,
    required this.filter,
    required this.value,
    required this.unit,
    required this.title,
    required this.description,
    required this.meta,
    required this.status,
    required this.tone,
    this.opensClaimableDetail = false,
  });

  final String key;
  final _TaskFilter filter;
  final String value;
  final String unit;
  final String title;
  final String description;
  final String meta;
  final String status;
  final _TaskTone tone;
  final bool opensClaimableDetail;
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task, this.onTap});

  final _TaskData task;
  final VoidCallback? onTap;

  Color get _accent =>
      task.tone == _TaskTone.warning ? TS.colors.warning : TS.colors.primary;

  Color get _soft => task.tone == _TaskTone.warning
      ? TS.colors.warningSoft
      : TS.colors.primarySoft;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(TS.radius.lg);

    return SizedBox(
      height: 92,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Ink(
            decoration: BoxDecoration(
              color: TS.colors.surface,
              borderRadius: radius,
              border: Border.all(color: TS.colors.border),
            ),
            child: ClipRRect(
              borderRadius: radius,
              child: Stack(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 76,
                        color: _soft,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              task.value,
                              style: TS.textStyle.title.copyWith(color: _accent),
                            ),
                            Text(
                              task.unit,
                              style: TS.textStyle.caption.copyWith(color: _accent),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      task.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TS.textStyle.titleSm,
                                    ),
                                    Text(
                                      task.description,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TS.textStyle.content.copyWith(
                                        color: TS.colors.onSurfaceMuted,
                                      ),
                                    ),
                                    Text(
                                      task.meta,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TS.textStyle.caption,
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(width: TS.spacing.sm),
                              _StatusChip(
                                label: task.status,
                                foreground: _accent,
                                background: _soft,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  Positioned(
                    left: 75,
                    top: 0,
                    bottom: 0,
                    child: CustomPaint(
                      size: const Size(1, 92),
                      painter: _DashedDividerPainter(TS.colors.border),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.label,
    required this.foreground,
    required this.background,
  });

  final String label;
  final Color foreground;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 26,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(TS.radius.sm),
      ),
      child: Text(
        label,
        style: TS.textStyle.caption.copyWith(color: foreground),
      ),
    );
  }
}

class _DashedDividerPainter extends CustomPainter {
  const _DashedDividerPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    const dash = 3.0;
    const gap = 3.0;
    for (var y = 0.0; y < size.height; y += dash + gap) {
      canvas.drawLine(
        Offset(0, y),
        Offset(0, (y + dash).clamp(0, size.height)),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DashedDividerPainter oldDelegate) =>
      oldDelegate.color != color;
}
