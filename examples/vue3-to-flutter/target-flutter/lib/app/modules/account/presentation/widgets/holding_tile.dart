import 'package:flutter/material.dart';

import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';
import '../../domain/asset_models.dart';

class HoldingTile extends StatelessWidget {
  const HoldingTile({required this.holding, super.key});

  final Holding holding;

  @override
  Widget build(BuildContext context) {
    final pnlColor = holding.isPositive
        ? themeService.colors.positive
        : themeService.colors.negative;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            flex: 12,
            child: _TextStack(title: holding.symbol, subtitle: holding.name),
          ),
          Expanded(
            flex: 10,
            child: _TextStack(
              title: holding.amount,
              subtitle: '${holding.shares} shares',
            ),
          ),
          Expanded(
            flex: 8,
            child: _TextStack(
              title: holding.pnl,
              subtitle: holding.pnlRate,
              alignEnd: true,
              color: pnlColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _TextStack extends StatelessWidget {
  const _TextStack({
    required this.title,
    required this.subtitle,
    this.alignEnd = false,
    this.color,
  });

  final String title;
  final String subtitle;
  final bool alignEnd;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: themeService.textStyles.bodyStrong.copyWith(color: color),
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          subtitle,
          style: TextStyle(
            color: color ?? themeService.colors.muted,
            fontSize: 12,
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
