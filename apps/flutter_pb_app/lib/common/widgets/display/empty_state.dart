import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';
import '../action/icon.dart';

/// 对齐 pbwork `EmptyState`。
class CommonEmptyState extends StatelessWidget {
  const CommonEmptyState({
    super.key,
    required this.title,
    this.description,
    this.icon = CommonIconName.inbox,
    this.iconColor,
    this.iconBackgroundColor,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? description;
  final CommonIconName icon;
  final Color? iconColor;
  final Color? iconBackgroundColor;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Center(
      child: Padding(
        padding: EdgeInsets.all(TS.spacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: TS.sizing.avatarLg,
              height: TS.sizing.avatarLg,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: iconBackgroundColor ?? TS.colors.primarySoft,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon.data,
                size: TS.sizing.iconLg,
                color: iconColor ?? TS.colors.primary,
              ),
            ),
            SizedBox(height: TS.spacing.smPlus),
            Text(
              title,
              style: TS.textStyle.subtitle,
              textAlign: TextAlign.center,
            ),
            if (description != null) ...[
              SizedBox(height: TS.spacing.sm),
              Text(
                description!,
                style: TS.textStyle.content.copyWith(
                  color: TS.colors.onSurfaceMuted,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null) ...[
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: actionLabel!,
                variant: CommonButtonVariant.tonal,
                tone: CommonButtonTone.primary,
                onPressed: onAction,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
