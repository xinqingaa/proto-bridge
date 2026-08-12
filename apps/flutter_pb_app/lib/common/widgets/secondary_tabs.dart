import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'tab_item.dart';

/// 二级页内分区：官方 [TabBar]，选中态使用文字下方朝上的小三角。
class CommonSecondaryTabs extends StatelessWidget {
  const CommonSecondaryTabs({
    super.key,
    required this.items,
    this.controller,
    this.grow = false,
    this.centered = false,
    this.showDivider = false,
  });

  final List<CommonTabItem> items;
  final TabController? controller;
  final bool grow;
  final bool centered;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        border: showDivider ? Border(bottom: TS.border.hairline) : null,
      ),
      child: TabBar(
        controller: controller,
        isScrollable: !grow,
        tabAlignment: grow
            ? TabAlignment.fill
            : centered
            ? TabAlignment.center
            : TabAlignment.start,
        labelColor: TS.colors.sectionTabActive,
        unselectedLabelColor: TS.colors.onSurfaceMuted,
        labelStyle: TS.textStyle.label,
        unselectedLabelStyle: TS.textStyle.label,
        dividerColor: Colors.transparent,
        indicatorSize: TabBarIndicatorSize.label,
        indicator: _CaretIndicator(
          color: TS.colors.sectionTabActive,
          size: TS.sizing.caret,
        ),
        splashFactory: NoSplash.splashFactory,
        overlayColor: const WidgetStatePropertyAll(Colors.transparent),
        tabs: [for (final item in items) Tab(text: item.label)],
      ),
    );
  }
}

class _CaretIndicator extends Decoration {
  const _CaretIndicator({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) =>
      _CaretPainter(color: color, size: size);
}

class _CaretPainter extends BoxPainter {
  const _CaretPainter({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final bounds = offset & configuration.size!;
    final center = bounds.bottomCenter;
    final path = Path()
      ..moveTo(center.dx - size, center.dy)
      ..lineTo(center.dx, center.dy - size)
      ..lineTo(center.dx + size, center.dy)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }
}
