import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';

/// Target-only 表单组合壳；不占用 Producer componentId。
class CommonFormSection extends StatelessWidget {
  const CommonFormSection({
    super.key,
    required this.title,
    required this.children,
    this.description,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? description;
  final List<Widget> children;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TS.textStyle.subtitle),
                  if (description != null) ...[
                    SizedBox(height: TS.spacing.xxs),
                    Text(description!, style: TS.textStyle.caption),
                  ],
                ],
              ),
            ),
            if (actionLabel != null)
              CommonButton(
                label: actionLabel!,
                kind: CommonButtonKind.outlined,
                onPressed: onAction,
              ),
          ],
        ),
        SizedBox(height: TS.spacing.sm),
        ...children,
      ],
    );
  }
}
