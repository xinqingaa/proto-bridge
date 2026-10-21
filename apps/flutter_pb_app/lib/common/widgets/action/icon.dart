import 'package:flutter/material.dart';

import '../../../theme/ts.dart';

/// PBWork `icon.name` 的 35 个稳定 PBWork 图形 id。
enum CommonIconName {
  more,
  plus,
  search,
  settings,
  home,
  list,
  user,
  inbox,
  check,
  chevronDown,
  chevronLeft,
  chevronRight,
  alertTriangle,
  alertCircle,
  clock,
  refreshCw,
  calendarCurrent,
  clipboardCheck,
  shieldCheck,
  folderOpen,
  thermometer,
  snowflake,
  copy,
  fileText,
  slidersHorizontal,
  mapPin,
  radio,
  truck,
  dumbbell,
  eye,
  eyeOff,
  footprints,
  personStanding,
  sparkles,
  x,
}

enum CommonIconSize { sm, md, lg }

enum CommonIconTone {
  inherit,
  onSurface,
  muted,
  primary,
  action,
  error,
  success,
  warning,
}

extension CommonIconNameAsset on CommonIconName {
  String get assetPath {
    final id = name.replaceAllMapped(
      RegExp('[A-Z]'),
      (match) => '-${match[0]!.toLowerCase()}',
    );
    return 'assets/icons/$id.png';
  }
}

/// PBWork `icon` 的 Flutter 实现；使用策展后的稳定图片资源。
class CommonIcon extends StatelessWidget {
  const CommonIcon({
    super.key,
    required this.name,
    this.size = CommonIconSize.md,
    this.tone = CommonIconTone.inherit,
    this.label,
    this.dimension,
    this.color,
  });

  final CommonIconName name;
  final CommonIconSize size;
  final CommonIconTone tone;
  final String? label;
  final double? dimension;
  final Color? color;

  double _size(TS ts) => switch (size) {
    CommonIconSize.sm => ts.sizing.iconSm,
    CommonIconSize.md => ts.sizing.iconMd,
    CommonIconSize.lg => ts.sizing.iconLg,
  };

  Color? _color(TS ts) => switch (tone) {
    CommonIconTone.inherit => null,
    CommonIconTone.onSurface => ts.colors.onSurface,
    CommonIconTone.muted => ts.colors.onSurfaceMuted,
    CommonIconTone.primary => ts.colors.primary,
    CommonIconTone.action => ts.colors.action,
    CommonIconTone.error => ts.colors.error,
    CommonIconTone.success => ts.colors.success,
    CommonIconTone.warning => ts.colors.warning,
  };

  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    return Image.asset(
      name.assetPath,
      width: dimension ?? _size(ts),
      height: dimension ?? _size(ts),
      color:
          color ??
          _color(ts) ??
          IconTheme.of(context).color ??
          ts.colors.onSurface,
      colorBlendMode: BlendMode.srcIn,
      excludeFromSemantics: label == null || label!.isEmpty,
      semanticLabel: label,
    );
  }
}
