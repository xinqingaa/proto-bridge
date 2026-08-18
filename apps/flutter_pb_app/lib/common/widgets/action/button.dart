import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

/// 对齐 pbwork Button `kind`：主要、次要、描边。页面不配色槽。
enum CommonButtonKind { primary, secondary, outlined }

/// 对齐 pbwork `size`。
enum CommonControlSize { sm, md, lg }

/// 对齐 pbwork `Button`。
class CommonButton extends StatelessWidget {
  const CommonButton({
    super.key,
    required this.label,
    this.onPressed,
    this.kind = CommonButtonKind.primary,
    this.size = CommonControlSize.md,
    this.loading = false,
    this.block = false,
    this.disabled = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final CommonButtonKind kind;
  final CommonControlSize size;
  final bool loading;
  final bool block;
  final bool disabled;

  bool get _enabled => !disabled && !loading && onPressed != null;

  double get _height {
    switch (size) {
      case CommonControlSize.sm:
        return TS.sizing.controlSm;
      case CommonControlSize.md:
        return TS.sizing.controlMd;
      case CommonControlSize.lg:
        return TS.sizing.controlLg;
    }
  }

  Color get _background => switch (kind) {
    CommonButtonKind.primary => TS.colors.action,
    CommonButtonKind.secondary => TS.colors.actionSoft,
    CommonButtonKind.outlined => Colors.transparent,
  };

  Color get _borderColor => switch (kind) {
    CommonButtonKind.primary => TS.colors.action,
    CommonButtonKind.secondary => TS.colors.actionSoft,
    CommonButtonKind.outlined => TS.colors.outline,
  };

  Color get _foreground => switch (kind) {
    CommonButtonKind.primary => TS.colors.onAction,
    CommonButtonKind.secondary => TS.colors.action,
    CommonButtonKind.outlined => TS.colors.onSurface,
  };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final radius = BorderRadius.circular(TS.radius.md);
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading) ...[
          SizedBox(
            width: TS.sizing.iconSm,
            height: TS.sizing.iconSm,
            child: CircularProgressIndicator(
              strokeWidth: TS.sizing.progressStroke,
              color: _foreground,
            ),
          ),
          SizedBox(width: TS.spacing.sm),
        ],
        Text(
          label,
          style:
              (size == CommonControlSize.sm
                      ? TS.textStyle.captionStrong
                      : TS.textStyle.label)
                  .copyWith(color: _foreground),
        ),
      ],
    );

    return SizedBox(
      width: block ? double.infinity : null,
      height: _height,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _enabled ? onPressed : null,
          borderRadius: radius,
          child: Ink(
            decoration: BoxDecoration(
              color: _background,
              borderRadius: radius,
              border: Border.all(
                color: _borderColor,
                width: TS.border.widthHairline,
              ),
            ),
            child: Opacity(
              opacity: disabled ? TS.opacity.disabled : TS.opacity.visible,
              child: Center(child: child),
            ),
          ),
        ),
      ),
    );
  }
}
