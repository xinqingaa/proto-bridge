import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'cold_chain_fixtures.dart';
import 'cold_chain_models.dart';
import 'cold_chain_providers.dart';

class ExceptionQueuePage extends ConsumerStatefulWidget {
  const ExceptionQueuePage({super.key, this.variantId = 'default'});

  final String variantId;

  @override
  ConsumerState<ExceptionQueuePage> createState() => _ExceptionQueuePageState();
}

class _ExceptionQueuePageState extends ConsumerState<ExceptionQueuePage> {
  late final TextEditingController _search;

  @override
  void initState() {
    super.initState();
    _search = TextEditingController();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _openDetail(ColdChainException item) {
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainShipment,
      arguments: ShipmentDetailArgs(
        variantId: item.severity == ExceptionSeverity.critical
            ? 'active-excursion'
            : 'default',
        shipmentId: item.shipmentId,
      ),
    );
  }

  List<ColdChainException> _rowsForTab(
    String tabValue,
    ExceptionQueueState state,
  ) {
    if (state.variantId == 'empty') return const [];
    final severity = switch (tabValue) {
      'critical' => ExceptionSeverity.critical,
      'warning' => ExceptionSeverity.warning,
      'attention' => ExceptionSeverity.attention,
      _ => null,
    };
    final needle = state.query.trim().toLowerCase();
    return coldChainExceptions.where((item) {
      final matchesFilter = severity == null || item.severity == severity;
      final haystack =
          '${item.id} ${item.shipmentId} ${item.lane} ${item.cargo}'
              .toLowerCase();
      return matchesFilter && (needle.isEmpty || haystack.contains(needle));
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final state = ref.watch(exceptionQueueProvider(widget.variantId));

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '冷链异常'),
      body: switch (state.variantId) {
        'loading' => const Center(
          child: CommonSpinner(label: '正在同步运输监控数据', size: CommonControlSize.lg),
        ),
        'error' => _ErrorState(
          onRetry: () => ref
              .read(exceptionQueueProvider(widget.variantId).notifier)
              .retry(),
        ),
        _ => DefaultTabController(
          length: severityTabs.length,
          initialIndex: state.tabIndex,
          child: _QueueBody(
            familyKey: widget.variantId,
            search: _search,
            onOpen: _openDetail,
            rowsForTab: (tab) => _rowsForTab(tab, state),
            emptyTitle: state.emptyTitle,
            emptyDescription: state.emptyDescription,
          ),
        ),
      },
    );
  }
}

class _QueueBody extends ConsumerStatefulWidget {
  const _QueueBody({
    required this.familyKey,
    required this.search,
    required this.onOpen,
    required this.rowsForTab,
    required this.emptyTitle,
    required this.emptyDescription,
  });

  final String familyKey;
  final TextEditingController search;
  final ValueChanged<ColdChainException> onOpen;
  final List<ColdChainException> Function(String tabValue) rowsForTab;
  final String emptyTitle;
  final String emptyDescription;

  @override
  ConsumerState<_QueueBody> createState() => _QueueBodyState();
}

class _QueueBodyState extends ConsumerState<_QueueBody> {
  TabController? _tabs;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final next = DefaultTabController.of(context);
    if (!identical(_tabs, next)) {
      _tabs?.removeListener(_onTab);
      _tabs = next;
      _tabs!.addListener(_onTab);
    }
  }

  @override
  void dispose() {
    _tabs?.removeListener(_onTab);
    super.dispose();
  }

  void _onTab() {
    if (_tabs == null || _tabs!.indexIsChanging) return;
    ref
        .read(exceptionQueueProvider(widget.familyKey).notifier)
        .selectTab(severityTabs[_tabs!.index].value);
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final notifier = ref.read(
      exceptionQueueProvider(widget.familyKey).notifier,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            TS.spacing.md,
            TS.spacing.md,
            TS.spacing.md,
            0,
          ),
          child: Column(
            children: [
              _RiskCard(
                onShowCritical: () {
                  notifier.showCritical();
                  _tabs?.animateTo(1);
                },
              ),
              SizedBox(height: TS.spacing.smPlus),
              CommonSearchBar(
                controller: widget.search,
                hint: '搜索异常、运单或线路',
                onChanged: notifier.setQuery,
              ),
            ],
          ),
        ),
        SizedBox(height: TS.spacing.smPlus),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
          child: CommonPrimaryTabs(
            items: [
              for (final tab in severityTabs)
                CommonTabItem(value: tab.value, label: tab.label),
            ],
            grow: true,
          ),
        ),
        SizedBox(height: TS.spacing.smPlus),
        Expanded(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
            child: CommonTabView(
              children: [
                for (final tab in severityTabs)
                  _ExceptionList(
                    rows: widget.rowsForTab(tab.value),
                    emptyTitle: widget.emptyTitle,
                    emptyDescription: widget.emptyDescription,
                    onRefresh: widget.rowsForTab(tab.value).isEmpty
                        ? null
                        : notifier.refresh,
                    onOpen: widget.onOpen,
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _RiskCard extends StatelessWidget {
  const _RiskCard({required this.onShowCritical});

  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final criticalCount = coldChainExceptions
        .where((item) => item.severity == ExceptionSeverity.critical)
        .length;
    final unassignedCount = coldChainExceptions
        .where((item) => item.status == ExceptionStatus.unassigned)
        .length;
    final longest = coldChainExceptions
        .map((item) => item.durationMinutes)
        .reduce((a, b) => a > b ? a : b);
    return CommonCard(
      semanticRole: CommonCardSemanticRole.summary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('当前风险', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text('华东区域 · 14:35 更新', style: TS.textStyle.caption),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _Metric(
                  icon: CommonIconName.alertTriangle,
                  iconTone: CommonIconTone.error,
                  value: '$criticalCount',
                  label: '严重异常',
                  background: TS.colors.errorSoft,
                  foreground: TS.colors.error,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _Metric(
                  icon: CommonIconName.snowflake,
                  iconTone: CommonIconTone.warning,
                  value: '$unassignedCount',
                  label: '等待接手',
                  background: TS.colors.warningSoft,
                  foreground: TS.colors.warning,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: _Metric(
                  icon: CommonIconName.clock,
                  iconTone: CommonIconTone.onSurface,
                  value: '${longest}m',
                  label: '最长超温',
                  background: TS.colors.surfaceVariant,
                  foreground: TS.colors.onSurface,
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          CommonButton(
            key: ColdChainKeys.showCritical,
            label: '仅看严重异常',
            kind: CommonButtonKind.secondary,
            block: true,
            onPressed: onShowCritical,
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.icon,
    required this.iconTone,
    required this.value,
    required this.label,
    required this.background,
    required this.foreground,
  });

  final CommonIconName icon;
  final CommonIconTone iconTone;
  final String value;
  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        children: [
          CommonIcon(name: icon, size: CommonIconSize.md, tone: iconTone),
          SizedBox(height: TS.spacing.xxs),
          Text(value, style: TS.textStyle.subtitle.copyWith(color: foreground)),
          Text(
            label,
            style: TS.textStyle.caption.copyWith(color: foreground),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ExceptionList extends StatelessWidget {
  const _ExceptionList({
    required this.rows,
    required this.emptyTitle,
    required this.emptyDescription,
    required this.onOpen,
    this.onRefresh,
  });

  final List<ColdChainException> rows;
  final String emptyTitle;
  final String emptyDescription;
  final ValueChanged<ColdChainException> onOpen;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    if (rows.isEmpty) {
      return CommonScrollableDataList(
        itemCount: 1,
        itemBuilder: (context, index) =>
            CommonEmptyState(title: emptyTitle, description: emptyDescription),
      );
    }
    return CommonScrollableDataList(
      itemCount: rows.length,
      onRefresh: onRefresh,
      separatorBuilder: (context, index) => SizedBox(height: TS.spacing.smPlus),
      itemBuilder: (context, index) {
        final item = rows[index];
        return _ExceptionRow(item: item, onOpen: () => onOpen(item));
      },
    );
  }
}

class _ExceptionRow extends StatelessWidget {
  const _ExceptionRow({required this.item, required this.onOpen});

  final ColdChainException item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final tone = switch (item.severity) {
      ExceptionSeverity.critical => CommonBadgeTone.error,
      ExceptionSeverity.warning => CommonBadgeTone.warning,
      ExceptionSeverity.attention => CommonBadgeTone.primary,
    };
    final temperatureColor = item.severity == ExceptionSeverity.critical
        ? TS.colors.error
        : TS.colors.warning;
    return CommonCard(
      child: InkWell(
        key: item.id == 'ex-017' ? ColdChainKeys.primaryExceptionRow : null,
        onTap: onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.identityLabel,
                    style: TS.textStyle.captionStrong.copyWith(
                      color: TS.colors.onSurfaceMuted,
                    ),
                  ),
                ),
                CommonBadge(label: item.severityLabel, tone: tone),
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
              children: [
                const CommonIcon(
                  name: CommonIconName.thermometer,
                  size: CommonIconSize.sm,
                ),
                SizedBox(width: TS.spacing.xs),
                Text(
                  '${item.currentTemperature.toStringAsFixed(1)}°C',
                  style: TS.textStyle.titleSm.copyWith(color: temperatureColor),
                ),
                SizedBox(width: TS.spacing.sm),
                Expanded(
                  child: Text(
                    '上限 ${item.upperLimit.toStringAsFixed(0)}°C · 已持续 ${item.durationMinutes} 分钟',
                    style: TS.textStyle.caption,
                  ),
                ),
                Text(item.updatedAt, style: TS.textStyle.caption),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Container(
        padding: EdgeInsets.all(TS.spacing.md),
        decoration: BoxDecoration(
          color: TS.colors.errorSoft,
          borderRadius: BorderRadius.circular(TS.radius.lg),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CommonIcon(
              name: CommonIconName.alertTriangle,
              size: CommonIconSize.lg,
              tone: CommonIconTone.error,
            ),
            SizedBox(height: TS.spacing.sm),
            Text('监控数据暂时不可用', style: TS.textStyle.subtitle),
            SizedBox(height: TS.spacing.xs),
            Text(
              '最后一次成功同步为 14:28，请检查连接后重试。',
              style: TS.textStyle.content.copyWith(
                color: TS.colors.onSurfaceMuted,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: TS.spacing.md),
            CommonButton(label: '重新加载', onPressed: onRetry),
          ],
        ),
      ),
    );
  }
}
