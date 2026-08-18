import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import 'button.dart';
import 'icon.dart';

/// 对齐 pbwork Icon Button `tone`。
enum CommonIconButtonTone { primary, secondary }

/// 对齐 pbwork Icon Button `variant`。
enum CommonIconButtonVariant { tonal, flat, outlined, text }

/// 紧凑 Lucide 操作；[label] 同时作为 tooltip 与无障碍名称。
///
/// [quarterTurns] 是 Target 便利参数，用于旋转图标（例如返回箭头），不是 Producer prop。
class CommonIconButton extends StatelessWidget {
  const CommonIconButton({
    super.key,
    required this.name,
    required this.label,
    this.onPressed,
    this.size = CommonControlSize.md,
    this.tone = CommonIconButtonTone.secondary,
    this.variant = CommonIconButtonVariant.tonal,
    this.loading = false,
    this.disabled = false,
    this.quarterTurns = 0,
  });

  final CommonIconName name;
  final String label;
  final VoidCallback? onPressed;
  final CommonControlSize size;
  final CommonIconButtonTone tone;
  final CommonIconButtonVariant variant;
  final bool loading;
  final bool disabled;
  final int quarterTurns;

  bool get _enabled => !disabled && !loading && onPressed != null;

  double get _iconSize => switch (size) {
    CommonControlSize.sm => TS.sizing.iconSm,
    CommonControlSize.md => TS.sizing.iconMd,
    CommonControlSize.lg => TS.sizing.iconLg,
  };

  double get _buttonSize => switch (size) {
    CommonControlSize.sm || CommonControlSize.md => TS.sizing.touch,
    CommonControlSize.lg => TS.sizing.controlLg,
  };

  Color get _color => switch (tone) {
    CommonIconButtonTone.primary => TS.colors.primary,
    CommonIconButtonTone.secondary => TS.colors.secondary,
  };

  Color? get _background => switch (variant) {
    CommonIconButtonVariant.flat => _color,
    CommonIconButtonVariant.tonal => switch (tone) {
      CommonIconButtonTone.primary => TS.colors.primarySoft,
      CommonIconButtonTone.secondary => TS.colors.secondarySoft,
    },
    CommonIconButtonVariant.outlined || CommonIconButtonVariant.text => null,
  };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final foreground = variant == CommonIconButtonVariant.flat
        ? switch (tone) {
            CommonIconButtonTone.primary => TS.colors.onPrimary,
            CommonIconButtonTone.secondary => TS.colors.onSecondary,
          }
        : _color;

    return Opacity(
      opacity: disabled ? TS.opacity.disabled : TS.opacity.visible,
      child: IconButton(
        onPressed: _enabled ? onPressed : null,
        tooltip: label,
        iconSize: _iconSize,
        style: IconButton.styleFrom(
          fixedSize: Size.square(_buttonSize),
          shape: const CircleBorder(),
          foregroundColor: foreground,
          backgroundColor: _background,
          side: variant == CommonIconButtonVariant.outlined
              ? BorderSide(color: _color, width: TS.border.widthHairline)
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
