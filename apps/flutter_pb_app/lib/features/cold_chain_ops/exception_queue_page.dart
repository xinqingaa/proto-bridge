import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'fixtures.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.exception-queue`
class ExceptionQueuePage extends StatefulWidget {
  const ExceptionQueuePage({
    super.key,
    this.variant = QueueVariant.defaultQueue,
  });

  final QueueVariant variant;

  static ExceptionQueuePage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const {};
    return ExceptionQueuePage(
      variant: parseQueueVariant(map['variant']),
    );
  }

  @override
  State<ExceptionQueuePage> createState() => _ExceptionQueuePageState();
}

class _ExceptionQueuePageState extends State<ExceptionQueuePage> {
  static const _filters = [
    CommonFilterItem(value: 'all', label: '全部'),
    CommonFilterItem(value: 'critical', label: '严重'),
    CommonFilterItem(value: 'warning', label: '警告'),
    CommonFilterItem(value: 'watch', label: '关注'),
  ];

  late QueueVariant _variant;
  late String _filter;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
    _filter = _variant == QueueVariant.criticalOnly ? 'critical' : 'all';
  }

  List<ExceptionItem> get _visibleRows {
    if (_variant == QueueVariant.empty) return const [];
    var rows = List<ExceptionItem>.from(kExceptionItems);
    if (_variant == QueueVariant.criticalOnly || _filter == 'critical') {
      rows = rows
          .where((e) => e.severity == ExceptionSeverity.critical)
          .toList();
    } else if (_filter == 'warning') {
      rows =
          rows.where((e) => e.severity == ExceptionSeverity.warning).toList();
    } else if (_filter == 'watch') {
      rows = rows.where((e) => e.severity == ExceptionSeverity.watch).toList();
    }
    final q = _query.trim().toLowerCase();
    if (q.isNotEmpty) {
      rows = rows
          .where(
            (e) =>
                e.id.toLowerCase().contains(q) ||
                e.shipmentId.toLowerCase().contains(q) ||
                e.lane.toLowerCase().contains(q) ||
                e.cargo.toLowerCase().contains(q),
          )
          .toList();
    }
    return rows;
  }

  Future<void> _refresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() {
      if (_variant == QueueVariant.error || _variant == QueueVariant.loading) {
        _variant = QueueVariant.defaultQueue;
        _filter = 'all';
      }
    });
  }

  void _showCriticalOnly() {
    setState(() {
      _variant = QueueVariant.criticalOnly;
      _filter = 'critical';
    });
  }

  void _openShipment(ExceptionItem item) {
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainOpsShipmentDetail,
      arguments: {
        'variant': 'active-excursion',
        'shipmentId': item.shipmentId,
        'exceptionId': item.id,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '冷链异常'),
      body: switch (_variant) {
        QueueVariant.loading => _LoadingBody(),
        QueueVariant.error => _ErrorBody(onRetry: () {
            setState(() => _variant = QueueVariant.defaultQueue);
          }),
        _ => _QueueScrollBody(
            rows: _visibleRows,
            filter: _filter,
            filters: _filters,
            onFilterSelected: (value) {
              setState(() {
                _filter = value;
                if (value == 'critical') {
                  _variant = QueueVariant.criticalOnly;
                } else if (_variant == QueueVariant.criticalOnly) {
                  _variant = QueueVariant.defaultQueue;
                }
              });
            },
            onQueryChanged: (value) => setState(() => _query = value),
            onShowCritical: _showCriticalOnly,
            onRefresh: _refresh,
            onOpen: _openShipment,
          ),
      },
    );
  }
}

class _LoadingBody extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CommonSpinner(size: CommonControlSize.sm),
          SizedBox(width: TS.spacing.sm),
          Text(
            '正在同步运输监控数据',
            style: TS.textStyle.content.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Align(
        alignment: Alignment.topCenter,
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(TS.spacing.md),
          decoration: BoxDecoration(
            color: TS.colors.errorSoft,
            borderRadius: BorderRadius.circular(TS.radius.lg),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.warning_amber_rounded,
                  color: TS.colors.error, size: TS.sizing.iconLg),
              SizedBox(height: TS.spacing.sm),
              Text(
                '监控数据暂时不可用',
                style: TS.textStyle.titleSm.copyWith(color: TS.colors.error),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: TS.spacing.xs),
              Text(
                '最后一次成功同步为 14:28，请检查连接后重试。',
                style: TS.textStyle.caption.copyWith(color: TS.colors.error),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: TS.spacing.md),
              CommonButton(
                label: '重新加载',
                tone: CommonButtonTone.primary,
                onPressed: onRetry,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QueueScrollBody extends StatelessWidget {
  const _QueueScrollBody({
    required this.rows,
    required this.filter,
    required this.filters,
    required this.onFilterSelected,
    required this.onQueryChanged,
    required this.onShowCritical,
    required this.onRefresh,
    required this.onOpen,
  });

  final List<ExceptionItem> rows;
  final String filter;
  final List<CommonFilterItem> filters;
  final ValueChanged<String> onFilterSelected;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onShowCritical;
  final Future<void> Function() onRefresh;
  final ValueChanged<ExceptionItem> onOpen;

  @override
  Widget build(BuildContext context) {
    // Evidence scroll-owner: summary/search/filters/list|empty inside scroll-list.
    final itemCount = 3 + (rows.isEmpty ? 1 : rows.length);
    return CommonScrollableDataList(
      padding: EdgeInsets.fromLTRB(
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.lg,
      ),
      onRefresh: onRefresh,
      onLoadMore: () async {},
      hasMore: false,
      itemCount: itemCount,
      separatorBuilder: (_, index) {
        if (index < 2) return SizedBox(height: TS.spacing.md);
        if (index == 2) return SizedBox(height: TS.spacing.smPlus);
        return SizedBox(height: TS.spacing.sm);
      },
      itemBuilder: (context, index) {
        if (index == 0) {
          return _SummaryCard(onShowCritical: onShowCritical);
        }
        if (index == 1) {
          return CommonSearchBar(
            hint: '搜索异常、运单或线路',
            onChanged: onQueryChanged,
            onSubmitted: onQueryChanged,
          );
        }
        if (index == 2) {
          return CommonFilterBar(
            items: filters,
            selected: {filter},
            onSelected: onFilterSelected,
          );
        }
        if (rows.isEmpty) {
          return const CommonEmptyState(
            title: '没有待处理异常',
            description: '当前筛选范围内的运输温度全部正常。',
            icon: Icons.inbox_outlined,
          );
        }
        final item = rows[index - 3];
        return _ExceptionRow(item: item, onTap: () => onOpen(item));
      },
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.onShowCritical});

  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      title: '当前风险',
      subtitle: kQueueRegion,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _MetricTile(
                  icon: Icons.error_outline,
                  value: '$kQueueCriticalCount',
                  label: '严重异常',
                  emphasize: true,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _MetricTile(
                  icon: Icons.ac_unit,
                  value: '$kQueueUnassignedCount',
                  label: '等待接手',
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _MetricTile(
                  icon: Icons.schedule,
                  value: kQueueLongestOverTemp,
                  label: '最长超温',
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonButton(
            label: '仅看严重异常',
            size: CommonControlSize.sm,
            tone: CommonButtonTone.error,
            variant: CommonButtonVariant.tonal,
            onPressed: onShowCritical,
          ),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.icon,
    required this.value,
    required this.label,
    this.emphasize = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final bg = emphasize ? TS.colors.errorSoft : TS.colors.surfaceVariant;
    final fg = emphasize ? TS.colors.error : TS.colors.onSurface;
    return Container(
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: TS.sizing.iconSm, color: fg),
          SizedBox(height: TS.spacing.xs),
          Text(value, style: TS.textStyle.titleSm.copyWith(color: fg)),
          Text(
            label,
            style: TS.textStyle.caption.copyWith(
              color: emphasize ? TS.colors.error : TS.colors.onSurfaceMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExceptionRow extends StatelessWidget {
  const _ExceptionRow({required this.item, required this.onTap});

  final ExceptionItem item;
  final VoidCallback onTap;

  CommonBadgeTone get _tone => switch (item.severity) {
        ExceptionSeverity.critical => CommonBadgeTone.error,
        ExceptionSeverity.warning => CommonBadgeTone.warning,
        ExceptionSeverity.watch => CommonBadgeTone.primary,
      };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final tempColor = item.severity == ExceptionSeverity.critical ||
            item.severity == ExceptionSeverity.warning
        ? TS.colors.error
        : TS.colors.onSurface;
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
        child: Padding(
          padding: EdgeInsets.all(TS.spacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.identity,
                      style: TS.textStyle.caption.copyWith(
                        color: TS.colors.onSurfaceMuted,
                      ),
                    ),
                  ),
                  CommonBadge(
                    label: item.severityLabel,
                    semanticTone: _tone,
                  ),
                ],
              ),
              SizedBox(height: TS.spacing.xs),
              Text(item.lane, style: TS.textStyle.subtitle),
              SizedBox(height: TS.spacing.xxs),
              Text(
                item.cargo,
                style: TS.textStyle.caption.copyWith(
                  color: TS.colors.onSurfaceMuted,
                ),
              ),
              SizedBox(height: TS.spacing.sm),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Icon(Icons.thermostat,
                      size: TS.sizing.iconSm, color: tempColor),
                  SizedBox(width: TS.spacing.xxs),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: '${item.temperatureC.toStringAsFixed(1)}°C',
                            style: TS.textStyle.content.copyWith(
                              color: tempColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          TextSpan(
                            text:
                                '  上限 ${item.limitC.toStringAsFixed(0)}°C · 已持续 ${item.durationMinutes} 分钟',
                            style: TS.textStyle.caption.copyWith(
                              color: TS.colors.onSurfaceMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Text(
                    item.timeLabel,
                    style: TS.textStyle.caption.copyWith(
                      color: TS.colors.onSurfaceMuted,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
