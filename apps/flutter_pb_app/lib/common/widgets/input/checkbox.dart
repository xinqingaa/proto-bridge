import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

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
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final box = Checkbox(
      value: value,
      onChanged: enabled && onChanged != null
          ? (next) => onChanged!(next ?? false)
          : null,
      activeColor: TS.colors.primary,
      checkColor: TS.colors.onPrimary,
      side: TS.border.strong,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TS.radius.xs),
      ),
    );
    if (label == null) {
      return Opacity(
        opacity: enabled ? TS.opacity.visible : TS.opacity.disabled,
        child: box,
      );
    }
    return Opacity(
      opacity: enabled ? TS.opacity.visible : TS.opacity.disabled,
      child: CheckboxListTile(
        value: value,
        onChanged: enabled && onChanged != null
            ? (next) => onChanged!(next ?? false)
            : null,
        title: Text(label!, style: TS.textStyle.content),
        controlAffinity: ListTileControlAffinity.leading,
        contentPadding: EdgeInsets.zero,
        activeColor: TS.colors.primary,
        checkColor: TS.colors.onPrimary,
        checkboxShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(TS.radius.xs),
        ),
        side: TS.border.strong,
      ),
    );
  }
}
