import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'models.dart';

class V6ExceptionQueuePage extends StatefulWidget {
  const V6ExceptionQueuePage({
    super.key,
    this.initialMode = V6QueueMode.defaultState,
  });

  final V6QueueMode initialMode;

  factory V6ExceptionQueuePage.fromRouteArgs(Object? args) {
    return V6ExceptionQueuePage(initialMode: V6QueueModeParsing.fromArgs(args));
  }

  @override
  State<V6ExceptionQueuePage> createState() => _V6ExceptionQueuePageState();
}

class _V6ExceptionQueuePageState extends State<V6ExceptionQueuePage> {
  late V6QueueMode _mode;
  late Set<String> _selectedFilters;
  final TextEditingController _searchController = TextEditingController();

  static const _filters = [
    CommonFilterItem(value: 'all', label: '全部'),
    CommonFilterItem(value: 'critical', label: '严重'),
    CommonFilterItem(value: 'warning', label: '警告'),
    CommonFilterItem(value: 'watch', label: '关注'),
  ];

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    _selectedFilters = {
      widget.initialMode == V6QueueMode.criticalOnly ? 'critical' : 'all',
    };
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<V6ExceptionItem> get _visibleItems {
    if (_mode == V6QueueMode.empty) return const [];

    final query = _searchController.text.trim().toLowerCase();
    final filter = _selectedFilters.single;
    return v6ExceptionItems.where((item) {
      final matchesFilter = switch (filter) {
        'critical' => item.isCritical,
        'warning' => !item.isCritical,
        _ => true,
      };
      if (!matchesFilter) return false;
      if (query.isEmpty) return true;
      return [
        item.key,
        item.shipmentId,
        item.route,
        item.cargo,
      ].join(' ').toLowerCase().contains(query);
    }).toList();
  }

  void _selectFilter(String value) {
    setState(() {
      _selectedFilters = {value};
      _mode = value == 'critical'
          ? V6QueueMode.criticalOnly
          : V6QueueMode.defaultState;
    });
  }

  void _reload() {
    setState(() {
      _mode = V6QueueMode.defaultState;
      _selectedFilters = {'all'};
      _searchController.clear();
    });
  }

  void _openShipment(V6ExceptionItem item) {
    Navigator.of(context).pushNamed(
      AppRoutes.v6ShipmentDetail,
      arguments: {
        'shipmentId': item.shipmentId,
        'variant': item.key == 'ex-017' ? 'active-excursion' : 'default',
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '冷链异常', elevated: false),
      body: Column(
        children: [
          if (_mode != V6QueueMode.loading && _mode != V6QueueMode.error)
            _buildToolbar(),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildToolbar() {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _RiskSummary(onShowCritical: () => _selectFilter('critical')),
          SizedBox(height: TS.spacing.sm),
          CommonSearchBar(
            controller: _searchController,
            hint: '搜索异常、运单或线路',
            onChanged: (_) => setState(() {}),
          ),
          SizedBox(height: TS.spacing.sm),
          CommonFilterBar(
            items: _filters,
            selected: _selectedFilters,
            onSelected: _selectFilter,
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_mode) {
      case V6QueueMode.loading:
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
      case V6QueueMode.error:
        return SingleChildScrollView(
          padding: EdgeInsets.all(TS.spacing.md),
          child: _ErrorPanel(onReload: _reload),
        );
      case V6QueueMode.defaultState:
      case V6QueueMode.criticalOnly:
      case V6QueueMode.empty:
        final rows = _visibleItems;
        return CommonScrollableDataList(
          padding: EdgeInsets.fromLTRB(
            TS.spacing.md,
            0,
            TS.spacing.md,
            TS.spacing.md,
          ),
          itemCount: rows.isEmpty ? 1 : rows.length,
          onRefresh: () async {},
          onLoadMore: () async {},
          itemBuilder: (context, index) {
            if (rows.isEmpty) {
              return SizedBox(
                height: 280,
                child: CommonEmptyState(
                  title: '没有待处理异常',
                  description: '当前筛选范围内的运输温度全部正常。',
                  icon: Icons.inventory_2_outlined,
                  iconColor: TS.colors.primary,
                  iconBackgroundColor: TS.colors.primarySoft,
                ),
              );
            }
            final item = rows[index];
            return _ExceptionRow(item: item, onTap: () => _openShipment(item));
          },
          separatorBuilder: (_, _) => SizedBox(height: TS.spacing.smPlus),
        );
    }
  }
}

class _RiskSummary extends StatelessWidget {
  const _RiskSummary({required this.onShowCritical});

  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('当前风险', style: TS.textStyle.titleSm),
          SizedBox(height: TS.spacing.xs),
          Text(
            '华东区域 · 14:35 更新',
            style: TS.textStyle.content.copyWith(
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
                  color: TS.colors.error,
                  background: TS.colors.errorSoft,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _MetricTile(
                  icon: Icons.ac_unit,
                  value: '2',
                  label: '等待接手',
                  color: TS.colors.onSurface,
                  background: TS.colors.surfaceVariant,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _MetricTile(
                  icon: Icons.schedule_outlined,
                  value: '47m',
                  label: '最长超温',
                  color: TS.colors.onSurface,
                  background: TS.colors.surfaceVariant,
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          CommonButton(
            label: '仅看严重异常',
            variant: CommonButtonVariant.tonal,
            tone: CommonButtonTone.error,
            size: CommonControlSize.sm,
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
    required this.color,
    required this.background,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: TS.spacing.sm,
        vertical: TS.spacing.smPlus,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: TS.sizing.iconMd, color: color),
              SizedBox(width: TS.spacing.xs),
              Flexible(
                child: Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.clip,
                  style: TS.textStyle.title.copyWith(color: color),
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.xs),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TS.textStyle.caption.copyWith(
              color: TS.colors.onSurfaceMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ExceptionRow extends StatelessWidget {
  const _ExceptionRow({required this.item, required this.onTap});

  final V6ExceptionItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final severityColor = item.isCritical ? TS.colors.error : TS.colors.warning;

    return CommonCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(item.shipmentId, style: TS.textStyle.titleSm),
              ),
              CommonBadge(
                label: item.isCritical ? '严重' : '警告',
                semanticTone: item.isCritical
                    ? CommonBadgeTone.error
                    : CommonBadgeTone.warning,
              ),
            ],
          ),
          SizedBox(height: TS.spacing.xs),
          Text(item.route, style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xs),
          Text(item.cargo, style: TS.textStyle.content),
          SizedBox(height: TS.spacing.sm),
          Divider(height: 1, color: TS.colors.divider),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Icon(
                Icons.thermostat_outlined,
                size: TS.sizing.iconMd,
                color: TS.colors.onSurfaceMuted,
              ),
              SizedBox(width: TS.spacing.sm),
              Text(
                item.temperature,
                style: TS.textStyle.label.copyWith(color: severityColor),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  '${item.limit} · ${item.duration}',
                  style: TS.textStyle.caption,
                ),
              ),
              Text(item.updatedAt, style: TS.textStyle.caption),
            ],
          ),
        ],
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.onReload});

  final VoidCallback onReload;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.lg),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Column(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            size: TS.sizing.iconLg + TS.spacing.sm,
            color: TS.colors.error,
          ),
          SizedBox(height: TS.spacing.md),
          Text(
            '监控数据暂时不可用',
            style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: TS.spacing.sm),
          Text(
            '最后一次成功同步为 14:28，请检查连接后重试。',
            style: TS.textStyle.bodyLg.copyWith(color: TS.colors.error),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: TS.spacing.md),
          CommonButton(
            label: '重新加载',
            tone: CommonButtonTone.primary,
            onPressed: onReload,
          ),
        ],
      ),
    );
  }
}
