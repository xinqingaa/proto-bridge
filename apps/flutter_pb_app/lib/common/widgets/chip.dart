import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork Chip `tone`。
enum CommonChipTone { primary, secondary, success, warning, error }

/// 对齐 pbwork `Chip`。
///
/// Display-only when [onTap] is null; interactive when provided.
class CommonChip extends StatelessWidget {
  const CommonChip({
    super.key,
    required this.label,
    this.tone = CommonChipTone.secondary,
    this.selected = false,
    this.onTap,
    this.elevated = false,
  });

  final String label;
  final CommonChipTone tone;
  final bool selected;
  final VoidCallback? onTap;
  final bool elevated;

  RoundedRectangleBorder get _shape => RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(TS.radius.full),
  );

  Color get _bg {
    if (selected) return TS.colors.primarySoft;
    switch (tone) {
      case CommonChipTone.primary:
        return TS.colors.primarySoft;
      case CommonChipTone.secondary:
        return TS.colors.secondarySoft;
      case CommonChipTone.success:
        return TS.colors.successSoft;
      case CommonChipTone.warning:
        return TS.colors.warningSoft;
      case CommonChipTone.error:
        return TS.colors.errorSoft;
    }
  }

  Color get _fg {
    if (selected) return TS.colors.primary;
    switch (tone) {
      case CommonChipTone.primary:
        return TS.colors.primary;
      case CommonChipTone.secondary:
        return TS.colors.secondary;
      case CommonChipTone.success:
        return TS.colors.success;
      case CommonChipTone.warning:
        return TS.colors.warning;
      case CommonChipTone.error:
        return TS.colors.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final labelStyle = TS.textStyle.captionStrong.copyWith(color: _fg);
    final chip = onTap == null
        ? Chip(
            label: Text(label, style: labelStyle),
            backgroundColor: _bg,
            side: BorderSide.none,
            shape: _shape,
            padding: EdgeInsets.symmetric(horizontal: TS.spacing.xs),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            visualDensity: VisualDensity.compact,
          )
        : ActionChip(
            label: Text(label, style: labelStyle),
            onPressed: onTap,
            backgroundColor: _bg,
            side: TS.border.defaultBorder,
            shape: _shape,
          );
    return Material(
      type: MaterialType.transparency,
      elevation: elevated ? TS.elevation.card : TS.elevation.none,
      borderRadius: BorderRadius.circular(TS.radius.full),
      child: chip,
    );
  }
}
