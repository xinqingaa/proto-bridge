import 'package:flutter/material.dart';

import '../theme/ts.dart';

/// 对齐 pbwork `Textarea` — 官方多行 [TextField]。
class CommonTextArea extends StatelessWidget {
  const CommonTextArea({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.enabled = true,
    this.minLines = 3,
    this.maxLines = 6,
    this.onChanged,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final bool enabled;
  final int minLines;
  final int maxLines;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return TextField(
      controller: controller,
      enabled: enabled,
      minLines: minLines,
      maxLines: maxLines,
      onChanged: onChanged,
      style: TS.textStyle.content,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: true,
      ),
    );
  }
}
