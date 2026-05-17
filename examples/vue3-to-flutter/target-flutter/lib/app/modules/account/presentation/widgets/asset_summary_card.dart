import 'package:flutter/material.dart';

import '../../../../common/widgets/section_panel.dart';
import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';
import '../../domain/asset_models.dart';

class AssetSummaryCard extends StatelessWidget {
  const AssetSummaryCard({required this.summary, super.key});

  final HoldingSummary summary;

  @override
  Widget build(BuildContext context) {
    return SectionPanel(
      child: Row(
        children: [
          Expanded(
            child: _Metric(label: 'Market value', value: summary.marketValue),
          ),
          Expanded(
            child: _Metric(
              label: 'Today P&L',
              value: summary.dayPnl,
              positive: true,
              caption: summary.dayPnlRate,
            ),
          ),
          Expanded(
            child: _Metric(label: 'Risk', value: summary.riskLevel),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    this.caption,
    this.positive = false,
  });

  final String label;
  final String value;
  final String? caption;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final color = positive
        ? themeService.colors.positive
        : themeService.colors.text;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(color: themeService.colors.muted, fontSize: 12),
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            value,
            style: themeService.textStyles.bodyStrong.copyWith(color: color),
            overflow: TextOverflow.ellipsis,
          ),
          if (caption != null)
            Text(
              caption!,
              style: TextStyle(
                color: themeService.colors.positive,
                fontSize: 12,
              ),
            ),
        ],
      ),
    );
  }
}
