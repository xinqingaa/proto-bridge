import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'chip.dart';

class CommonFilterItem {
  const CommonFilterItem({required this.value, required this.label});

  final String value;
  final String label;
}

/// 对齐 pbwork `FilterBar`。
class CommonFilterBar extends StatelessWidget {
  const CommonFilterBar({
    super.key,
    required this.items,
    required this.selected,
    required this.onSelected,
    this.showFilterAction = false,
    this.onFilterTap,
    this.itemRadius,
  });

  final List<CommonFilterItem> items;
  final Set<String> selected;
  final ValueChanged<String> onSelected;
  final bool showFilterAction;
  final VoidCallback? onFilterTap;
  final double? itemRadius;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return SizedBox(
      height: TS.sizing.controlMd + TS.spacing.xs,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final item in items) ...[
            CommonChip(
              label: item.label,
              selected: selected.contains(item.value),
              onTap: () => onSelected(item.value),
              radius: itemRadius,
            ),
            SizedBox(width: TS.spacing.sm),
          ],
          if (showFilterAction)
            IconButton(
              onPressed: onFilterTap,
              icon: Icon(Icons.tune, color: TS.colors.secondary),
              tooltip: '筛选',
            ),
        ],
      ),
    );
  }
}
