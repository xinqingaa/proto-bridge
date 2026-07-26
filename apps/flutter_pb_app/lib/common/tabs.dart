import 'package:flutter/material.dart';

import '../theme/ts.dart';

class CommonTabItem {
  const CommonTabItem({required this.value, required this.label});

  final String value;
  final String label;
}

/// 对齐 pbwork `Tabs` — 官方顶部 [TabBar]。
///
/// 需配合 [CommonTabView] 与同一 [TabController] 使用，
/// 或包在 [DefaultTabController] 内。
class CommonTabs extends StatelessWidget {
  const CommonTabs({
    super.key,
    required this.items,
    this.controller,
    this.isScrollable = true,
  });

  final List<CommonTabItem> items;
  final TabController? controller;
  final bool isScrollable;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return TabBar(
      controller: controller,
      isScrollable: isScrollable,
      labelColor: TS.colors.primary,
      unselectedLabelColor: TS.colors.onSurfaceMuted,
      labelStyle: TS.textStyle.label,
      unselectedLabelStyle: TS.textStyle.content,
      indicatorColor: TS.colors.primary,
      tabs: [for (final item in items) Tab(text: item.label)],
    );
  }
}
