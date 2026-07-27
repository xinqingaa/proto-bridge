import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'button.dart';

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
        return TS.sizing.iconMd;
      case CommonControlSize.md:
        return TS.sizing.iconLg;
      case CommonControlSize.lg:
        return TS.sizing.controlMd;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final spinner = SizedBox(
      width: _dim,
      height: _dim,
      child: CircularProgressIndicator(
        strokeWidth: 2.5,
        color: TS.colors.primary,
      ),
    );
    if (label == null) return spinner;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        spinner,
        SizedBox(height: TS.spacing.sm),
        Text(label!, style: TS.textStyle.caption),
      ],
    );
  }
}
