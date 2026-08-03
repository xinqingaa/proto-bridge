import 'package:flutter/material.dart';

import '../../common/widgets/app_bar.dart';
import '../../common/widgets/button.dart';
import '../../common/widgets/empty_state.dart';
import '../../common/widgets/filter_bar.dart';
import '../../common/widgets/scrollable_data_list.dart';
import '../../common/widgets/search_bar.dart';
import '../../common/widgets/spinner.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'cold_chain_v3_models.dart';

/// Exception queue — Evidence screen `cold-chain-ops.exception-queue`.
class ColdChainV3ExceptionQueuePage extends StatefulWidget {
  const ColdChainV3ExceptionQueuePage({
    super.key,
    this.initialVariant = ColdChainV3QueueVariant.defaultList,
  });

  final ColdChainV3QueueVariant initialVariant;

  factory ColdChainV3ExceptionQueuePage.fromRouteArgs(Object? args) {
    if (args is Map && args['variant'] is String) {
      final raw = args['variant'] as String;
      final variant = ColdChainV3QueueVariant.values.firstWhere(
        (v) => v.name == raw,
        orElse: () => ColdChainV3QueueVariant.defaultList,
      );
      return ColdChainV3ExceptionQueuePage(initialVariant: variant);
    }
    return const ColdChainV3ExceptionQueuePage();
  }

  @override
  State<ColdChainV3ExceptionQueuePage> createState() =>
      _ColdChainV3ExceptionQueuePageState();
}

class _ColdChainV3ExceptionQueuePageState
    extends State<ColdChainV3ExceptionQueuePage> {
  static const _filters = [
    CommonFilterItem(value: 'all', label: '全部'),
    CommonFilterItem(value: 'critical', label: '严重'),
    CommonFilterItem(value: 'warning', label: '警告'),
    CommonFilterItem(value: 'watch', label: '关注'),
  ];

  late ColdChainV3QueueVariant _variant;
  String _filter = 'all';
  String _query = '';
  bool _criticalOnly = false;

  @override
  void initState() {
    super.initState();
    _variant = widget.initialVariant;
    if (_variant == ColdChainV3QueueVariant.criticalOnly) {
      _criticalOnly = true;
      _filter = 'critical';
    }
  }

  List<ColdChainV3Exception> get _visible {
    if (_variant == ColdChainV3QueueVariant.empty) return const [];
    var items = List<ColdChainV3Exception>.from(ColdChainV3Fixtures.exceptions);
    if (_criticalOnly || _filter == 'critical') {
      items = items
          .where((e) => e.severity == ColdChainV3Severity.critical)
          .toList();
    } else if (_filter == 'warning') {
      items = items
          .where((e) => e.severity == ColdChainV3Severity.warning)
          .toList();
    } else if (_filter == 'watch') {
      items =
          items.where((e) => e.severity == ColdChainV3Severity.watch).toList();
    }
    final q = _query.trim();
    if (q.isNotEmpty) {
      items = items
          .where(
            (e) =>
                e.identity.contains(q) ||
                e.lane.contains(q) ||
                e.cargo.contains(q) ||
                e.shipmentId.contains(q),
          )
          .toList();
    }
    return items;
  }

  Future<void> _onRefresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() {
      if (_variant == ColdChainV3QueueVariant.error ||
          _variant == ColdChainV3QueueVariant.loading) {
        _variant = ColdChainV3QueueVariant.defaultList;
      }
    });
  }

  void _openShipment(ColdChainV3Exception item) {
    final variant = item.severity == ColdChainV3Severity.critical
        ? ColdChainV3ShipmentVariant.activeExcursion
        : ColdChainV3ShipmentVariant.defaultDetail;
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainV3ShipmentDetail,
      arguments: {
        'variant': variant.name,
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
      appBar: const CommonAppBar(
        title: '冷链异常',
        elevated: false,
        centerTitle: false,
      ),
      body: switch (_variant) {
        ColdChainV3QueueVariant.loading => const _LoadingBody(),
        ColdChainV3QueueVariant.error => _ErrorBody(
            onRetry: () => setState(
              () => _variant = ColdChainV3QueueVariant.defaultList,
            ),
          ),
        _ => _QueueBody(
            items: _visible,
            filter: _filter,
            criticalOnly: _criticalOnly,
            onFilterSelected: (value) {
              setState(() {
                _filter = value;
                _criticalOnly = value == 'critical';
                if (_variant == ColdChainV3QueueVariant.empty &&
                    value == 'all' &&
                    !_criticalOnly) {
                  // keep empty until refresh/explicit reset via route
                }
              });
            },
            onCriticalOnly: () {
              setState(() {
                _criticalOnly = true;
                _filter = 'critical';
                if (_variant == ColdChainV3QueueVariant.empty) {
                  _variant = ColdChainV3QueueVariant.criticalOnly;
                } else {
                  _variant = ColdChainV3QueueVariant.criticalOnly;
                }
              });
            },
            onQueryChanged: (q) => setState(() => _query = q),
            onRefresh: _onRefresh,
            onOpen: _openShipment,
            forceEmpty: _variant == ColdChainV3QueueVariant.empty,
          ),
      },
    );
  }
}

class _LoadingBody extends StatelessWidget {
  const _LoadingBody();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CommonSpinner(
        size: CommonControlSize.lg,
        label: '正在同步运输监控数据',
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
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
            SizedBox(height: TS.spacing.md),
            Text('监控数据暂时不可用', style: TS.textStyle.subtitle),
            SizedBox(height: TS.spacing.sm),
            Text(
              '最后一次成功同步为 14:28，请检查连接后重试。',
              style: TS.textStyle.content.copyWith(
                color: TS.colors.onSurfaceMuted,
              ),
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
    );
  }
}

class _QueueBody extends StatelessWidget {
  const _QueueBody({
    required this.items,
    required this.filter,
    required this.criticalOnly,
    required this.onFilterSelected,
    required this.onCriticalOnly,
    required this.onQueryChanged,
    required this.onRefresh,
    required this.onOpen,
    required this.forceEmpty,
  });

  final List<ColdChainV3Exception> items;
  final String filter;
  final bool criticalOnly;
  final ValueChanged<String> onFilterSelected;
  final VoidCallback onCriticalOnly;
  final ValueChanged<String> onQueryChanged;
  final Future<void> Function() onRefresh;
  final ValueChanged<ColdChainV3Exception> onOpen;
  final bool forceEmpty;

  @override
  Widget build(BuildContext context) {
    final showEmpty = forceEmpty || items.isEmpty;
    // header slots: summary, search, filter, then rows or empty
    final trailingCount = showEmpty ? 1 : items.length;
    final itemCount = 3 + trailingCount;

    return CommonScrollableDataList(
      itemCount: itemCount,
      onRefresh: onRefresh,
      hasMore: false,
      onLoadMore: () async {},
      padding: EdgeInsets.all(TS.spacing.md),
      separatorBuilder: (context, index) {
        if (index < 2) return SizedBox(height: TS.spacing.md);
        if (index == 2) return SizedBox(height: TS.spacing.md);
        return SizedBox(height: TS.spacing.sm);
      },
      itemBuilder: (context, index) {
        if (index == 0) {
          return _RiskSummary(
            criticalOnly: criticalOnly,
            onCriticalOnly: onCriticalOnly,
          );
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
            items: _ColdChainV3ExceptionQueuePageState._filters,
            selected: {filter},
            onSelected: onFilterSelected,
          );
        }
        if (showEmpty) {
          return const CommonEmptyState(
            title: '没有待处理异常',
            description: '当前筛选范围内的运输温度全部正常。',
          );
        }
        final item = items[index - 3];
        return _ExceptionCard(item: item, onTap: () => onOpen(item));
      },
    );
  }
}

class _RiskSummary extends StatelessWidget {
  const _RiskSummary({
    required this.criticalOnly,
    required this.onCriticalOnly,
  });

  final bool criticalOnly;
  final VoidCallback onCriticalOnly;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('当前风险', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text(
            '华东区域 · 14:35 更新',
            style: TS.textStyle.caption,
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _MetricTile(
                  icon: Icons.warning_amber_rounded,
                  value: '2',
                  label: '严重异常',
                  emphasis: true,
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
          SizedBox(height: TS.spacing.md),
          Align(
            alignment: Alignment.centerLeft,
            child: Material(
              color: TS.colors.errorSoft,
              borderRadius: BorderRadius.circular(TS.radius.full),
              child: InkWell(
                onTap: onCriticalOnly,
                borderRadius: BorderRadius.circular(TS.radius.full),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: TS.spacing.smPlus,
                    vertical: TS.spacing.xs,
                  ),
                  child: Text(
                    '仅看严重异常',
                    style: TS.textStyle.captionStrong.copyWith(
                      color: TS.colors.error,
                    ),
                  ),
                ),
              ),
            ),
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
    this.emphasis = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool emphasis;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: emphasis ? TS.colors.errorSoft : TS.colors.secondarySoft,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: TS.sizing.iconMd,
            color: emphasis ? TS.colors.error : TS.colors.primary,
          ),
          SizedBox(height: TS.spacing.xs),
          Text(
            value,
            style: TS.textStyle.title.copyWith(
              color: emphasis ? TS.colors.error : TS.colors.onSurface,
            ),
          ),
          Text(label, style: TS.textStyle.caption),
        ],
      ),
    );
  }
}

class _ExceptionCard extends StatelessWidget {
  const _ExceptionCard({required this.item, required this.onTap});

  final ColdChainV3Exception item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tempColor = switch (item.severity) {
      ColdChainV3Severity.critical => TS.colors.error,
      ColdChainV3Severity.warning => TS.colors.warning,
      ColdChainV3Severity.watch => TS.colors.onSurface,
    };
    return Material(
      color: TS.colors.surface,
      borderRadius: BorderRadius.circular(TS.radius.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        child: Container(
          padding: EdgeInsets.all(TS.spacing.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(TS.radius.lg),
            border: Border.all(color: TS.colors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(item.identity, style: TS.textStyle.label),
                  ),
                  _SeverityPill(severity: item.severity),
                ],
              ),
              SizedBox(height: TS.spacing.sm),
              Text(item.lane, style: TS.textStyle.subtitle),
              SizedBox(height: TS.spacing.xxs),
              Text(item.cargo, style: TS.textStyle.caption),
              SizedBox(height: TS.spacing.sm),
              Divider(height: 1, color: TS.colors.divider),
              SizedBox(height: TS.spacing.sm),
              Row(
                children: [
                  Icon(
                    Icons.thermostat,
                    size: TS.sizing.iconSm,
                    color: tempColor,
                  ),
                  SizedBox(width: TS.spacing.xs),
                  Text(
                    '${item.temperature.toStringAsFixed(1)}°C',
                    style: TS.textStyle.label.copyWith(color: tempColor),
                  ),
                  SizedBox(width: TS.spacing.sm),
                  Expanded(
                    child: Text(
                      '上限 ${item.limit.toStringAsFixed(0)}°C · 已持续 ${item.durationMinutes} 分钟',
                      style: TS.textStyle.caption,
                    ),
                  ),
                  Text(item.updatedAt, style: TS.textStyle.caption),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SeverityPill extends StatelessWidget {
  const _SeverityPill({required this.severity});

  final ColdChainV3Severity severity;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (severity) {
      ColdChainV3Severity.critical => (TS.colors.error, TS.colors.onError),
      ColdChainV3Severity.warning => (TS.colors.warning, TS.colors.onSurface),
      ColdChainV3Severity.watch =>
        (TS.colors.secondarySoft, TS.colors.onSurface),
    };
    final label = switch (severity) {
      ColdChainV3Severity.critical => '严重',
      ColdChainV3Severity.warning => '警告',
      ColdChainV3Severity.watch => '关注',
    };
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: TS.spacing.sm,
        vertical: TS.spacing.xxs,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(TS.radius.full),
      ),
      child: Text(
        label,
        style: TS.textStyle.captionStrong.copyWith(color: fg),
      ),
    );
  }
}
