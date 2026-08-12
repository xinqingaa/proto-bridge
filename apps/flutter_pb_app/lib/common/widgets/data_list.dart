import 'package:flutter/material.dart';

import '../../theme/ts.dart';

enum CommonDataListSurface { none, standard, raised }

enum CommonDataListRounded { none, sm, md, lg }

/// Flutter 原生列表；PBWork `data-list` 的 item slot 翻译为 builder。
class CommonDataList extends StatelessWidget {
  const CommonDataList({
    super.key,
    required this.itemCount,
    required this.itemBuilder,
    this.separatorBuilder,
    this.divided = true,
    this.inset = false,
    this.surface = CommonDataListSurface.standard,
    this.rounded = CommonDataListRounded.md,
    this.elevated = false,
    this.shrinkWrap = false,
    this.physics,
    this.padding,
    this.controller,
  });

  final int itemCount;
  final IndexedWidgetBuilder itemBuilder;
  final IndexedWidgetBuilder? separatorBuilder;
  final bool divided;
  final bool inset;
  final CommonDataListSurface surface;
  final CommonDataListRounded rounded;
  final bool elevated;
  final bool shrinkWrap;
  final ScrollPhysics? physics;
  final EdgeInsetsGeometry? padding;
  final ScrollController? controller;

  double get _radius => switch (rounded) {
    CommonDataListRounded.none => TS.radius.none,
    CommonDataListRounded.sm => TS.radius.sm,
    CommonDataListRounded.md => TS.radius.md,
    CommonDataListRounded.lg => TS.radius.lg,
  };

  Color? get _surfaceColor => switch (surface) {
    CommonDataListSurface.none => null,
    CommonDataListSurface.standard => TS.colors.surface,
    CommonDataListSurface.raised => TS.colors.surfaceRaised,
  };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final list = divided
        ? ListView.separated(
            controller: controller,
            shrinkWrap: shrinkWrap,
            physics: physics,
            padding: padding,
            itemCount: itemCount,
            itemBuilder: itemBuilder,
            separatorBuilder:
                separatorBuilder ??
                (_, _) => Divider(
                  height: TS.border.widthHairline,
                  thickness: TS.border.widthHairline,
                  indent: inset ? TS.spacing.md : TS.spacing.none,
                  endIndent: inset ? TS.spacing.md : TS.spacing.none,
                  color: TS.colors.divider,
                ),
          )
        : ListView.builder(
            controller: controller,
            shrinkWrap: shrinkWrap,
            physics: physics,
            padding: padding,
            itemCount: itemCount,
            itemBuilder: itemBuilder,
          );

    if (_surfaceColor == null && !elevated && _radius == TS.radius.none) {
      return list;
    }
    return Material(
      color: _surfaceColor ?? Colors.transparent,
      elevation: elevated ? TS.elevation.card : TS.elevation.none,
      shadowColor: TS.colors.scrim,
      borderRadius: BorderRadius.circular(_radius),
      clipBehavior: Clip.antiAlias,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(_radius),
          border: surface == CommonDataListSurface.none
              ? null
              : Border.fromBorderSide(TS.border.defaultBorder),
        ),
        child: list,
      ),
    );
  }
}
