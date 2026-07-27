import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork `SwitchControl`。
class CommonSwitch extends StatelessWidget {
  const CommonSwitch({
    super.key,
    required this.value,
    this.label,
    this.enabled = true,
    this.onChanged,
  });

  final bool value;
  final String? label;
  final bool enabled;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    if (label == null) {
      return Switch(
        value: value,
        onChanged: enabled ? onChanged : null,
        activeThumbColor: TS.colors.primary,
      );
    }
    return SwitchListTile(
      value: value,
      onChanged: enabled ? onChanged : null,
      title: Text(label!, style: TS.textStyle.content),
      contentPadding: EdgeInsets.zero,
      activeThumbColor: TS.colors.primary,
    );
  }
}
