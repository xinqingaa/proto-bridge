import 'package:flutter/material.dart';
import 'package:unified_popups/liquid_glass.dart';

import '../../../theme/ts.dart';

enum CommonSurfaceMaterial { solid, glass }

/// A material-only container; scrolling, input and navigation belong to its child.
class CommonGlassSurface extends StatelessWidget {
  const CommonGlassSurface({
    super.key,
    required this.child,
    this.borderRadius,
    this.clear = false,
    this.reduceTransparency = false,
    this.tint,
  });

  final Widget child;
  final BorderRadius? borderRadius;
  final bool clear;
  final bool reduceTransparency;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    final radius = borderRadius ?? BorderRadius.zero;
    if (reduceTransparency || MediaQuery.highContrastOf(context)) {
      return DecoratedBox(
        decoration: BoxDecoration(
          color: ts.colors.surface,
          border: Border.fromBorderSide(ts.border.defaultBorder),
          borderRadius: radius,
        ),
        child: ClipRRect(borderRadius: radius, child: child),
      );
    }
    return LiquidGlass(
      borderRadius: radius,
      style: ts.glassStyle(clear: clear, tint: tint),
      enableShadow: true,
      child: child,
    );
  }
}
