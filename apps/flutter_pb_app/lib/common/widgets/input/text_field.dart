import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../theme/ts.dart';

/// 对齐 pbwork `TextField` — 官方 [TextField]。
class CommonTextField extends StatefulWidget {
  const CommonTextField({
    super.key,
    this.controller,
    this.label,
    this.showLabel = false,
    this.hint,
    this.enabled = true,
    this.obscureText = false,
    this.revealable = false,
    this.errorText,
    this.autofillHints,
    this.keyboardType,
    this.onChanged,
    this.onSubmitted,
  });

  final TextEditingController? controller;
  final String? label;
  final bool showLabel;
  final String? hint;
  final bool enabled;
  final bool obscureText;
  final bool revealable;
  final String? errorText;
  final Iterable<String>? autofillHints;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  State<CommonTextField> createState() => _CommonTextFieldState();
}

class _CommonTextFieldState extends State<CommonTextField> {
  var _revealed = false;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final hidden = widget.obscureText && !_revealed;
    return ConstrainedBox(
      constraints: BoxConstraints(minHeight: TS.sizing.controlMd),
      child: Opacity(
        opacity: widget.enabled ? TS.opacity.visible : TS.opacity.disabled,
        child: TextField(
          controller: widget.controller,
          enabled: widget.enabled,
          obscureText: hidden,
          autofillHints: widget.autofillHints,
          keyboardType: widget.keyboardType,
          onChanged: widget.onChanged,
          onSubmitted: widget.onSubmitted,
          style: TS.textStyle.content,
          decoration: InputDecoration(
            labelText: widget.showLabel ? widget.label : null,
            labelStyle: TS.textStyle.caption,
            hintText: widget.hint,
            errorText: widget.errorText,
            filled: true,
            fillColor: TS.colors.surface,
            border: widget.showLabel ? null : InputBorder.none,
            enabledBorder: widget.showLabel ? null : InputBorder.none,
            focusedBorder: widget.showLabel ? null : InputBorder.none,
            suffixIcon: widget.obscureText && widget.revealable
                ? IconButton(
                    tooltip: _revealed ? '隐藏密码' : '显示密码',
                    onPressed: widget.enabled
                        ? () => setState(() => _revealed = !_revealed)
                        : null,
                    icon: Icon(
                      _revealed ? LucideIcons.eyeOff : LucideIcons.eye,
                      size: TS.sizing.iconMd,
                      color: TS.colors.onSurfaceMuted,
                    ),
                  )
                : null,
          ),
        ),
      ),
    );
  }
}
