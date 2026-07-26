import 'package:flutter/material.dart';

import '../theme/ts.dart';
import 'button.dart';

/// 对齐 pbwork `Chip`。
class CommonChip extends StatelessWidget {
  const CommonChip({
    super.key,
    required this.label,
    this.tone = CommonButtonTone.secondary,
    this.selected = false,
    this.onTap,
  });

  final String label;
  final CommonButtonTone tone;
  final bool selected;
  final VoidCallback? onTap;

  Color get _bg {
    if (selected) return TS.colors.primarySoft;
    switch (tone) {
      case CommonButtonTone.action:
        return TS.colors.actionSoft;
      case CommonButtonTone.primary:
        return TS.colors.primarySoft;
      case CommonButtonTone.secondary:
        return TS.colors.secondarySoft;
      case CommonButtonTone.error:
        return TS.colors.errorSoft;
      case CommonButtonTone.success:
        return TS.colors.successSoft;
    }
  }

  Color get _fg {
    if (selected) return TS.colors.primary;
    switch (tone) {
      case CommonButtonTone.action:
        return TS.colors.action;
      case CommonButtonTone.primary:
        return TS.colors.primary;
      case CommonButtonTone.secondary:
        return TS.colors.secondary;
      case CommonButtonTone.error:
        return TS.colors.error;
      case CommonButtonTone.success:
        return TS.colors.success;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return ActionChip(
      label: Text(label, style: TS.textStyle.captionStrong.copyWith(color: _fg)),
      onPressed: onTap,
      backgroundColor: _bg,
      side: BorderSide(color: TS.colors.border),
    );
  }
}
