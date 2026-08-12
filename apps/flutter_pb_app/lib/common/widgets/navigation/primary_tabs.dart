import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

import '../../../theme/ts.dart';
import 'tab_item.dart';

/// 一级页内分区：官方 [TabBar] 承担交互，只有选中项使用 [LiquidGlass]。
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
    final effectiveController = controller ?? DefaultTabController.of(context);
    final radius = BorderRadius.circular(TS.radius.lg);
    final tabHeight = TS.sizing.controlMd - TS.spacing.xs * 2;

    return DecoratedBox(
      key: const ValueKey('primary-tabs-track'),
      decoration: BoxDecoration(
        color: TS.colors.surfaceRecessed,
        borderRadius: radius,
        border: showDivider ? Border.fromBorderSide(TS.border.hairline) : null,
      ),
      child: Padding(
        padding: EdgeInsets.all(TS.spacing.xs),
        child: TabBar(
          controller: effectiveController,
          isScrollable: !grow,
          tabAlignment: grow
              ? TabAlignment.fill
              : centered
              ? TabAlignment.center
              : TabAlignment.start,
          labelPadding: EdgeInsets.zero,
          dividerColor: Colors.transparent,
          indicatorColor: Colors.transparent,
          indicator: const BoxDecoration(),
          splashFactory: NoSplash.splashFactory,
          overlayColor: const WidgetStatePropertyAll(Colors.transparent),
          tabs: [
            for (var index = 0; index < items.length; index++)
              Tab(
                height: tabHeight,
                child: AnimatedBuilder(
                  animation: effectiveController,
                  builder: (context, _) {
                    final selected = effectiveController.index == index;
                    final label = Padding(
                      padding: EdgeInsets.symmetric(horizontal: TS.spacing.md),
                      child: Text(
                        items[index].label,
                        style: TS.textStyle.label.copyWith(
                          color: selected
                              ? TS.colors.sectionTabActive
                              : TS.colors.onSurfaceMuted,
                        ),
                      ),
                    );

                    return AnimatedSwitcher(
                      duration: TS.motion.durationSlow,
                      switchInCurve: TS.motion.easingStandard,
                      switchOutCurve: TS.motion.easingStandard,
                      child: selected
                          ? Stack(
                              key: const ValueKey('selected'),
                              alignment: Alignment.center,
                              children: [
                                Positioned.fill(
                                  child: Opacity(
                                    opacity: TS.opacity.glass,
                                    child: LiquidGlass(
                                      key: const ValueKey(
                                        'primary-tabs-selection',
                                      ),
                                      borderRadius: BorderRadius.circular(
                                        TS.radius.full,
                                      ),
                                      blurSigma: TS.effect.glassBackdropBlur,
                                      enableShadow: true,
                                      style: LiquidGlassStyle(
                                        backgroundColor:
                                            TS.colors.surfaceSelected,
                                        borderColor: Colors.transparent,
                                        topHighlightColor: Colors.transparent,
                                        outlineWidth: 0,
                                        topStrokeWidth: 0,
                                      ),
                                      child: const SizedBox.expand(),
                                    ),
                                  ),
                                ),
                                label,
                              ],
                            )
                          : SizedBox(
                              key: const ValueKey('unselected'),
                              height: tabHeight,
                              child: Center(child: label),
                            ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
