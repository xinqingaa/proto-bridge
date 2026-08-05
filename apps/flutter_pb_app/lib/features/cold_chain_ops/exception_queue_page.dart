import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.exception-queue`
class ExceptionQueuePage extends StatefulWidget {
  const ExceptionQueuePage({
    super.key,
    this.variant = 'default',
  });

  final String variant;

  static ExceptionQueuePage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return ExceptionQueuePage(
      variant: map['variant']?.toString() ?? 'default',
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

  late String _pageVariant;
  late String _filter;
  String _query = '';
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _pageVariant = widget.variant;
    _filter = widget.variant == 'critical-only' ? 'critical' : 'all';
  }

  @override
  void didUpdateWidget(covariant ExceptionQueuePage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.variant != widget.variant) {
      setState(() {
        _pageVariant = widget.variant;
        _filter = widget.variant == 'critical-only' ? 'critical' : 'all';
        if (widget.variant != 'empty') {
          _query = '';
        }
      });
    }
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<ExceptionItem> get _visible {
    if (_pageVariant == 'empty') return const [];
    var rows = kExceptionItems;
    if (_filter == 'critical' || _pageVariant == 'critical-only') {
      rows = rows
          .where((e) => e.severity == ExceptionSeverity.critical)
          .toList();
    } else if (_filter == 'warning') {
      rows =
          rows.where((e) => e.severity == ExceptionSeverity.warning).toList();
    } else if (_filter == 'watch') {
      rows = rows.where((e) => e.severity == ExceptionSeverity.watch).toList();
    }
    final q = _query.trim();
    if (q.isEmpty) return rows;
    return rows
        .where(
          (e) =>
              e.codeLine.contains(q) ||
              e.route.contains(q) ||
              e.cargo.contains(q) ||
              e.shipmentId.contains(q),
        )
        .toList();
  }

  void _setFilter(String value) {
    setState(() {
      _filter = value;
      if (_pageVariant == 'empty' ||
          _pageVariant == 'critical-only' ||
          _pageVariant == 'default') {
        _pageVariant = value == 'critical' ? 'critical-only' : 'default';
      }
    });
  }

  void _showCriticalOnly() {
    setState(() {
      _filter = 'critical';
      _pageVariant = 'critical-only';
    });
  }

  void _openShipment(ExceptionItem item) {
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainShipmentDetail,
      arguments: <String, String>{
        'shipmentId': item.shipmentId,
        'variant': item.severity == ExceptionSeverity.critical
            ? 'active-excursion'
            : 'default',
      },
    );
  }

  Future<void> _reload() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    setState(() => _pageVariant = 'default');
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '冷链异常', showBack: true),
      body: switch (_pageVariant) {
        'loading' => const _LoadingBody(),
        'error' => _ErrorBody(onRetry: _reload),
        _ => _QueueBody(
            filter: _filter,
            searchController: _search,
            rows: _visible,
            onFilter: _setFilter,
            onShowCritical: _showCriticalOnly,
            onQuery: (value) => setState(() => _query = value),
            onOpen: _openShipment,
            onRefresh: _reload,
          ),
      },
    );
  }
}

class _LoadingBody extends StatelessWidget {
  const _LoadingBody();

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

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return ListView(
      padding: EdgeInsets.all(TS.spacing.md),
      children: [
        Container(
          padding: EdgeInsets.all(TS.spacing.lg),
          decoration: BoxDecoration(
            color: TS.colors.errorSoft,
            borderRadius: BorderRadius.circular(TS.radius.lg),
          ),
          child: Column(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: TS.colors.error,
                size: TS.sizing.iconLg,
              ),
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
                tone: CommonButtonTone.primary,
                onPressed: () => onRetry(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _QueueBody extends StatelessWidget {
  const _QueueBody({
    required this.filter,
    required this.searchController,
    required this.rows,
    required this.onFilter,
    required this.onShowCritical,
    required this.onQuery,
    required this.onOpen,
    required this.onRefresh,
  });

  final String filter;
  final TextEditingController searchController;
  final List<ExceptionItem> rows;
  final ValueChanged<String> onFilter;
  final VoidCallback onShowCritical;
  final ValueChanged<String> onQuery;
  final ValueChanged<ExceptionItem> onOpen;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final children = <Widget>[
      _RiskSummaryCard(onShowCritical: onShowCritical),
      Padding(
        padding: EdgeInsets.only(top: TS.spacing.md),
        child: CommonSearchBar(
          controller: searchController,
          hint: '搜索异常、运单或线路',
          onChanged: onQuery,
          onSubmitted: onQuery,
        ),
      ),
      Padding(
        padding: EdgeInsets.only(
          top: TS.spacing.smPlus,
          bottom: TS.spacing.sm,
        ),
        child: CommonFilterBar(
          items: _ExceptionQueuePageState._filters,
          selected: {filter},
          onSelected: onFilter,
        ),
      ),
      if (rows.isEmpty)
        CommonEmptyState(
          title: '没有待处理异常',
          description: '当前筛选范围内的运输温度全部正常。',
          icon: Icons.inventory_2_outlined,
          iconColor: TS.colors.primary,
          iconBackgroundColor: TS.colors.primarySoft,
        )
      else
        for (final item in rows)
          Padding(
            padding: EdgeInsets.only(bottom: TS.spacing.smPlus),
            child: _ExceptionCard(
              item: item,
              onTap: () => onOpen(item),
            ),
          ),
      Padding(
        padding: EdgeInsets.only(top: TS.spacing.xs, bottom: TS.spacing.md),
        child: Center(
          child: Text(
            '没有更多了',
            style: TS.textStyle.caption.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
        ),
      ),
    ];

    // Empty/error-adjacent states keep all children mounted so empty copy is
    // findable without relying on ListView.builder viewport caching.
    if (rows.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(
            TS.spacing.md,
            TS.spacing.md,
            TS.spacing.md,
            TS.spacing.lg,
          ),
          children: children,
        ),
      );
    }

    return CommonScrollableDataList(
      padding: EdgeInsets.fromLTRB(
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.lg,
      ),
      onRefresh: onRefresh,
      itemCount: children.length,
      itemBuilder: (context, index) => children[index],
    );
  }
}

class _RiskSummaryCard extends StatelessWidget {
  const _RiskSummaryCard({required this.onShowCritical});

  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      title: '当前风险',
      subtitle: '华东区域 · 14:35 更新',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          Align(
            alignment: Alignment.centerLeft,
            child: CommonButton(
              label: '仅看严重异常',
              variant: CommonButtonVariant.tonal,
              tone: CommonButtonTone.error,
              size: CommonControlSize.sm,
              onPressed: onShowCritical,
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
    this.emphasize = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final fg = emphasize ? TS.colors.error : TS.colors.onSurface;
    final muted = emphasize ? TS.colors.error : TS.colors.onSurfaceMuted;
    return Container(
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: emphasize ? TS.colors.errorSoft : TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: TS.sizing.iconMd, color: fg),
          SizedBox(height: TS.spacing.xs),
          Text(value, style: TS.textStyle.titleSm.copyWith(color: fg)),
          Text(label, style: TS.textStyle.caption.copyWith(color: muted)),
        ],
      ),
    );
  }
}

class _ExceptionCard extends StatelessWidget {
  const _ExceptionCard({required this.item, required this.onTap});

  final ExceptionItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final badgeTone = switch (item.severity) {
      ExceptionSeverity.critical => CommonBadgeTone.error,
      ExceptionSeverity.warning => CommonBadgeTone.warning,
      ExceptionSeverity.watch => CommonBadgeTone.secondary,
    };
    final tempColor = item.severity == ExceptionSeverity.critical
        ? TS.colors.error
        : TS.colors.onSurface;

    return CommonCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.codeLine,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ),
              CommonBadge(
                label: item.severityLabel,
                semanticTone: badgeTone,
              ),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Text(item.route, style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text(
            item.cargo,
            style: TS.textStyle.content.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
          SizedBox(height: TS.spacing.sm),
          CommonDivider(),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Icon(
                Icons.thermostat,
                size: TS.sizing.iconMd,
                color: tempColor,
              ),
              SizedBox(width: TS.spacing.xs),
              Text(
                '${item.temperatureC.toStringAsFixed(1)}°C',
                style: TS.textStyle.subtitle.copyWith(color: tempColor),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  item.durationLine,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ),
              Text(
                item.loggedAt,
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
