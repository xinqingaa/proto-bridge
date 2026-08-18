import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import 'choice_option.dart';

/// 对齐 pbwork `RadioGroup`。默认选中色为 `color.primary`。
/// Flutter 暂不暴露 Token-ref 色槽参数。
class CommonRadioGroup<T> extends StatelessWidget {
  const CommonRadioGroup({
    super.key,
    required this.options,
    required this.value,
    this.label,
    this.enabled = true,
    this.onChanged,
  });

  final List<CommonChoiceOption<T>> options;
  final T? value;
  final String? label;
  final bool enabled;
  final ValueChanged<T?>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final interactive = enabled && onChanged != null;
    return Opacity(
      opacity: interactive ? TS.opacity.visible : TS.opacity.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label != null) ...[
            Text(label!, style: TS.textStyle.caption),
            SizedBox(height: TS.spacing.sm),
          ],
          RadioGroup<T>(
            groupValue: value,
            onChanged: (next) {
              if (interactive) onChanged!(next);
            },
            child: Column(
              children: [
                for (final opt in options)
                  RadioListTile<T>(
                    value: opt.value,
                    title: Text(opt.label, style: TS.textStyle.content),
                    contentPadding: EdgeInsets.zero,
                    enabled: interactive,
                    activeColor: TS.colors.primary,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
