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
  });

  final String label;
  final CommonChipTone tone;
  final bool selected;
  final VoidCallback? onTap;

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
    if (onTap == null) {
      return Chip(
        label: Text(label, style: labelStyle),
        backgroundColor: _bg,
        side: BorderSide.none,
        padding: EdgeInsets.symmetric(horizontal: TS.spacing.xs),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
      );
    }
    return ActionChip(
      label: Text(label, style: labelStyle),
      onPressed: onTap,
      backgroundColor: _bg,
      side: BorderSide(color: TS.colors.border),
    );
  }
}
