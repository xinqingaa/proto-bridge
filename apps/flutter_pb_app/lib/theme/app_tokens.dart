import 'package:flutter/material.dart';

import 'app_colors.dart';

/// 对齐 pbwork `spacing.*` token（逻辑像素）。
class AppSpacing {
  const AppSpacing();

  double get none => 0;
  double get xxs => 2;
  double get xs => 4;
  double get xsPlus => 6;
  double get sm => 8;
  double get smPlus => 12;
  double get md => 16;
  double get lg => 24;
  double get xl => 32;
  double get lgPlus => 40;
  double get xxl => 48;
  double get xxxl => 64;

  /// Producer `toast.gap` 的 10px 垂直内边距；不并入 4/8 刻度。
  double get toastGap => 10;
}

/// 对齐 pbwork `sizing.*` token。
class AppSizing {
  const AppSizing();

  double get controlSm => 32;
  double get controlMd => 40;
  double get controlLg => 48;
  double get iconSm => 16;
  double get iconCompact => 18;
  double get iconMd => 20;
  double get iconLg => 24;
  double get avatarSm => 28;
  double get avatarMd => 40;
  double get avatarLg => 56;
  double get touch => 44;
  double get menuItem => 48;
  double get tab => 44;
  double get bottomNavigation => 64;
  double get caret => 5;
  double get indicatorThickness => 3;
  double get progressStroke => 2;
  double get progressTrack => 6;
  double get refreshActionHeight => 36;
  double get refreshActionMinWidth => 96;
  double get stepDot => 6;
  int get textareaRows => 3;

  /// 面板高度档位按视口比例消费（Producer 的 50dvh / 86dvh）。
  double get panelMedium => 0.5;
  double get panelLarge => 0.86;
  double get ring => 112;
  double get brand => 72;
  double get plot => 160;
  double get actionMinInline => 0;
  double get compactHeight => 36;
  double get compactSelectionHeight => 30;
  double get badgeLabelSize => 10;
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
  const AppOpacity({required this.isDark});

  final bool isDark;

  double get disabled => 0.38;
  double get muted => 0.62;
  double get hover => 0.08;
  double get pressed => 0.14;
  double get overlay => 0.6;
  double get glass => isDark ? 0.8 : 0.76;
  double get translucent => 0.76;
  double get hidden => 0;
  double get visible => 1;
  double get dataLow => 0.3;
  double get dataMedium => 0.65;
  double get dataHigh => 1;
}

/// 对齐 pbwork `motion.*` token。
class AppMotion {
  const AppMotion();

  Duration get durationFast => const Duration(milliseconds: 120);
  Duration get durationInstant => Duration.zero;
  Duration get durationNormal => const Duration(milliseconds: 200);
  Duration get durationSlow => const Duration(milliseconds: 320);
  Duration get durationSheet => const Duration(milliseconds: 220);
  Duration get durationTabViewport => const Duration(milliseconds: 240);
  Duration get durationToast => const Duration(milliseconds: 4000);
  Duration get durationClickSuppression => const Duration(milliseconds: 450);
  Curve get easingGentle => Curves.ease;
  Curve get easingStandard => const Cubic(0.2, 0, 0, 1);
  Curve get easingEmphasized => const Cubic(0.2, 0.8, 0.2, 1);
  double get rotateHalfTurn => 0.5;
  double get scalePressed => 0.98;
  double get scalePressedStrong => 0.96;
}

/// 对齐 pbwork `elevation.*`。
///
/// 常规 surface 使用 Material elevation 数字；`elevation.glass` 保留主题相关的
/// 单层低对比阴影，以供静态玻璃 Decoration 直接绘制。
class AppElevation {
  const AppElevation({required this.isDark});

  final bool isDark;

  double get none => 0;
  double get card => 1;
  BoxShadow get glass => BoxShadow(
    color: isDark
        ? const Color.fromRGBO(0, 0, 0, 0.28)
        : const Color.fromRGBO(15, 23, 42, 0.08),
    blurRadius: 18,
    offset: const Offset(0, 6),
  );
  double get raised => 4;
  double get level1 => 1;
  double get level2 => 3;
  double get level3 => 6;
  double get level4 => 8;
  double get level5 => 12;

  BoxShadow get menu => BoxShadow(
    color: const Color.fromRGBO(15, 23, 42, 0.14),
    blurRadius: 20,
    offset: const Offset(0, 8),
  );
  BoxShadow get overlay => BoxShadow(
    color: const Color.fromRGBO(15, 23, 42, 0.2),
    blurRadius: 48,
    offset: const Offset(0, 22),
  );
  List<BoxShadow> get surface => const [
    BoxShadow(
      color: Color.fromRGBO(15, 23, 42, 0.08),
      blurRadius: 2,
      offset: Offset(0, 1),
    ),
    BoxShadow(
      color: Color.fromRGBO(15, 23, 42, 0.06),
      blurRadius: 24,
      offset: Offset(0, 8),
    ),
  ];
}

/// 对齐组件实际消费的 `border.*` token。
class AppBorderTokens {
  const AppBorderTokens({required this.colors});

  final AppColors colors;

  BorderSide get defaultBorder => BorderSide(color: colors.border);
  BorderSide get strong => BorderSide(color: colors.outline, width: 2);
  BorderSide get focus => BorderSide(color: colors.primary, width: 2);
  BorderSide get hairline => BorderSide(color: colors.divider);
  BorderSide get glass => BorderSide(color: colors.glassEdge);
  double get widthHairline => 1;
  double get widthStrong => 2;
  double get accentWidth => 4;
}

/// 对齐跨栈布局语义；值是 Flutter 逻辑像素、比例或 Insets。
class AppLayoutTokens {
  const AppLayoutTokens();

  double get dialogMaxWidth => 320;
  double get formMaxWidth => 480;
  double get fill => 1;
  double get flexFill => 1;
  double get flexGrow => 1;
  double get focusInset => -4;
  double get gestureAxisLock => 8;
  double get gestureDragLimit => 72;
  double get gestureSwipeThreshold => 44;
  double get half => 0.5;
  double get halfNegative => -0.5;
  double get insetSmNegative => -8;
  double get insetXsNegative => -4;
  EdgeInsets get loadMoreRootMargin => const EdgeInsets.only(bottom: 120);
  double get menuMaxHeight => 304;
  double get pullRefreshMaxDistance => 112;
  double get pullRefreshThreshold => 64;
  double get sheetMaxHeight => 560;
  double get translateFullNegative => -1;
  double get viewportHeight => 1;
  double get chartMinHeight => 154;
  double get chartPlotHeight => 124;
}

class AppLayerTokens {
  const AppLayerTokens();

  double get base => 0;
  double get content => 1;
}

class AppEffectTokens {
  const AppEffectTokens();

  /// Flutter 近似 CSS `blur(12px) saturate(1.06)` 的 blur sigma。
  double get glassBackdropBlur => 12;

  /// Producer 的基础包没有图形投影；保留空列表作为显式“无效果”。
  List<BoxShadow> get artworkShadow => const [];
}

/// Producer `asset.*` 在当前 target 尚未绑定真实文件；空值表示显式未提供。
class AppAssets {
  const AppAssets();

  String? get brandMark => null;
  String? get brandWordmark => null;
  String? get emptyIllustration => null;
  String? get launchImage => null;
}
