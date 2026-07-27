import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork Button `variant`。
enum CommonButtonVariant { flat, tonal, outlined, text }

/// 对齐 pbwork Button `tone`。
enum CommonButtonTone { action, primary, secondary, error, success }

/// 对齐 pbwork `size`。
enum CommonControlSize { sm, md, lg }

/// 对齐 pbwork `Button`。
///
/// - [CommonButtonVariant.text] → 官方 [TextButton]
/// - 其余 → [InkWell]/[GestureDetector] + [Container]
class CommonButton extends StatelessWidget {
  const CommonButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = CommonButtonVariant.flat,
    this.tone = CommonButtonTone.action,
    this.size = CommonControlSize.md,
    this.loading = false,
    this.block = false,
    this.disabled = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final CommonButtonVariant variant;
  final CommonButtonTone tone;
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

  TextStyle get _labelStyle {
    final base = size == CommonControlSize.sm
        ? TS.textStyle.captionStrong
        : TS.textStyle.label;
    return base.copyWith(color: _foreground);
  }

  Color get _foreground {
    switch (variant) {
      case CommonButtonVariant.flat:
        switch (tone) {
          case CommonButtonTone.action:
            return TS.colors.onAction;
          case CommonButtonTone.primary:
            return TS.colors.onPrimary;
          case CommonButtonTone.secondary:
            return TS.colors.onSecondary;
          case CommonButtonTone.error:
            return TS.colors.onError;
          case CommonButtonTone.success:
            return TS.colors.onSuccess;
        }
      case CommonButtonVariant.tonal:
      case CommonButtonVariant.outlined:
      case CommonButtonVariant.text:
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
  }

  Color get _background {
    switch (variant) {
      case CommonButtonVariant.flat:
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
        return Colors.transparent;
    }
  }

  Border? get _border {
    if (variant != CommonButtonVariant.outlined) return null;
    return Border.all(color: _foreground);
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    final child = loading
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: _foreground,
            ),
          )
        : Text(label, style: _labelStyle);

    // text → TextButton；其余 → InkWell + Container
    switch (variant) {
      case CommonButtonVariant.text:
        return SizedBox(
          width: block ? double.infinity : null,
          height: _height,
          child: TextButton(
            onPressed: _enabled ? onPressed : null,
            child: child,
          ),
        );
      case CommonButtonVariant.flat:
      case CommonButtonVariant.tonal:
      case CommonButtonVariant.outlined:
        final radius = BorderRadius.circular(TS.radius.md);
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
                  border: _border,
                ),
                child: Opacity(
                  opacity: disabled ? TS.opacity.disabled : 1,
                  child: Center(child: child),
                ),
              ),
            ),
          ),
        );
    }
  }
}
