import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'icon.dart';

class CommonBottomNavItem {
  const CommonBottomNavItem({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final CommonIconName icon;
}

/// 根目的地导航；只负责当前位置和目的地切换。
class CommonBottomNav extends StatelessWidget {
  const CommonBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.grow = true,
  }) : assert(items.length >= 2 && items.length <= 5);

  final List<CommonBottomNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool grow;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    final tiles = [
      for (var index = 0; index < items.length; index++)
        _NavTile(
          item: items[index],
          selected: index == currentIndex,
          onTap: () => onTap(index),
        ),
    ];

    return Material(
      color: TS.colors.surfaceRaised,
      elevation: TS.elevation.level3,
      shadowColor: TS.colors.scrim,
      child: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: TS.border.hairline)),
        child: Padding(
          padding: EdgeInsets.only(bottom: bottomInset),
          child: SizedBox(
            height: TS.sizing.bottomNavigation,
            child: grow
                ? Row(
                    children: [for (final tile in tiles) Expanded(child: tile)],
                  )
                : SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(children: tiles),
                  ),
          ),
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final CommonBottomNavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? TS.colors.navigationActive
        : TS.colors.onSurfaceMuted;
    return Semantics(
      selected: selected,
      button: true,
      label: item.label,
      child: InkWell(
        onTap: onTap,
        splashFactory: NoSplash.splashFactory,
        overlayColor: const WidgetStatePropertyAll(Colors.transparent),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(item.icon.data, size: TS.sizing.iconMd, color: color),
              SizedBox(height: TS.spacing.xxs),
              Text(
                item.label,
                style:
                    (selected
                            ? TS.textStyle.captionStrong
                            : TS.textStyle.caption)
                        .copyWith(color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
