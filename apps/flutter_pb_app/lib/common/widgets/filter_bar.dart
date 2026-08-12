import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'chip.dart';

class CommonFilterItem {
  const CommonFilterItem({required this.value, required this.label});

  final String value;
  final String label;
}

/// 三级快捷筛选：只维护一个当前值，不拥有视图区或高级筛选入口。
class CommonFilterBar extends StatelessWidget {
  const CommonFilterBar({
    super.key,
    required this.items,
    required this.selected,
    this.onSelected,
  });

  final List<CommonFilterItem> items;
  final String selected;
  final ValueChanged<String>? onSelected;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return SizedBox(
      height: TS.sizing.controlMd + TS.spacing.xs,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, _) => SizedBox(width: TS.spacing.sm),
        itemBuilder: (context, index) {
          final item = items[index];
          return CommonChip(
            label: item.label,
            selected: selected == item.value,
            onTap: onSelected == null ? null : () => onSelected!(item.value),
          );
        },
      ),
    );
  }
}
