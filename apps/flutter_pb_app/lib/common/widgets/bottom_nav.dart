import 'package:flutter/material.dart';

import '../../theme/ts.dart';

class CommonBottomNavItem {
  const CommonBottomNavItem({
    required this.value,
    required this.label,
    required this.icon,
    this.activeIcon,
  });

  final String value;
  final String label;
  final IconData icon;
  final IconData? activeIcon;
}

/// 对齐 pbwork BottomNavigation `display`。
enum CommonBottomNavDisplay { iconLabel, icon, label }

/// 对齐 pbwork `BottomNavigation`。
///
/// 支持展示模式、顶部选中指示条、抬升阴影。
class CommonBottomNav extends StatelessWidget {
  const CommonBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.display = CommonBottomNavDisplay.iconLabel,
    this.showIndicator = false,
    this.elevated = true,
  });

  final List<CommonBottomNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final CommonBottomNavDisplay display;
  final bool showIndicator;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Material(
      color: TS.colors.surfaceRaised,
      elevation: elevated ? TS.elevation.level3 : TS.elevation.none,
      shadowColor: Colors.black26,
      child: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: TS.border.hairline)),
        child: Padding(
          padding: EdgeInsets.only(bottom: bottomInset),
          child: SizedBox(
            height: TS.sizing.bottomNavigation,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final itemWidth = constraints.maxWidth / items.length;
                final indicatorWidth = itemWidth * 0.36;

                return Stack(
                  children: [
                    Row(
                      children: [
                        for (var i = 0; i < items.length; i++)
                          Expanded(
                            child: _NavTile(
                              item: items[i],
                              selected: i == currentIndex,
                              display: display,
                              onTap: () => onTap(i),
                            ),
                          ),
                      ],
                    ),
                    if (showIndicator)
                      AnimatedPositioned(
                        duration: TS.motion.durationNormal,
                        curve: Curves.easeOut,
                        top: 0,
                        left:
                            itemWidth * currentIndex +
                            (itemWidth - indicatorWidth) / 2,
                        width: indicatorWidth,
                        height: 3,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: TS.colors.primary,
                            borderRadius: BorderRadius.circular(TS.radius.full),
                          ),
                        ),
                      ),
                  ],
                );
              },
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
    required this.display,
    required this.onTap,
  });

  final CommonBottomNavItem item;
  final bool selected;
  final CommonBottomNavDisplay display;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected
        ? TS.colors.navigationActive
        : TS.colors.onSurfaceMuted;
    final showIcon = display != CommonBottomNavDisplay.label;
    final showLabel = display != CommonBottomNavDisplay.icon;
    final labelStyle =
        (selected ? TS.textStyle.captionStrong : TS.textStyle.caption).copyWith(
          color: color,
        );

    return InkWell(
      onTap: onTap,
      splashFactory: NoSplash.splashFactory,
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (showIcon)
            Icon(
              selected ? (item.activeIcon ?? item.icon) : item.icon,
              size: TS.sizing.iconMd,
              color: color,
            ),
          if (showIcon && showLabel) SizedBox(height: TS.spacing.xxs),
          if (showLabel) Text(item.label, style: labelStyle),
        ],
      ),
    );
  }
}
