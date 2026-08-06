import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.exception-queue`
class ExceptionQueueEvidencePage extends StatefulWidget {
  const ExceptionQueueEvidencePage({
    super.key,
    this.variant = 'default',
  });

  /// default | critical-only | empty | error | loading
  final String variant;

  static ExceptionQueueEvidencePage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return ExceptionQueueEvidencePage(
      variant: map['variant']?.toString() ?? 'default',
    );
  }

  @override
  State<ExceptionQueueEvidencePage> createState() =>
      _ExceptionQueueEvidencePageState();
}

class _ExceptionQueueEvidencePageState extends State<ExceptionQueueEvidencePage> {
  static const _filters = <CommonFilterItem>[
    CommonFilterItem(value: 'all', label: '全部'),
    CommonFilterItem(value: 'critical', label: '严重'),
    CommonFilterItem(value: 'warning', label: '警告'),
    CommonFilterItem(value: 'watch', label: '关注'),
  ];

  late String _shellVariant;
  late Set<String> _selectedFilter;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _shellVariant = widget.variant;
    _selectedFilter = {
      if (widget.variant == 'critical-only') 'critical' else 'all',
    };
  }

  List<ExceptionRow> get _visibleRows {
    if (_shellVariant == 'empty') return const [];
    var rows = List<ExceptionRow>.from(kExceptionRows);
    if (_shellVariant == 'critical-only' ||
        _selectedFilter.contains('critical')) {
      rows = rows
          .where((r) => r.severity == ExceptionSeverity.critical)
          .toList();
    } else if (_selectedFilter.contains('warning')) {
      rows =
          rows.where((r) => r.severity == ExceptionSeverity.warning).toList();
    } else if (_selectedFilter.contains('watch')) {
      rows = rows.where((r) => r.severity == ExceptionSeverity.watch).toList();
    }
    final q = _query.trim();
    if (q.isNotEmpty) {
      rows = rows
          .where(
            (r) =>
                r.identity.contains(q) ||
                r.lane.contains(q) ||
                r.cargo.contains(q) ||
                r.shipmentId.contains(q),
          )
          .toList();
    }
    return rows;
  }

  void _showCriticalOnly() {
    setState(() {
      _shellVariant = 'critical-only';
      _selectedFilter = {'critical'};
    });
  }

  void _onFilter(String value) {
    setState(() {
      _selectedFilter = {value};
      if (value == 'critical') {
        _shellVariant = 'critical-only';
      } else if (_shellVariant == 'critical-only' ||
          _shellVariant == 'empty') {
        _shellVariant = value == 'all' ? 'default' : 'default';
      }
      if (_visibleRows.isEmpty &&
          _shellVariant != 'error' &&
          _shellVariant != 'loading') {
        // Keep empty shell when filter yields no rows and variant was empty.
      }
    });
  }

  void _openShipment(ExceptionRow row) {
    final detailVariant =
        row.severity == ExceptionSeverity.critical ? 'active-excursion' : 'default';
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainShipmentDetail,
      arguments: <String, String>{
        'exceptionId': row.id,
        'shipmentId': row.shipmentId,
        'variant': detailVariant,
      },
    );
  }

  Future<void> _refresh() async {
    await Future<void>.delayed(TS.motion.durationNormal);
    if (!mounted) return;
    setState(() {
      if (_shellVariant == 'error' || _shellVariant == 'loading') {
        _shellVariant = 'default';
        _selectedFilter = {'all'};
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '冷链异常'),
      body: switch (_shellVariant) {
        'loading' => _LoadingBody(),
        'error' => _ErrorBody(onRetry: () => setState(() => _shellVariant = 'default')),
        _ => _QueueBody(
            rows: _visibleRows,
            selectedFilter: _selectedFilter,
            filters: _filters,
            onFilter: _onFilter,
            onShowCritical: _showCriticalOnly,
            onQuery: (q) => setState(() => _query = q),
            onOpen: _openShipment,
            onRefresh: _refresh,
            forceEmpty: _shellVariant == 'empty',
          ),
      },
    );
  }
}

class _QueueBody extends StatelessWidget {
  const _QueueBody({
    required this.rows,
    required this.selectedFilter,
    required this.filters,
    required this.onFilter,
    required this.onShowCritical,
    required this.onQuery,
    required this.onOpen,
    required this.onRefresh,
    required this.forceEmpty,
  });

  final List<ExceptionRow> rows;
  final Set<String> selectedFilter;
  final List<CommonFilterItem> filters;
  final ValueChanged<String> onFilter;
  final VoidCallback onShowCritical;
  final ValueChanged<String> onQuery;
  final ValueChanged<ExceptionRow> onOpen;
  final Future<void> Function() onRefresh;
  final bool forceEmpty;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final showEmpty = forceEmpty || rows.isEmpty;
    // summary + search + filters + (rows | empty) + footer
    final itemCount = 3 + (showEmpty ? 1 : rows.length) + 1;

    return CommonScrollableDataList(
      padding: EdgeInsets.all(TS.spacing.md),
      onRefresh: onRefresh,
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: EdgeInsets.only(bottom: TS.spacing.md),
            child: _SummaryCard(onShowCritical: onShowCritical),
          );
        }
        if (index == 1) {
          return Padding(
            padding: EdgeInsets.only(bottom: TS.spacing.sm),
            child: CommonSearchBar(
              hint: '搜索异常、运单或线路',
              onChanged: onQuery,
              onSubmitted: onQuery,
            ),
          );
        }
        if (index == 2) {
          return Padding(
            padding: EdgeInsets.only(bottom: TS.spacing.md),
            child: CommonFilterBar(
              items: filters,
              selected: selectedFilter,
              onSelected: onFilter,
            ),
          );
        }
        if (showEmpty && index == 3) {
          return Padding(
            padding: EdgeInsets.symmetric(vertical: TS.spacing.xl),
            child: const CommonEmptyState(
              title: '没有待处理异常',
              description: '当前筛选范围内的运输温度全部正常。',
              icon: Icons.folder_open_outlined,
            ),
          );
        }
        if (!showEmpty && index < 3 + rows.length) {
          final row = rows[index - 3];
          return Padding(
            padding: EdgeInsets.only(bottom: TS.spacing.sm),
            child: _ExceptionCard(row: row, onTap: () => onOpen(row)),
          );
        }
        return Padding(
          padding: EdgeInsets.symmetric(vertical: TS.spacing.md),
          child: Center(
            child: Text(
              '没有更多了',
              style: TS.textStyle.caption.copyWith(
                color: TS.colors.onSurfaceMuted,
              ),
            ),
          ),
        );
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
      elevated: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('当前风险', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text(
            '华东区域 · 14:35 更新',
            style: TS.textStyle.caption.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          Row(
            children: [
              Expanded(
                child: _MetricTile(
                  icon: Icons.warning_amber_rounded,
                  value: '2',
                  label: '严重异常',
                  emphasize: true,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _MetricTile(
                  icon: Icons.ac_unit,
                  value: '2',
                  label: '等待接手',
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _MetricTile(
                  icon: Icons.schedule,
                  value: '47m',
                  label: '最长超温',
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonButton(
            label: '仅看严重异常',
            variant: CommonButtonVariant.tonal,
            tone: CommonButtonTone.error,
            size: CommonControlSize.sm,
            block: true,
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
    TS.of(context);
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
          Icon(icon, size: TS.sizing.iconMd, color: fg),
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

class _ExceptionCard extends StatelessWidget {
  const _ExceptionCard({required this.row, required this.onTap});

  final ExceptionRow row;
  final VoidCallback onTap;

  CommonBadgeTone get _badgeTone => switch (row.severity) {
        ExceptionSeverity.critical => CommonBadgeTone.error,
        ExceptionSeverity.warning => CommonBadgeTone.warning,
        ExceptionSeverity.watch => CommonBadgeTone.primary,
      };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final tempColor = row.severity == ExceptionSeverity.critical ||
            row.severity == ExceptionSeverity.warning
        ? TS.colors.error
        : TS.colors.onSurface;
    return CommonCard(
      elevated: false,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  row.identity,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ),
              CommonBadge(label: row.severityLabel, semanticTone: _badgeTone),
            ],
          ),
          SizedBox(height: TS.spacing.xs),
          Text(row.lane, style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text(
            row.cargo,
            style: TS.textStyle.content.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
          SizedBox(height: TS.spacing.sm),
          Divider(height: 1, color: TS.colors.border),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Icon(Icons.thermostat, size: TS.sizing.iconMd, color: tempColor),
              SizedBox(width: TS.spacing.xs),
              Text(
                row.temperature,
                style: TS.textStyle.label.copyWith(color: tempColor),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  row.durationLabel.isEmpty
                      ? row.limitLabel
                      : '${row.limitLabel} · ${row.durationLabel}',
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (row.updatedAt.isNotEmpty)
                Text(
                  row.updatedAt,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
            ],
          ),
        ],
      ),
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
          const CommonSpinner(size: CommonControlSize.lg),
          SizedBox(width: TS.spacing.smPlus),
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
          padding: EdgeInsets.all(TS.spacing.lg),
          decoration: BoxDecoration(
            color: TS.colors.errorSoft,
            borderRadius: BorderRadius.circular(TS.radius.lg),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.warning_amber_rounded,
                  size: TS.sizing.iconLg * 1.4, color: TS.colors.error),
              SizedBox(height: TS.spacing.sm),
              Text(
                '监控数据暂时不可用',
                style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: TS.spacing.xs),
              Text(
                '最后一次成功同步为 14:28，请检查连接后重试。',
                style: TS.textStyle.content.copyWith(color: TS.colors.error),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: TS.spacing.md),
              CommonButton(
                label: '重新加载',
                variant: CommonButtonVariant.flat,
                tone: CommonButtonTone.primary,
                size: CommonControlSize.md,
                onPressed: onRetry,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
