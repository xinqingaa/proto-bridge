import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';

/// 对齐 pbwork `Spinner` — 官方 [CircularProgressIndicator]。
class CommonSpinner extends StatelessWidget {
  const CommonSpinner({
    super.key,
    this.label,
    this.size = CommonControlSize.md,
  });

  final String? label;
  final CommonControlSize size;

  double get _dim {
    switch (size) {
      case CommonControlSize.sm:
        return TS.sizing.iconSm;
      case CommonControlSize.md:
        return TS.sizing.iconMd;
      case CommonControlSize.lg:
        return TS.sizing.iconLg;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final spinner = SizedBox(
      width: _dim,
      height: _dim,
      child: CircularProgressIndicator(
        strokeWidth: TS.sizing.indicatorThickness,
        color: TS.colors.primary,
      ),
    );
    if (label == null) return spinner;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        spinner,
        SizedBox(width: TS.spacing.sm),
        Text(label!, style: TS.textStyle.caption),
      ],
    );
  }
}
