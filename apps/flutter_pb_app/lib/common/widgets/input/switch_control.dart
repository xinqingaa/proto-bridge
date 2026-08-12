import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

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
    final control = label == null
        ? Switch(
            value: value,
            onChanged: enabled && onChanged != null ? onChanged : null,
            activeThumbColor: TS.colors.surface,
            activeTrackColor: TS.colors.primary,
            inactiveThumbColor: TS.colors.surface,
            inactiveTrackColor: TS.colors.surfaceVariant,
          )
        : SwitchListTile(
            value: value,
            onChanged: enabled && onChanged != null ? onChanged : null,
            title: Text(label!, style: TS.textStyle.content),
            contentPadding: EdgeInsets.zero,
            activeThumbColor: TS.colors.surface,
            activeTrackColor: TS.colors.primary,
            inactiveThumbColor: TS.colors.surface,
            inactiveTrackColor: TS.colors.surfaceVariant,
          );
    return Opacity(
      opacity: enabled ? TS.opacity.visible : TS.opacity.disabled,
      child: control,
    );
  }
}
