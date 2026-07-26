import 'package:flutter/material.dart';

import '../theme/ts.dart';
import 'select.dart';

/// 对齐 pbwork `RadioGroup`。
class CommonRadioGroup<T> extends StatelessWidget {
  const CommonRadioGroup({
    super.key,
    required this.options,
    required this.value,
    this.label,
    this.enabled = true,
    this.onChanged,
  });

  final List<CommonSelectOption<T>> options;
  final T? value;
  final String? label;
  final bool enabled;
  final ValueChanged<T?>? onChanged;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!, style: TS.textStyle.label),
          SizedBox(height: TS.spacing.xs),
        ],
        RadioGroup<T>(
          groupValue: value,
          onChanged: enabled
              ? (onChanged ?? (_) {})
              : (_) {},
          child: Column(
            children: [
              for (final opt in options)
                RadioListTile<T>(
                  value: opt.value,
                  title: Text(opt.label, style: TS.textStyle.content),
                  contentPadding: EdgeInsets.zero,
                  enabled: enabled,
                ),
            ],
          ),
        ),
      ],
    );
  }
}
