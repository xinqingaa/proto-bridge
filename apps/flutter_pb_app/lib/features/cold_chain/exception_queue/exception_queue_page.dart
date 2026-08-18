import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../common/widgets.dart';
import '../../../theme/ts.dart';
import 'exception_queue_model.dart';
import 'exception_queue_notifier.dart';

/// 固定 Handoff 的「冷链异常」Screen。
///
/// 筛选、搜索及状态壳由 Riverpod 管理；TabController 仅承载 Flutter 的局部动画。
class ExceptionQueuePage extends ConsumerStatefulWidget {
  const ExceptionQueuePage({super.key});

  @override
  ConsumerState<ExceptionQueuePage> createState() => _ExceptionQueuePageState();
}

class _ExceptionQueuePageState extends ConsumerState<ExceptionQueuePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(
      length: ExceptionQueueFilter.values.length,
      vsync: this,
    );
    _tabs.addListener(_syncFilter);
  }

  @override
  void dispose() {
    _tabs
      ..removeListener(_syncFilter)
      ..dispose();
    super.dispose();
  }

  void _syncFilter() {
    if (_tabs.indexIsChanging) return;
    ref
        .read(exceptionQueueProvider.notifier)
        .selectFilter(ExceptionQueueFilter.values[_tabs.index]);
  }

  void _showCritical() {
    _tabs.animateTo(ExceptionQueueFilter.critical.index);
    ref
        .read(exceptionQueueProvider.notifier)
        .selectFilter(ExceptionQueueFilter.critical);
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final state = ref.watch(exceptionQueueProvider);

    return Scaffold(
      appBar: const CommonAppBar(title: '冷链异常'),
      body: switch (state.status) {
        ExceptionQueueStatus.loading => const Center(
          child: CommonSpinner(label: '正在同步运输监控数据'),
        ),
        ExceptionQueueStatus.empty => const CommonEmptyState(
          title: '没有待处理异常',
          description: '当前筛选范围内的运输温度全部正常。',
          icon: CommonIconName.shieldCheck,
        ),
        ExceptionQueueStatus.error => CommonEmptyState(
          title: '监控数据暂时不可用',
          description: '最后一次成功同步为 14:28，请检查连接后重试。',
          icon: CommonIconName.alertCircle,
          actionLabel: '重新加载',
          onAction: ref.read(exceptionQueueProvider.notifier).reload,
        ),
        ExceptionQueueStatus.content => _ExceptionQueueContent(
          state: state,
          controller: _tabs,
          onShowCritical: _showCritical,
        ),
      },
    );
  }
}

class _ExceptionQueueContent extends ConsumerWidget {
  const _ExceptionQueueContent({
    required this.state,
    required this.controller,
    required this.onShowCritical,
  });

  final ExceptionQueueState state;
  final TabController controller;
  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = coldChainExceptions.where((item) {
      final filterMatches = switch (state.filter) {
        ExceptionQueueFilter.all => true,
        ExceptionQueueFilter.critical =>
          item.severity == ColdChainExceptionSeverity.critical,
        ExceptionQueueFilter.warning =>
          item.severity == ColdChainExceptionSeverity.warning,
        ExceptionQueueFilter.attention =>
          item.severity == ColdChainExceptionSeverity.attention,
      };
      return filterMatches && item.matches(state.query);
    }).toList();

    return CommonScrollableDataList(
      padding: EdgeInsets.all(TS.spacing.md),
      onRefresh: () async => ref.read(exceptionQueueProvider.notifier).reload(),
      itemCount: items.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: EdgeInsets.only(bottom: TS.spacing.md),
            child: _QueueHeader(
              controller: controller,
              onShowCritical: onShowCritical,
            ),
          );
        }
        return Padding(
          padding: EdgeInsets.only(bottom: TS.spacing.smPlus),
          child: _ExceptionCard(item: items[index - 1]),
        );
      },
    );
  }
}

class _QueueHeader extends ConsumerWidget {
  const _QueueHeader({required this.controller, required this.onShowCritical});

  final TabController controller;
  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CommonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('当前风险', style: TS.textStyle.titleSm),
              SizedBox(height: TS.spacing.xs),
              Text('华东区域 · 14:35 更新', style: TS.textStyle.caption),
              SizedBox(height: TS.spacing.md),
              Row(
                children: const [
                  Expanded(
                    child: _RiskMetric(value: '2', label: '严重异常'),
                  ),
                  Expanded(
                    child: _RiskMetric(value: '2', label: '等待接手'),
                  ),
                  Expanded(
                    child: _RiskMetric(value: '47m', label: '最长超温'),
                  ),
                ],
              ),
              SizedBox(height: TS.spacing.md),
              CommonButton(
                label: '仅看严重异常',
                kind: CommonButtonKind.secondary,
                block: true,
                onPressed: onShowCritical,
              ),
            ],
          ),
        ),
        SizedBox(height: TS.spacing.md),
        CommonSearchBar(
          key: const ValueKey('cold-chain-exception-search'),
          hint: '搜索异常、运单或线路',
          onChanged: ref.read(exceptionQueueProvider.notifier).setQuery,
        ),
        SizedBox(height: TS.spacing.md),
        CommonPrimaryTabs(
          controller: controller,
          grow: true,
          items: const [
            CommonTabItem(value: 'all', label: '全部'),
            CommonTabItem(value: 'critical', label: '严重'),
            CommonTabItem(value: 'warning', label: '警告'),
            CommonTabItem(value: 'attention', label: '关注'),
          ],
        ),
        SizedBox(height: TS.spacing.md),
      ],
    );
  }
}

class _RiskMetric extends StatelessWidget {
  const _RiskMetric({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: TS.textStyle.title),
        SizedBox(height: TS.spacing.xxs),
        Text(label, style: TS.textStyle.caption),
      ],
    );
  }
}

class _ExceptionCard extends StatelessWidget {
  const _ExceptionCard({required this.item});

  final ColdChainException item;

  @override
  Widget build(BuildContext context) {
    final badge = switch (item.severity) {
      ColdChainExceptionSeverity.critical => ('严重', CommonBadgeTone.error),
      ColdChainExceptionSeverity.warning => ('警告', CommonBadgeTone.warning),
      ColdChainExceptionSeverity.attention => ('关注', CommonBadgeTone.primary),
    };

    return CommonCard(
      key: ValueKey('cold-chain-exception-${item.exceptionId}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${item.exceptionId} · ${item.shipmentId}',
                  style: TS.textStyle.label,
                ),
              ),
              CommonBadge(label: badge.$1, tone: badge.$2),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Text(item.route, style: TS.textStyle.content),
          SizedBox(height: TS.spacing.xxs),
          Text(item.cargo, style: TS.textStyle.caption),
          SizedBox(height: TS.spacing.smPlus),
          Row(
            children: [
              const CommonIcon(
                name: CommonIconName.thermometer,
                size: CommonIconSize.sm,
                tone: CommonIconTone.error,
              ),
              SizedBox(width: TS.spacing.xs),
              Expanded(
                child: Text(
                  item.temperatureStatus,
                  style: TS.textStyle.captionStrong,
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
