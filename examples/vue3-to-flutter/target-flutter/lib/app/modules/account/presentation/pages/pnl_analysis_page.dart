import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../common/widgets/common_app_bar.dart';
import '../../../../common/widgets/common_empty.dart';
import '../../../../common/widgets/common_loading.dart';
import '../../../../common/widgets/section_panel.dart';
import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';
import '../../../../translations/translations.dart';
import '../../application/asset_cubit.dart';
import '../../application/asset_state.dart';
import '../../data/asset_repository.dart';
import '../../domain/asset_models.dart';
import '../widgets/filter_chip_bar.dart';
import '../widgets/pnl_metric_card.dart';
import '../widgets/pnl_record_tile.dart';
import '../widgets/trend_chart.dart';

class PnlAnalysisPage extends StatelessWidget {
  const PnlAnalysisPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AssetCubit(const AssetRepository()),
      child: const _PnlAnalysisView(),
    );
  }
}

class _PnlAnalysisView extends StatelessWidget {
  const _PnlAnalysisView();

  static const tabs = {
    'overview': 'Overview',
    'realized': 'Realized',
    'risk': 'Risk',
  };
  static const riskOptions = ['All', 'Low', 'Medium', 'High'];

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AssetCubit, AssetState>(
      listenWhen: (previous, current) {
        return previous.filterSheetOpen != current.filterSheetOpen ||
            previous.selectedRecord != current.selectedRecord;
      },
      listener: (context, state) {
        if (state.filterSheetOpen) {
          _showRiskFilterSheet(context, state);
        }
        if (state.selectedRecord != null) {
          _showRecordSheet(context, state.selectedRecord!);
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: CommonAppBar(
            title: 'asset.pnl.title'.tr,
            eyebrow: 'Asset Center',
            action: IconButton.filledTonal(
              icon: const Icon(Icons.tune),
              onPressed: context.read<AssetCubit>().openFilterSheet,
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
                selected: state.activePnlTab,
                onSelected: context.read<AssetCubit>().setPnlTab,
              ),
              const SizedBox(height: AppSpacing.md),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: AppSpacing.sm,
                crossAxisSpacing: AppSpacing.sm,
                childAspectRatio: 1.55,
                children: state.metrics
                    .map((metric) => PnlMetricCard(metric: metric))
                    .toList(),
              ),
              const SizedBox(height: AppSpacing.md),
              SectionPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionHeading(
                      title: 'Return Trend',
                      subtitle:
                          '8 sessions, current tab: ${state.activePnlTab}',
                      actionLabel: 'Refresh',
                      onAction: context.read<AssetCubit>().refresh,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TrendChart(points: state.trendPoints),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              SectionPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionHeading(
                      title: 'Trade Records',
                      subtitle: 'Risk filter: ${state.riskFilter}',
                      actionLabel: 'Filter',
                      onAction: context.read<AssetCubit>().openFilterSheet,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    if (state.loading)
                      const CommonLoading(message: 'Syncing latest trades...')
                    else if (state.filteredRecords.isEmpty)
                      const CommonEmpty(
                        message: 'No records for this risk level',
                      )
                    else
                      ...state.filteredRecords.map(
                        (record) => PnlRecordTile(
                          record: record,
                          onTap: () =>
                              context.read<AssetCubit>().openRecord(record),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showRiskFilterSheet(BuildContext context, AssetState state) {
    final cubit = context.read<AssetCubit>();
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) {
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
                'Filter by risk',
                style: themeService.textStyles.sectionTitle,
              ),
              const SizedBox(height: AppSpacing.md),
              FilterChipBar(
                options: riskOptions,
                selected: state.riskFilter,
                onSelected: cubit.setRiskFilter,
              ),
            ],
          ),
        );
      },
    ).whenComplete(cubit.closeFilterSheet);
  }

  void _showRecordSheet(BuildContext context, PnlRecord record) {
    final cubit = context.read<AssetCubit>();
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) {
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
                '${record.symbol} detail',
                style: themeService.textStyles.sectionTitle,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${record.action} at ${record.time}',
                style: TextStyle(color: themeService.colors.muted),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _DetailCell(label: 'Amount', value: record.amount),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _DetailCell(label: 'Risk', value: record.risk),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    ).whenComplete(cubit.closeRecord);
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
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xxs),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        border: Border.all(color: themeService.colors.border),
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Row(
        children: tabs.entries.map((entry) {
          final active = entry.key == selected;
          return Expanded(
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: active
                    ? themeService.colors.primary
                    : Colors.transparent,
                foregroundColor: active
                    ? Colors.white
                    : themeService.colors.muted,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(7),
                ),
              ),
              onPressed: () => onSelected(entry.key),
              child: Text(entry.value, overflow: TextOverflow.ellipsis),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: themeService.textStyles.sectionTitle),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                subtitle,
                style: TextStyle(
                  color: themeService.colors.muted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        TextButton(onPressed: onAction, child: Text(actionLabel)),
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
    return DecoratedBox(
      decoration: BoxDecoration(
        color: themeService.colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(color: themeService.colors.muted, fontSize: 12),
            ),
            const SizedBox(height: AppSpacing.xxs),
            Text(value, style: themeService.textStyles.bodyStrong),
          ],
        ),
      ),
    );
  }
}
