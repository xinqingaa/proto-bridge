import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork `SearchBar`。
class CommonSearchBar extends StatelessWidget {
  const CommonSearchBar({
    super.key,
    this.controller,
    this.hint = '搜索',
    this.enabled = true,
    this.onChanged,
    this.onSubmitted,
  });

  final TextEditingController? controller;
  final String hint;
  final bool enabled;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return TextField(
      controller: controller,
      enabled: enabled,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      textInputAction: TextInputAction.search,
      style: TS.textStyle.content,
      decoration: InputDecoration(
        hintText: hint,
        prefixIcon: Icon(Icons.search, color: TS.colors.onSurfaceMuted),
        filled: true,
        fillColor: TS.colors.surfaceVariant,
      ),
    );
  }
}
