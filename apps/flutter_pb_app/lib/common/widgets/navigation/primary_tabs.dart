import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import 'liquid_glass_decoration.dart';
import 'tab_item.dart';

/// 一级页内分区：官方 [TabBar] 承担布局、交互和选中面动画。
class CommonPrimaryTabs extends StatelessWidget {
  const CommonPrimaryTabs({
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
    final trackHeight = TS.sizing.controlMd + TS.spacing.xs * 2;
    final trackRadius = BorderRadius.circular(TS.radius.lg);

    return DecoratedBox(
      key: const ValueKey('primary-tabs-track'),
      decoration: BoxDecoration(
        color: TS.colors.surfaceRecessed,
        borderRadius: trackRadius,
        border: showDivider ? Border.fromBorderSide(TS.border.hairline) : null,
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: TS.spacing.xs),
        child: SizedBox(
          width: double.infinity,
          height: trackHeight,
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
            labelPadding: EdgeInsets.zero,
            dividerColor: Colors.transparent,
            dividerHeight: 0,
            indicatorWeight: 0,
            indicatorSize: TabBarIndicatorSize.tab,
            indicatorPadding: EdgeInsets.symmetric(vertical: TS.spacing.xs),
            indicatorAnimation: TabIndicatorAnimation.linear,
            indicator: LiquidGlassDecoration(
              surfaceColor: TS.colors.surfaceSelected,
              opacity: TS.opacity.glass,
              borderRadius: BorderRadius.circular(TS.radius.full),
              shadow: TS.elevation.glass,
            ),
            splashFactory: NoSplash.splashFactory,
            overlayColor: const WidgetStatePropertyAll(Colors.transparent),
            tabs: [
              for (final item in items)
                Tab(
                  height: trackHeight,
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
                    child: Text(item.label),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
