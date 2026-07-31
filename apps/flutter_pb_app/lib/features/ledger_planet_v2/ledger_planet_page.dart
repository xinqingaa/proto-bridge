import 'package:flutter/material.dart';

import '../../common/widgets/app_bar.dart';
import '../../common/widgets/scrollable_data_list.dart';
import '../../common/widgets/tabs.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';

class LedgerPlanetV2Page extends StatelessWidget {
  const LedgerPlanetV2Page({super.key});

  static const _tasks = [
    _TaskData(
      value: '3',
      unit: '星币',
      title: '记一笔',
      description: '今日完成 1 笔记账',
      meta: '每日 · 奖励 3 星币',
      status: '去完成',
      tone: _TaskTone.primary,
    ),
    _TaskData(
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
      value: '¥3',
      unit: '体验券',
      title: '连续记账 3 天',
      description: '成长任务',
      meta: '成长 · 奖励 ¥3 体验券',
      status: '去完成',
      tone: _TaskTone.primary,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: TS.colors.background,
        appBar: const CommonAppBar(
          title: '任务',
          showBack: true,
          elevated: false,
          centerTitle: false,
        ),
        body: CommonScrollableDataList(
          itemCount: _tasks.length + 1,
          padding: EdgeInsets.all(TS.spacing.md),
          separatorBuilder: (_, index) =>
              SizedBox(height: index == 0 ? TS.spacing.md : TS.spacing.smPlus),
          itemBuilder: (context, index) {
            if (index == 0) {
              return const SizedBox(
                height: 40,
                child: IgnorePointer(
                  child: CommonTabs(
                    isScrollable: false,
                    selectionStyle: CommonTabSelectionStyle.pill,
                    items: [
                      CommonTabItem(value: 'all', label: '全部'),
                      CommonTabItem(value: 'pending', label: '待完成'),
                      CommonTabItem(value: 'done', label: '已完成'),
                    ],
                  ),
                ),
              );
            }

            final task = _tasks[index - 1];
            return _TaskRow(
              task: task,
              onTap: task.opensClaimableDetail
                  ? () => Navigator.of(
                      context,
                    ).pushNamed(AppRoutes.ledgerPlanetV2TaskDetail)
                  : null,
            );
          },
        ),
      ),
    );
  }
}

enum _TaskTone { primary, warning }

class _TaskData {
  const _TaskData({
    required this.value,
    required this.unit,
    required this.title,
    required this.description,
    required this.meta,
    required this.status,
    required this.tone,
    this.opensClaimableDetail = false,
  });

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
                              style: TS.textStyle.title.copyWith(
                                color: _accent,
                              ),
                            ),
                            Text(
                              task.unit,
                              style: TS.textStyle.caption.copyWith(
                                color: _accent,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(
                            left: TS.spacing.md,
                            right: TS.spacing.md,
                          ),
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
