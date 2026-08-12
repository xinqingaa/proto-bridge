import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork `Textarea` — 官方多行 [TextField]。
class CommonTextArea extends StatelessWidget {
  const CommonTextArea({
    super.key,
    this.controller,
    this.label,
    this.showLabel = false,
    this.hint,
    this.enabled = true,
    this.rows = 3,
    this.onChanged,
  });

  final TextEditingController? controller;
  final String? label;
  final bool showLabel;
  final String? hint;
  final bool enabled;
  final int rows;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Opacity(
      opacity: enabled ? TS.opacity.visible : TS.opacity.disabled,
      child: TextField(
        controller: controller,
        enabled: enabled,
        minLines: rows,
        maxLines: rows,
        onChanged: onChanged,
        style: TS.textStyle.content,
        decoration: InputDecoration(
          labelText: showLabel ? label : null,
          hintText: hint,
          alignLabelWithHint: true,
          filled: showLabel,
          border: showLabel ? null : InputBorder.none,
          enabledBorder: showLabel ? null : InputBorder.none,
          focusedBorder: showLabel ? null : InputBorder.none,
        ),
      ),
    );
  }
}
