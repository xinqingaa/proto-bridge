import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

import '../../theme/ts.dart';
import 'tab_item.dart';

/// 一级页内分区：官方 [TabBar] 承担交互，[LiquidGlass] 承担轨道表面。
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
    final radius = BorderRadius.circular(TS.radius.lg);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: TS.colors.surfaceRecessed,
        borderRadius: radius,
        border: showDivider ? Border.fromBorderSide(TS.border.hairline) : null,
      ),
      child: LiquidGlass(
        height: TS.sizing.controlMd,
        padding: EdgeInsets.all(TS.spacing.xs),
        borderRadius: radius,
        blurSigma: TS.effect.glassBackdropBlur,
        enableShadow: true,
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
          indicatorSize: TabBarIndicatorSize.tab,
          indicator: BoxDecoration(
            color: TS.colors.surfaceSelected.withValues(
              alpha: TS.opacity.glass,
            ),
            borderRadius: BorderRadius.circular(TS.radius.full),
            boxShadow: [
              BoxShadow(
                color: TS.colors.scrim.withValues(alpha: TS.opacity.hover),
                blurRadius: TS.elevation.glass * 2,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          indicatorAnimation: TabIndicatorAnimation.elastic,
          splashFactory: NoSplash.splashFactory,
          overlayColor: const WidgetStatePropertyAll(Colors.transparent),
          tabs: [for (final item in items) Tab(text: item.label)],
        ),
      ),
    );
  }
}
