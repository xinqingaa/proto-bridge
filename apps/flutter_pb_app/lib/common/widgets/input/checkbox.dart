import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

/// 对齐 pbwork `Checkbox`。默认选中色为 `color.primary`。
/// Flutter 暂不暴露 Token-ref 色槽参数。
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
      side: BorderSide(
        color: TS.colors.outline,
        width: TS.border.widthHairline,
      ),
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
        side: BorderSide(
          color: TS.colors.outline,
          width: TS.border.widthHairline,
        ),
      ),
    );
  }
}
