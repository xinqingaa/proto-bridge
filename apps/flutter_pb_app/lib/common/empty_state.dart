import 'package:flutter/material.dart';

import '../theme/ts.dart';
import 'button.dart';

/// 对齐 pbwork `EmptyState`。
class CommonEmptyState extends StatelessWidget {
  const CommonEmptyState({
    super.key,
    required this.title,
    this.description,
    this.icon = Icons.inbox_outlined,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? description;
  final IconData icon;
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
            Icon(icon, size: 48, color: TS.colors.onSurfaceMuted),
            SizedBox(height: TS.spacing.md),
            Text(title, style: TS.textStyle.subtitle, textAlign: TextAlign.center),
            if (description != null) ...[
              SizedBox(height: TS.spacing.xs),
              Text(
                description!,
                style: TS.textStyle.caption,
                textAlign: TextAlign.center,
              ),
            ],
            if (actionLabel != null) ...[
              SizedBox(height: TS.spacing.md),
              CommonButton(
                label: actionLabel!,
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
