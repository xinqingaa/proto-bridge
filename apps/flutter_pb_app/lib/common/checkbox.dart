import 'package:flutter/material.dart';

import '../theme/ts.dart';

/// 对齐 pbwork `Checkbox`。
class CommonCheckbox extends StatelessWidget {
  const CommonCheckbox({
    super.key,
    required this.value,
    this.label,
    this.enabled = true,
    this.onChanged,
  });

  final bool value;
  final String? label;
  final bool enabled;
  final ValueChanged<bool?>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final box = Checkbox(
      value: value,
      onChanged: enabled ? onChanged : null,
      activeColor: TS.colors.primary,
    );
    if (label == null) return box;
    return CheckboxListTile(
      value: value,
      onChanged: enabled ? onChanged : null,
      title: Text(label!, style: TS.textStyle.content),
      controlAffinity: ListTileControlAffinity.leading,
      contentPadding: EdgeInsets.zero,
      activeColor: TS.colors.primary,
    );
  }
}
