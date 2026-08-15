import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../theme/ts.dart';

/// PBWork `icon.name` 的 32 个稳定 Lucide id。
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
  chevronRight,
  alertTriangle,
  alertCircle,
  clock,
  refreshCw,
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

extension CommonIconNameData on CommonIconName {
  IconData get data => switch (this) {
    CommonIconName.more => LucideIcons.moreHorizontal,
    CommonIconName.plus => LucideIcons.plus,
    CommonIconName.search => LucideIcons.search,
    CommonIconName.settings => LucideIcons.settings,
    CommonIconName.home => LucideIcons.home,
    CommonIconName.list => LucideIcons.list,
    CommonIconName.user => LucideIcons.user,
    CommonIconName.inbox => LucideIcons.inbox,
    CommonIconName.check => LucideIcons.check,
    CommonIconName.chevronDown => LucideIcons.chevronDown,
    CommonIconName.chevronRight => LucideIcons.chevronRight,
    CommonIconName.alertTriangle => LucideIcons.triangleAlert,
    CommonIconName.alertCircle => LucideIcons.circleAlert,
    CommonIconName.clock => LucideIcons.clock,
    CommonIconName.refreshCw => LucideIcons.refreshCw,
    CommonIconName.clipboardCheck => LucideIcons.clipboardCheck,
    CommonIconName.shieldCheck => LucideIcons.shieldCheck,
    CommonIconName.folderOpen => LucideIcons.folderOpen,
    CommonIconName.thermometer => LucideIcons.thermometer,
    CommonIconName.snowflake => LucideIcons.snowflake,
    CommonIconName.copy => LucideIcons.copy,
    CommonIconName.fileText => LucideIcons.fileText,
    CommonIconName.slidersHorizontal => LucideIcons.slidersHorizontal,
    CommonIconName.mapPin => LucideIcons.mapPin,
    CommonIconName.radio => LucideIcons.radio,
    CommonIconName.truck => LucideIcons.truck,
    CommonIconName.dumbbell => LucideIcons.dumbbell,
    CommonIconName.eye => LucideIcons.eye,
    CommonIconName.eyeOff => LucideIcons.eyeOff,
    CommonIconName.footprints => LucideIcons.footprints,
    CommonIconName.personStanding => LucideIcons.personStanding,
    CommonIconName.sparkles => LucideIcons.sparkles,
  };
}

/// PBWork `icon` 的 Flutter 实现；只接受策展后的稳定 Lucide id。
class CommonIcon extends StatelessWidget {
  const CommonIcon({
    super.key,
    required this.name,
    this.size = CommonIconSize.md,
    this.tone = CommonIconTone.inherit,
    this.label,
  });

  final CommonIconName name;
  final CommonIconSize size;
  final CommonIconTone tone;
  final String? label;

  double get _size => switch (size) {
    CommonIconSize.sm => TS.sizing.iconSm,
    CommonIconSize.md => TS.sizing.iconMd,
    CommonIconSize.lg => TS.sizing.iconLg,
  };

  Color? get _color => switch (tone) {
    CommonIconTone.inherit => null,
    CommonIconTone.onSurface => TS.colors.onSurface,
    CommonIconTone.muted => TS.colors.onSurfaceMuted,
    CommonIconTone.primary => TS.colors.primary,
    CommonIconTone.action => TS.colors.action,
    CommonIconTone.error => TS.colors.error,
    CommonIconTone.success => TS.colors.success,
    CommonIconTone.warning => TS.colors.warning,
  };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Icon(
      name.data,
      size: _size,
      color: _color,
      semanticLabel: label == null || label!.isEmpty ? null : label,
    );
  }
}
