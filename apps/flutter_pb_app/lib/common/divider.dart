import 'package:flutter/material.dart';

import '../theme/ts.dart';

/// 对齐 pbwork `Divider` — 官方 [Divider]。
class CommonDivider extends StatelessWidget {
  const CommonDivider({
    super.key,
    this.label,
    this.inset = false,
  });

  final String? label;
  final bool inset;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final divider = Divider(
      color: TS.colors.divider,
      height: 1,
      indent: inset ? TS.spacing.md : 0,
      endIndent: inset ? TS.spacing.md : 0,
    );
    if (label == null) return divider;
    return Row(
      children: [
        Expanded(child: divider),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: TS.spacing.sm),
          child: Text(label!, style: TS.textStyle.caption),
        ),
        Expanded(child: divider),
      ],
    );
  }
}
