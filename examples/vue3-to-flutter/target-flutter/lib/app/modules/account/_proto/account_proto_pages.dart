// ignore_for_file: prefer_interpolation_to_compose_strings

import 'package:flutter/material.dart';

import '../../../common/widgets/common_app_bar.dart';
import '../../../common/widgets/common_button.dart';
import '../../../common/widgets/common_empty.dart';
import '../../../common/widgets/common_loading.dart';
import '../../../common/widgets/section_panel.dart';
import '../../../preferences/app_preferences_cubit.dart';
import '../../../routes/app_routes.dart';
import '../../../theme/app_tokens.dart';
import '../../../theme/theme_service.dart';
import 'account_proto_models.dart';
import 'account_proto_repository.dart';
import 'account_proto_widgets.dart';

class ProtoHoldingListPage extends StatefulWidget {
  const ProtoHoldingListPage({super.key});

  @override
  State<ProtoHoldingListPage> createState() => _ProtoHoldingListPageState();
}

class _ProtoHoldingListPageState extends State<ProtoHoldingListPage> {
  static const filters = [
    ProtoFilterOption(value: 'All', labelKey: 'filter.all'),
    ProtoFilterOption(value: 'Semiconductor', labelKey: 'sector.semiconductor'),
    ProtoFilterOption(
        value: 'Consumer Electronics', labelKey: 'sector.consumer'),
    ProtoFilterOption(value: 'EV', labelKey: 'sector.ev'),
  ];

  final repository = const ProtoAccountRepository();
  late final summary = repository.loadSummary();
  late final holdings = repository.loadHoldings();
  var selectedFilter = 'All';
  var loading = false;

  List<ProtoHolding> get filteredHoldings {
    if (selectedFilter == 'All') return holdings;
    return holdings.where((item) => item.sector == selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CommonAppBar(
        title: context.t('asset.holdings.title'),
        eyebrow: context.t('app.brand'),
        leading: IconButton.filledTonal(
          icon: const Icon(Icons.chevron_left),
          onPressed: () => Navigator.of(context)
              .pushNamedAndRemoveUntil(Routes.home, (_) => false),
        ),
        action: IconButton.filledTonal(
          icon: const Icon(Icons.refresh),
          onPressed: _refresh,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.lg,
        ),
        children: [
          ProtoSummaryCard(summary: summary),
          const SizedBox(height: AppSpacing.md),
          ProtoFilterBar(
            options: filters,
            selected: selectedFilter,
            onSelected: (value) => setState(() => selectedFilter = value),
          ),
          const SizedBox(height: AppSpacing.md),
          SectionPanel(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      context.t('asset.holdings.positions'),
                      style: context.pbTextStyles.sectionTitle,
                    ),
                    const Spacer(),
                    Text(
                      filteredHoldings.length.toString() +
                          ' ' +
                          context.t('asset.holdings.items'),
                      style: TextStyle(
                        color: context.pbColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                if (loading)
                  CommonLoading(message: context.t('asset.holdings.loading'))
                else if (filteredHoldings.isEmpty)
                  CommonEmpty(message: context.t('asset.holdings.empty'))
                else
                  ...filteredHoldings
                      .map((holding) => ProtoHoldingTile(holding: holding)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: CommonButton(
                  label: context.t('asset.action.analysis'),
                  onPressed: () =>
                      Navigator.of(context).pushNamed(Routes.pnlAnalysis),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: CommonButton(
                  label: context.t('asset.action.rebalance'),
                  primary: true,
                  onPressed: () {},
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _refresh() async {
    setState(() => loading = true);
    await Future<void>.delayed(const Duration(milliseconds: 240));
    if (mounted) setState(() => loading = false);
  }
}

class ProtoPnlAnalysisPage extends StatefulWidget {
  const ProtoPnlAnalysisPage({super.key});

  @override
  State<ProtoPnlAnalysisPage> createState() => _ProtoPnlAnalysisPageState();
}

class _ProtoPnlAnalysisPageState extends State<ProtoPnlAnalysisPage> {
  static const riskOptions = [
    ProtoFilterOption(value: 'All', labelKey: 'risk.all'),
    ProtoFilterOption(value: 'Low', labelKey: 'risk.low'),
    ProtoFilterOption(value: 'Medium', labelKey: 'risk.medium'),
    ProtoFilterOption(value: 'High', labelKey: 'risk.high'),
  ];

  final repository = const ProtoAccountRepository();
  late final metrics = repository.loadMetrics();
  late final records = repository.loadRecords();
  late final trendPoints = repository.loadTrendPoints();
  late final realizedBreakdown = repository.loadRealizedBreakdown();
  late final exposureItems = repository.loadExposureItems();
  var activeTab = 'overview';
  var riskFilter = 'All';
  var loading = false;

  List<ProtoPnlRecord> get filteredRecords {
    if (riskFilter == 'All') return records;
    return records.where((item) => item.risk == riskFilter).toList();
  }

  List<ProtoPnlRecord> get realizedRecords {
    return records.where((record) => record.isPositive).toList();
  }

  @override
  Widget build(BuildContext context) {
    final tabs = {
      'overview': context.t('pnl.tab.overview'),
      'realized': context.t('pnl.tab.realized'),
      'risk': context.t('pnl.tab.risk'),
    };
    return Scaffold(
      appBar: CommonAppBar(
        title: context.t('asset.pnl.title'),
        eyebrow: context.t('app.brand'),
        leading: IconButton.filledTonal(
          icon: const Icon(Icons.chevron_left),
          onPressed: () => Navigator.of(context)
              .pushNamedAndRemoveUntil(Routes.home, (_) => false),
        ),
        action: IconButton.filledTonal(
          icon: const Icon(Icons.tune),
          onPressed: _showRiskFilterSheet,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.lg,
        ),
        children: [
          _TabBar(
            tabs: tabs,
            selected: activeTab,
            onSelected: (value) {
              setState(() {
                activeTab = value;
                if (value == 'risk') riskFilter = 'High';
              });
            },
          ),
          const SizedBox(height: AppSpacing.md),
          if (activeTab == 'overview') ..._buildOverview(context),
          if (activeTab == 'realized') ..._buildRealized(context),
          if (activeTab == 'risk') ..._buildRisk(context),
        ],
      ),
    );
  }

  List<Widget> _buildOverview(BuildContext context) {
    return [
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: AppSpacing.sm,
        crossAxisSpacing: AppSpacing.sm,
        childAspectRatio: 1.55,
        children:
            metrics.map((metric) => ProtoMetricCard(metric: metric)).toList(),
      ),
      const SizedBox(height: AppSpacing.md),
      SectionPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeading(
              title: context.t('pnl.trend'),
              subtitle: context.t('pnl.trendHint'),
              actionLabel: context.t('asset.action.refresh'),
              onAction: _refresh,
            ),
            const SizedBox(height: AppSpacing.md),
            ProtoTrendChart(points: trendPoints),
          ],
        ),
      ),
      const SizedBox(height: AppSpacing.md),
      _recordsPanel(
        context,
        context.t('pnl.records'),
        context.t('pnl.riskFilter') + ': ' + _riskFilterLabel(context),
      ),
    ];
  }

  List<Widget> _buildRealized(BuildContext context) {
    return [
      SectionPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeading(
              title: context.t('pnl.realizedTitle'),
              subtitle: context.t('pnl.cashflow'),
              trailing: Text(
                r'+$7,418',
                style: context.pbTextStyles.bodyStrong.copyWith(
                  color: context.pbColors.positive,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            ...realizedBreakdown.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: ProtoBreakdownTile(item: item),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppSpacing.md),
      SectionPanel(
        child: Row(
          children: [
            Expanded(
              child: _DetailCell(
                label: context.t('pnl.fees'),
                value: r'-$184.22',
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: _DetailCell(
                label: context.t('pnl.cashflow'),
                value: r'+$12,600',
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppSpacing.md),
      _recordsPanel(
        context,
        context.t('pnl.records'),
        '+4 realized trades',
        source: realizedRecords,
      ),
    ];
  }

  List<Widget> _buildRisk(BuildContext context) {
    return [
      SectionPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.t('pnl.riskBudget'),
              style: context.pbTextStyles.sectionTitle,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '63%',
              style: context.pbTextStyles.metric.copyWith(
                color: context.pbColors.accent,
              ),
            ),
            const SizedBox(height: AppSpacing.xxs),
            Text(
              context.t('pnl.riskDelta'),
              style: TextStyle(
                color: context.pbColors.muted,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            const ProtoRiskMeter(value: 0.63),
          ],
        ),
      ),
      const SizedBox(height: AppSpacing.md),
      SectionPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeading(
              title: context.t('pnl.riskTitle'),
              subtitle: context.t('pnl.alerts'),
            ),
            const SizedBox(height: AppSpacing.md),
            ...exposureItems.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                child: ProtoExposureTile(item: item),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppSpacing.md),
      _recordsPanel(
        context,
        context.t('pnl.records'),
        context.t('pnl.riskFilter') + ': ' + _riskFilterLabel(context),
      ),
    ];
  }

  Widget _recordsPanel(
    BuildContext context,
    String title,
    String subtitle, {
    List<ProtoPnlRecord>? source,
  }) {
    final visibleRecords = source ?? filteredRecords;
    return SectionPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeading(
            title: title,
            subtitle: subtitle,
            actionLabel: context.t('asset.action.filter'),
            onAction: _showRiskFilterSheet,
          ),
          const SizedBox(height: AppSpacing.xs),
          if (loading)
            CommonLoading(message: context.t('pnl.loading'))
          else if (visibleRecords.isEmpty)
            CommonEmpty(message: context.t('pnl.empty'))
          else
            ...visibleRecords.map(
              (record) => ProtoRecordTile(
                key: ValueKey(record.id),
                record: record,
                onTap: () => _showRecordSheet(record),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _refresh() async {
    setState(() => loading = true);
    await Future<void>.delayed(const Duration(milliseconds: 240));
    if (mounted) setState(() => loading = false);
  }

  void _showRiskFilterSheet() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                sheetContext.t('pnl.riskFilter'),
                style: sheetContext.pbTextStyles.sectionTitle,
              ),
              const SizedBox(height: AppSpacing.md),
              ProtoFilterBar(
                options: riskOptions,
                selected: riskFilter,
                onSelected: (value) {
                  setState(() => riskFilter = value);
                  Navigator.of(sheetContext).pop();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showRecordSheet(ProtoPnlRecord record) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                record.symbol + ' ' + sheetContext.t('record.detail'),
                style: sheetContext.pbTextStyles.sectionTitle,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                _recordAction(sheetContext, record.action) +
                    ' · ' +
                    record.time,
                style: TextStyle(color: sheetContext.pbColors.muted),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _DetailCell(
                      label: sheetContext.t('record.amount'),
                      value: record.amount,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _DetailCell(
                      label: sheetContext.t('record.risk'),
                      value: _riskLabel(sheetContext, record.risk),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              CommonButton(
                label: sheetContext.t('asset.action.openHolding'),
                primary: true,
                onPressed: () {
                  Navigator.of(sheetContext).pop();
                  Navigator.of(context).pushNamed(Routes.holdingList);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  String _riskFilterLabel(BuildContext context) {
    return switch (riskFilter) {
      'All' => context.t('risk.all'),
      'Low' => context.t('risk.low'),
      'Medium' => context.t('risk.medium'),
      'High' => context.t('risk.high'),
      _ => riskFilter,
    };
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({
    required this.tabs,
    required this.selected,
    required this.onSelected,
  });

  final Map<String, String> tabs;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Row(
      children: tabs.entries.map((entry) {
        final active = entry.key == selected;
        final hint = switch (entry.key) {
          'overview' => '+12.8%',
          'realized' => r'+$7.4k',
          'risk' => '63%',
          _ => '',
        };
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: entry.key == 'risk' ? 0 : AppSpacing.xs,
            ),
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(58),
                backgroundColor: active ? colors.accentSoft : colors.surface,
                foregroundColor: active ? colors.text : colors.muted,
                side: BorderSide(color: active ? colors.accent : colors.border),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadii.panel),
                ),
              ),
              onPressed: () => onSelected(entry.key),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(entry.value, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: AppSpacing.xxs),
                  Text(
                    hint,
                    style: TextStyle(
                      color: active ? colors.accent : colors.muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final action = trailing ??
        (actionLabel == null
            ? null
            : TextButton(onPressed: onAction, child: Text(actionLabel!)));
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: context.pbTextStyles.sectionTitle),
              if (subtitle != null) ...[
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  subtitle!,
                  style: TextStyle(color: context.pbColors.muted, fontSize: 12),
                ),
              ],
            ],
          ),
        ),
        if (action != null) action,
      ],
    );
  }
}

class _DetailCell extends StatelessWidget {
  const _DetailCell({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: colors.muted, fontSize: 12)),
            const SizedBox(height: AppSpacing.xxs),
            Text(value, style: context.pbTextStyles.bodyStrong),
          ],
        ),
      ),
    );
  }
}

String _recordAction(BuildContext context, String action) {
  return switch (action) {
    '止盈' => context.t('record.takeProfit'),
    '备兑开仓' => context.t('record.coveredCall'),
    '止损' => context.t('record.stopLoss'),
    '加仓' => context.t('record.addPosition'),
    _ => action,
  };
}

String _riskLabel(BuildContext context, String risk) {
  return switch (risk) {
    'Low' => context.t('risk.low'),
    'Medium' => context.t('risk.medium'),
    'High' => context.t('risk.high'),
    _ => risk,
  };
}
