import 'package:flutter/material.dart';

import '../theme/ts.dart';

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

/// 对齐 pbwork `BottomNavigation` — 官方 [BottomNavigationBar]（主视图底部 Tab）。
class CommonBottomNav extends StatelessWidget {
  const CommonBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  final List<CommonBottomNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    // 不强制固定高度：Material 底栏 icon+label 所需高度常 > sizing.bottomNavigation(64)，
    // 硬套 SizedBox 会导致 RenderFlex / 文本溢出。
    final labelStyle = TS.textStyle.caption.copyWith(
      fontSize: 11,
      height: 1.1,
    );
    final selectedStyle = TS.textStyle.captionStrong.copyWith(
      fontSize: 11,
      height: 1.1,
    );

    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTap,
      type: BottomNavigationBarType.fixed,
      backgroundColor: TS.colors.surface,
      selectedItemColor: TS.colors.primary,
      unselectedItemColor: TS.colors.onSurfaceMuted,
      selectedFontSize: 11,
      unselectedFontSize: 11,
      selectedLabelStyle: selectedStyle,
      unselectedLabelStyle: labelStyle,
      items: [
        for (final item in items)
          BottomNavigationBarItem(
            icon: Icon(item.icon, size: TS.sizing.iconLg),
            activeIcon: Icon(
              item.activeIcon ?? item.icon,
              size: TS.sizing.iconLg,
            ),
            label: item.label,
          ),
      ],
    );
  }
}
