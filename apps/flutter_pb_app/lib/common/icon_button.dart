import 'package:flutter/material.dart';

import '../theme/ts.dart';
import 'button.dart';

/// 对齐 pbwork `IconButton` — 官方 [IconButton]。
class CommonIconButton extends StatelessWidget {
  const CommonIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.tooltip,
    this.size = CommonControlSize.md,
    this.tone = CommonButtonTone.secondary,
    this.variant = CommonButtonVariant.tonal,
    this.disabled = false,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final CommonControlSize size;
  final CommonButtonTone tone;
  final CommonButtonVariant variant;
  final bool disabled;

  double get _iconSize {
    switch (size) {
      case CommonControlSize.sm:
        return TS.sizing.iconSm;
      case CommonControlSize.md:
        return TS.sizing.iconMd;
      case CommonControlSize.lg:
        return TS.sizing.iconLg;
    }
  }

  Color get _color {
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

  Color? get _background {
    switch (variant) {
      case CommonButtonVariant.flat:
        return _color;
      case CommonButtonVariant.tonal:
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
      case CommonButtonVariant.outlined:
      case CommonButtonVariant.text:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final fg = variant == CommonButtonVariant.flat
        ? (tone == CommonButtonTone.primary
            ? TS.colors.onPrimary
            : tone == CommonButtonTone.action
                ? TS.colors.onAction
                : TS.colors.onSecondary)
        : _color;

    return IconButton(
      onPressed: disabled ? null : onPressed,
      tooltip: tooltip,
      iconSize: _iconSize,
      style: IconButton.styleFrom(
        foregroundColor: fg,
        backgroundColor: _background,
        side: variant == CommonButtonVariant.outlined
            ? BorderSide(color: _color)
            : null,
      ),
      icon: Icon(icon),
    );
  }
}
