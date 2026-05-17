import 'package:flutter/material.dart';

import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';
import '../../domain/asset_models.dart';

class PnlRecordTile extends StatelessWidget {
  const PnlRecordTile({required this.record, required this.onTap, super.key});

  final PnlRecord record;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final amountColor = record.isPositive
        ? themeService.colors.positive
        : themeService.colors.negative;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    record.symbol,
                    style: themeService.textStyles.bodyStrong,
                  ),
                  const SizedBox(height: AppSpacing.xxs),
                  Text(
                    '${record.action} · ${record.time}',
                    style: TextStyle(
                      color: themeService.colors.muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  record.amount,
                  style: themeService.textStyles.bodyStrong.copyWith(
                    color: amountColor,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  record.risk,
                  style: TextStyle(
                    color: themeService.colors.muted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
