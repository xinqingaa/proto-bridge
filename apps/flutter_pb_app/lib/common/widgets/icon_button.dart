import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'button.dart';
import 'icon.dart';

/// 紧凑 Lucide 操作；[label] 同时作为 tooltip 与无障碍名称。
class CommonIconButton extends StatelessWidget {
  const CommonIconButton({
    super.key,
    required this.name,
    required this.label,
    this.onPressed,
    this.size = CommonControlSize.md,
    this.tone = CommonButtonTone.secondary,
    this.variant = CommonButtonVariant.tonal,
    this.loading = false,
    this.disabled = false,
    this.quarterTurns = 0,
  });

  final CommonIconName name;
  final String label;
  final VoidCallback? onPressed;
  final CommonControlSize size;
  final CommonButtonTone tone;
  final CommonButtonVariant variant;
  final bool loading;
  final bool disabled;
  final int quarterTurns;

  bool get _enabled => !disabled && !loading && onPressed != null;

  double get _iconSize => switch (size) {
    CommonControlSize.sm => TS.sizing.iconSm,
    CommonControlSize.md => TS.sizing.iconMd,
    CommonControlSize.lg => TS.sizing.iconLg,
  };

  Color get _color => switch (tone) {
    CommonButtonTone.action => TS.colors.action,
    CommonButtonTone.primary => TS.colors.primary,
    CommonButtonTone.secondary => TS.colors.secondary,
    CommonButtonTone.error => TS.colors.error,
    CommonButtonTone.success => TS.colors.success,
  };

  Color? get _background => switch (variant) {
    CommonButtonVariant.flat => _color,
    CommonButtonVariant.tonal => switch (tone) {
      CommonButtonTone.action => TS.colors.actionSoft,
      CommonButtonTone.primary => TS.colors.primarySoft,
      CommonButtonTone.secondary => TS.colors.secondarySoft,
      CommonButtonTone.error => TS.colors.errorSoft,
      CommonButtonTone.success => TS.colors.successSoft,
    },
    CommonButtonVariant.outlined || CommonButtonVariant.text => null,
  };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final foreground = variant == CommonButtonVariant.flat
        ? switch (tone) {
            CommonButtonTone.primary => TS.colors.onPrimary,
            CommonButtonTone.action => TS.colors.onAction,
            CommonButtonTone.error => TS.colors.onError,
            CommonButtonTone.success => TS.colors.onSuccess,
            CommonButtonTone.secondary => TS.colors.onSecondary,
          }
        : _color;

    return Opacity(
      opacity: disabled ? TS.opacity.disabled : TS.opacity.visible,
      child: IconButton(
        onPressed: _enabled ? onPressed : null,
        tooltip: label,
        iconSize: _iconSize,
        style: IconButton.styleFrom(
          foregroundColor: foreground,
          backgroundColor: _background,
          side: variant == CommonButtonVariant.outlined
              ? BorderSide(color: _color)
              : null,
        ),
        icon: loading
            ? SizedBox(
                width: _iconSize,
                height: _iconSize,
                child: CircularProgressIndicator(
                  strokeWidth: TS.sizing.progressStroke,
                  color: foreground,
                ),
              )
            : RotatedBox(quarterTurns: quarterTurns, child: Icon(name.data)),
      ),
    );
  }
}
