import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

/// 对齐 pbwork `ProgressIndicator` — 官方 [LinearProgressIndicator]。
class CommonProgress extends StatelessWidget {
  const CommonProgress({super.key, this.value, this.label});

  /// `null` = indeterminate。
  final double? value;
  final String? label;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: TS.textStyle.caption.copyWith(color: TS.colors.onSurface),
          ),
          SizedBox(height: TS.spacing.xsPlus),
        ],
        ClipRRect(
          borderRadius: BorderRadius.circular(TS.radius.full),
          child: LinearProgressIndicator(
            value: value == null ? null : (value! / 100).clamp(0, 1),
            minHeight: TS.sizing.progressTrack,
            color: TS.colors.primary,
            backgroundColor: TS.colors.primarySoft,
          ),
        ),
      ],
    );
  }
}
