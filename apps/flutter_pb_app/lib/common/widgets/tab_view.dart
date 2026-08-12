import 'package:flutter/material.dart';

/// 对齐 pbwork `TabViewport` — 官方 [TabBarView]。
class CommonTabView extends StatelessWidget {
  const CommonTabView({
    super.key,
    required this.children,
    this.controller,
    this.swipe = true,
  });

  final List<Widget> children;
  final TabController? controller;
  final bool swipe;

  @override
  Widget build(BuildContext context) {
    return TabBarView(
      controller: controller,
      physics: swipe
          ? const PageScrollPhysics()
          : const NeverScrollableScrollPhysics(),
      children: children,
    );
  }
}
