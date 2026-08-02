import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork DataList `surface`。
enum CommonDataListSurface { none, standard, raised }

/// 对齐 pbwork DataList `rounded`。
enum CommonDataListRounded { none, sm, md, lg }

/// 对齐 pbwork `DataList` — 列表外观容器（分隔、表面、圆角、阴影）。
class CommonDataList extends StatelessWidget {
  const CommonDataList({
    super.key,
    required this.children,
    this.divided = true,
    this.inset = false,
    this.surface = CommonDataListSurface.standard,
    this.rounded = CommonDataListRounded.md,
    this.elevated = false,
    this.shrinkWrap = true,
    this.physics,
    this.padding,
  });

  final List<Widget> children;
  final bool divided;
  final bool inset;
  final CommonDataListSurface surface;
  final CommonDataListRounded rounded;
  final bool elevated;
  final bool shrinkWrap;
  final ScrollPhysics? physics;
  final EdgeInsetsGeometry? padding;

  double get _radius {
    switch (rounded) {
      case CommonDataListRounded.none:
        return TS.radius.none;
      case CommonDataListRounded.sm:
        return TS.radius.sm;
      case CommonDataListRounded.md:
        return TS.radius.md;
      case CommonDataListRounded.lg:
        return TS.radius.lg;
    }
  }

  Color? get _surfaceColor {
    switch (surface) {
      case CommonDataListSurface.none:
        return null;
      case CommonDataListSurface.standard:
        return TS.colors.surface;
      case CommonDataListSurface.raised:
        return TS.colors.surfaceRaised;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    final items = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      items.add(children[i]);
      if (divided && i < children.length - 1) {
        items.add(
          Divider(
            height: 1,
            indent: inset ? TS.spacing.md : 0,
            endIndent: inset ? TS.spacing.md : 0,
            color: TS.colors.divider,
          ),
        );
      }
    }

    final list = ListView(
      shrinkWrap: shrinkWrap,
      physics: physics ?? const NeverScrollableScrollPhysics(),
      padding: padding ?? EdgeInsets.zero,
      children: items,
    );

    final color = _surfaceColor;
    if (color == null && !elevated && rounded == CommonDataListRounded.none) {
      return list;
    }

    return Material(
      color: color ?? Colors.transparent,
      elevation: elevated ? TS.elevation.card : TS.elevation.none,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(_radius),
      clipBehavior: Clip.antiAlias,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(_radius),
          border: surface == CommonDataListSurface.none
              ? null
              : Border.all(color: TS.colors.border),
        ),
        child: list,
      ),
    );
  }
}
