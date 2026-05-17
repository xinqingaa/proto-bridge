import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../common/widgets/common_app_bar.dart';
import '../../../../common/widgets/common_button.dart';
import '../../../../common/widgets/common_empty.dart';
import '../../../../common/widgets/common_loading.dart';
import '../../../../common/widgets/section_panel.dart';
import '../../../../routes/app_routes.dart';
import '../../../../theme/app_tokens.dart';
import '../../../../translations/translations.dart';
import '../../application/asset_cubit.dart';
import '../../application/asset_state.dart';
import '../../data/asset_repository.dart';
import '../widgets/asset_summary_card.dart';
import '../widgets/filter_chip_bar.dart';
import '../widgets/holding_tile.dart';

class HoldingListPage extends StatelessWidget {
  const HoldingListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AssetCubit(const AssetRepository()),
      child: const _HoldingListView(),
    );
  }
}

class _HoldingListView extends StatelessWidget {
  const _HoldingListView();

  static const filters = ['All', 'Semiconductor', 'Consumer Electronics', 'EV'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CommonAppBar(
        title: 'asset.holdings.title'.tr,
        eyebrow: 'Asset Center',
        action: IconButton.filledTonal(
          icon: const Icon(Icons.refresh),
          onPressed: () => context.read<AssetCubit>().refresh(),
        ),
      ),
      body: BlocBuilder<AssetCubit, AssetState>(
        builder: (context, state) {
          return ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.lg,
            ),
            children: [
              AssetSummaryCard(summary: state.summary),
              const SizedBox(height: AppSpacing.md),
              FilterChipBar(
                options: filters,
                selected: state.holdingFilter,
                onSelected: context.read<AssetCubit>().selectHoldingFilter,
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
                        const Expanded(
                          child: Text(
                            'Positions',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        Text('${state.filteredHoldings.length} items'),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    if (state.loading)
                      const CommonLoading(message: 'Refreshing positions...')
                    else if (state.filteredHoldings.isEmpty)
                      const CommonEmpty(
                        message: 'No holdings match current filter',
                      )
                    else
                      ...state.filteredHoldings.map(
                        (holding) => HoldingTile(holding: holding),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: CommonButton(
                      label: 'asset.action.analysis'.tr,
                      onPressed: () =>
                          Navigator.of(context).pushNamed(Routes.pnlAnalysis),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: CommonButton(
                      label: 'asset.action.rebalance'.tr,
                      primary: true,
                      onPressed: () {},
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
