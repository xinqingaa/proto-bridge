import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

/// 对齐 pbwork `Textarea` — 官方多行 [TextField]。
class CommonTextArea extends StatelessWidget {
  const CommonTextArea({
    super.key,
    this.controller,
    this.label,
    this.showLabel = false,
    this.hint,
    this.enabled = true,
    this.rows,
    this.onChanged,
  });

  final TextEditingController? controller;
  final String? label;
  final bool showLabel;
  final String? hint;
  final bool enabled;
  final int? rows;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final visibleRows = rows ?? TS.sizing.textareaRows;
    return Opacity(
      opacity: enabled ? TS.opacity.visible : TS.opacity.disabled,
      child: TextField(
        controller: controller,
        enabled: enabled,
        minLines: visibleRows,
        maxLines: visibleRows,
        onChanged: onChanged,
        style: TS.textStyle.content,
        decoration: InputDecoration(
          labelText: showLabel ? label : null,
          labelStyle: TS.textStyle.caption,
          hintText: hint,
          alignLabelWithHint: true,
          filled: true,
          fillColor: showLabel ? TS.colors.surface : TS.colors.surfaceRecessed,
          border: showLabel ? null : InputBorder.none,
          enabledBorder: showLabel ? null : InputBorder.none,
          focusedBorder: showLabel ? null : InputBorder.none,
        ),
      ),
    );
  }
}
