/// 对齐 pbwork `spacing.*` token（逻辑像素）。
class AppSpacing {
  const AppSpacing();

  double get none => 0;
  double get xxs => 2;
  double get xs => 4;
  double get sm => 8;
  double get smPlus => 12;
  double get md => 16;
  double get lg => 24;
  double get xl => 32;
  double get lgPlus => 40;
  double get xxl => 48;
  double get xxxl => 64;
}

/// 对齐 pbwork `sizing.*` token。
class AppSizing {
  const AppSizing();

  double get controlSm => 32;
  double get controlMd => 40;
  double get controlLg => 48;
  double get iconSm => 16;
  double get iconMd => 20;
  double get iconLg => 24;
  double get avatarSm => 28;
  double get avatarMd => 40;
  double get avatarLg => 56;
  double get touch => 44;
  double get menuItem => 48;
  double get tab => 44;
  double get bottomNavigation => 64;
}

/// 对齐 pbwork `radius.*` token。
class AppRadius {
  const AppRadius();

  double get none => 0;
  double get xs => 4;
  double get sm => 8;
  double get md => 12;
  double get lg => 16;
  double get xl => 24;
  double get full => 999;
}

/// 对齐 pbwork `opacity.*` token。
class AppOpacity {
  const AppOpacity();

  double get disabled => 0.38;
  double get muted => 0.62;
  double get hover => 0.08;
  double get pressed => 0.14;
  double get overlay => 0.6;
}

/// 对齐 pbwork `motion.*` token。
class AppMotion {
  const AppMotion();

  Duration get durationFast => const Duration(milliseconds: 120);
  Duration get durationNormal => const Duration(milliseconds: 200);
  Duration get durationSlow => const Duration(milliseconds: 320);
}

/// 对齐 pbwork `elevation.*` — Flutter 侧用 Material elevation 近似。
class AppElevation {
  const AppElevation();

  double get none => 0;
  double get card => 1;
  double get raised => 4;
  double get level1 => 1;
  double get level2 => 3;
  double get level3 => 6;
  double get level4 => 8;
  double get level5 => 12;
}
