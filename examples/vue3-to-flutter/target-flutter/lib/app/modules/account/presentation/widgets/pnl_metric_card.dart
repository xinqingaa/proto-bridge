import 'package:flutter/material.dart';

import '../../../../common/widgets/section_panel.dart';
import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';
import '../../domain/asset_models.dart';

class PnlMetricCard extends StatelessWidget {
  const PnlMetricCard({required this.metric, super.key});

  final PnlMetric metric;

  @override
  Widget build(BuildContext context) {
    final color = switch (metric.tone) {
      MetricTone.positive => themeService.colors.positive,
      MetricTone.negative => themeService.colors.negative,
      MetricTone.neutral => themeService.colors.text,
    };
    return SectionPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            metric.label,
            style: TextStyle(color: themeService.colors.muted, fontSize: 12),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            metric.value,
            style: themeService.textStyles.metric.copyWith(color: color),
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            metric.delta,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
