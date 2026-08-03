import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'fixtures.dart';
import 'models.dart';

class EvidenceExceptionQueuePage extends StatefulWidget {
  const EvidenceExceptionQueuePage({
    super.key,
    this.initialVariant = EvidenceQueueVariant.defaultView,
  });

  factory EvidenceExceptionQueuePage.fromRouteArgs(Object? arguments) {
    final args = arguments is Map ? arguments : const <Object?, Object?>{};
    return EvidenceExceptionQueuePage(
      initialVariant: queueVariantFrom(args['variant']),
    );
  }

  final EvidenceQueueVariant initialVariant;

  @override
  State<EvidenceExceptionQueuePage> createState() =>
      _EvidenceExceptionQueuePageState();
}

class _EvidenceExceptionQueuePageState
    extends State<EvidenceExceptionQueuePage> {
  late EvidenceQueueVariant _variant = widget.initialVariant;
  String _query = '';
  String _filter = 'all';

  List<ExceptionItem> get _visibleItems {
    Iterable<ExceptionItem> values = evidenceExceptions;
    if (_variant == EvidenceQueueVariant.criticalOnly ||
        _filter == 'critical') {
      values = values.where(
        (item) => item.severity == ExceptionSeverity.critical,
      );
    } else if (_filter == 'warning') {
      values = values.where(
        (item) => item.severity == ExceptionSeverity.warning,
      );
    } else if (_filter == 'watch') {
      values = values.where((item) => item.severity == ExceptionSeverity.watch);
    }
    final query = _query.trim().toLowerCase();
    if (query.isNotEmpty) {
      values = values.where((item) {
        return '${item.exceptionId} ${item.shipmentId} ${item.lane}'
            .toLowerCase()
            .contains(query);
      });
    }
    return values.toList(growable: false);
  }

  Future<void> _refresh() async {
    await Future<void>.delayed(TS.motion.durationNormal);
    if (mounted) setState(() {});
  }

  Future<void> _retry() async {
    setState(() => _variant = EvidenceQueueVariant.loading);
    await Future<void>.delayed(TS.motion.durationSlow);
    if (!mounted) return;
    setState(() {
      _variant = EvidenceQueueVariant.defaultView;
      _filter = 'all';
    });
  }

  void _showCritical() {
    setState(() {
      _variant = EvidenceQueueVariant.criticalOnly;
      _filter = 'critical';
    });
  }

  void _openPrimary(ExceptionItem item) {
    Navigator.of(context).pushNamed(
      AppRoutes.evidence20260803ShipmentDetail,
      arguments: {
        'shipment': item.shipmentId,
        'variant': item.exceptionId == 'EX-017'
            ? 'active-excursion'
            : 'default',
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    if (_variant == EvidenceQueueVariant.loading) {
      return const Scaffold(
        body: Align(
          alignment: Alignment(0, 0.72),
          child: CommonSpinner(label: '正在同步运输监控数据'),
        ),
      );
    }
    if (_variant == EvidenceQueueVariant.empty) {
      return Scaffold(
        body: Column(
          children: [
            Expanded(
              child: CommonEmptyState(
                title: '没有待处理异常',
                description: '当前筛选范围内的运输温度全部正常。',
                icon: Icons.inbox_outlined,
                iconColor: TS.colors.primary,
                iconBackgroundColor: TS.colors.primarySoft,
              ),
            ),
            Padding(
              padding: EdgeInsets.only(bottom: TS.spacing.xxl),
              child: Text('没有更多了', style: TS.textStyle.caption),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: const CommonAppBar(title: '冷链异常', centerTitle: false),
      body: _variant == EvidenceQueueVariant.error
          ? _ErrorState(onRetry: _retry)
          : _QueueContent(
              items: _visibleItems,
              criticalOnly: _variant == EvidenceQueueVariant.criticalOnly,
              selectedFilter: _filter,
              onFilterSelected: (value) {
                setState(() {
                  _filter = value;
                  _variant = value == 'critical'
                      ? EvidenceQueueVariant.criticalOnly
                      : EvidenceQueueVariant.defaultView;
                });
              },
              onSearch: (value) => setState(() => _query = value),
              onShowCritical: _showCritical,
              onRefresh: _refresh,
              onOpen: _openPrimary,
            ),
    );
  }
}

class _QueueContent extends StatelessWidget {
  const _QueueContent({
    required this.items,
    required this.criticalOnly,
    required this.selectedFilter,
    required this.onFilterSelected,
    required this.onSearch,
    required this.onShowCritical,
    required this.onRefresh,
    required this.onOpen,
  });

  final List<ExceptionItem> items;
  final bool criticalOnly;
  final String selectedFilter;
  final ValueChanged<String> onFilterSelected;
  final ValueChanged<String> onSearch;
  final VoidCallback onShowCritical;
  final Future<void> Function() onRefresh;
  final ValueChanged<ExceptionItem> onOpen;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        TS.spacing.md,
        TS.spacing.md,
        TS.spacing.md,
        0,
      ),
      child: Column(
        children: [
          CommonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('当前风险', style: TS.textStyle.title),
                SizedBox(height: TS.spacing.xxs),
                Text('华东区域 · 14:35 更新', style: TS.textStyle.caption),
                SizedBox(height: TS.spacing.md),
                Row(
                  children: [
                    Expanded(
                      child: _RiskMetric(
                        value: '2',
                        label: '严重异常',
                        icon: Icons.warning_amber_rounded,
                        color: TS.colors.error,
                        background: TS.colors.errorSoft,
                      ),
                    ),
                    SizedBox(width: TS.spacing.sm),
                    Expanded(
                      child: _RiskMetric(
                        value: '2',
                        label: '等待接手',
                        icon: Icons.ac_unit,
                      ),
                    ),
                    SizedBox(width: TS.spacing.sm),
                    Expanded(
                      child: _RiskMetric(
                        value: '47m',
                        label: '最长超温',
                        icon: Icons.schedule,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: TS.spacing.smPlus),
                CommonButton(
                  label: '仅看严重异常',
                  size: CommonControlSize.sm,
                  variant: CommonButtonVariant.tonal,
                  tone: CommonButtonTone.error,
                  onPressed: onShowCritical,
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonSearchBar(
            hint: '搜索异常、运单或线路',
            onChanged: onSearch,
            onClear: () => onSearch(''),
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonFilterBar(
            items: const [
              CommonFilterItem(value: 'all', label: '全部'),
              CommonFilterItem(value: 'critical', label: '严重'),
              CommonFilterItem(value: 'warning', label: '警告'),
              CommonFilterItem(value: 'watch', label: '关注'),
            ],
            selected: {criticalOnly ? 'critical' : selectedFilter},
            onSelected: onFilterSelected,
            itemRadius: TS.radius.sm,
          ),
          SizedBox(height: TS.spacing.sm),
          Expanded(
            child: CommonScrollableDataList(
              itemCount: items.length + 1,
              onRefresh: onRefresh,
              padding: EdgeInsets.only(bottom: TS.spacing.lg),
              separatorBuilder: (_, index) => index < items.length - 1
                  ? SizedBox(height: TS.spacing.smPlus)
                  : const SizedBox.shrink(),
              itemBuilder: (context, index) {
                if (index == items.length) {
                  return Padding(
                    padding: EdgeInsets.all(TS.spacing.lg),
                    child: Center(
                      child: Text('没有更多了', style: TS.textStyle.caption),
                    ),
                  );
                }
                final item = items[index];
                return _ExceptionRow(item: item, onTap: () => onOpen(item));
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RiskMetric extends StatelessWidget {
  const _RiskMetric({
    required this.value,
    required this.label,
    required this.icon,
    this.color,
    this.background,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color? color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final foreground = color ?? TS.colors.onSurface;
    return Container(
      height: 76,
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: background ?? TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: TS.sizing.iconMd, color: foreground),
              SizedBox(width: TS.spacing.xs),
              Text(
                value,
                style: TS.textStyle.title.copyWith(color: foreground),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.xs),
          Text(label, style: TS.textStyle.caption),
        ],
      ),
    );
  }
}

class _ExceptionRow extends StatelessWidget {
  const _ExceptionRow({required this.item, required this.onTap});

  final ExceptionItem item;
  final VoidCallback onTap;

  String get _severityLabel => switch (item.severity) {
    ExceptionSeverity.critical => '严重',
    ExceptionSeverity.warning => '警告',
    ExceptionSeverity.watch => '关注',
  };

  CommonBadgeTone get _badgeTone => switch (item.severity) {
    ExceptionSeverity.critical => CommonBadgeTone.error,
    ExceptionSeverity.warning => CommonBadgeTone.warning,
    ExceptionSeverity.watch => CommonBadgeTone.primary,
  };

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${item.exceptionId} · ${item.shipmentId}',
                  style: TS.textStyle.content,
                ),
              ),
              CommonBadge(label: _severityLabel, semanticTone: _badgeTone),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Text(item.lane, style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xs),
          Text(item.cargo, style: TS.textStyle.content),
          SizedBox(height: TS.spacing.sm),
          CommonDivider(),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Icon(
                Icons.thermostat,
                size: TS.sizing.iconMd,
                color: TS.colors.onSurfaceMuted,
              ),
              SizedBox(width: TS.spacing.xs),
              Text(
                item.temperature,
                style: TS.textStyle.titleSm.copyWith(
                  color: item.severity == ExceptionSeverity.watch
                      ? TS.colors.onSurface
                      : TS.colors.error,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(child: Text(item.duration, style: TS.textStyle.caption)),
              Text(item.updatedAt, style: TS.textStyle.caption),
            ],
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.symmetric(
          horizontal: TS.spacing.lg,
          vertical: TS.spacing.xl,
        ),
        decoration: BoxDecoration(
          color: TS.colors.errorSoft,
          borderRadius: BorderRadius.circular(TS.radius.lg),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber_rounded, color: TS.colors.error),
            SizedBox(height: TS.spacing.md),
            Text(
              '监控数据暂时不可用',
              style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
            ),
            SizedBox(height: TS.spacing.sm),
            Text(
              '最后一次成功同步为 14:28，请检查连接后重试。',
              style: TS.textStyle.content.copyWith(color: TS.colors.error),
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
