import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork `Card`。
class CommonCard extends StatelessWidget {
  const CommonCard({
    super.key,
    this.title,
    this.subtitle,
    this.child,
    this.elevated = false,
    this.onTap,
  });

  final String? title;
  final String? subtitle;
  final Widget? child;
  final bool elevated;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final content = Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null) Text(title!, style: TS.textStyle.subtitle),
          if (subtitle != null) ...[
            SizedBox(height: TS.spacing.xs),
            Text(
              subtitle!,
              style: TS.textStyle.caption,
            ),
          ],
          if (child != null) ...[
            if (title != null || subtitle != null)
              SizedBox(height: TS.spacing.sm),
            child!,
          ],
        ],
      ),
    );

    return Card(
      color: TS.colors.surface,
      elevation: elevated ? TS.elevation.card : TS.elevation.none,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TS.radius.lg),
        side: BorderSide(color: TS.colors.border),
      ),
      child: onTap == null
          ? content
          : InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(TS.radius.lg),
              child: content,
            ),
    );
  }
}
