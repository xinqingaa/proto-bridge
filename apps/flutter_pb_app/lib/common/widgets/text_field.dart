import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork `TextField` — 官方 [TextField]。
class CommonTextField extends StatelessWidget {
  const CommonTextField({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.enabled = true,
    this.obscureText = false,
    this.keyboardType,
    this.onChanged,
    this.onSubmitted,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final bool enabled;
  final bool obscureText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return TextField(
      controller: controller,
      enabled: enabled,
      obscureText: obscureText,
      keyboardType: keyboardType,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      style: TS.textStyle.content,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
      ),
    );
  }
}
