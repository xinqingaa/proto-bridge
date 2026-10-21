import 'package:flutter/material.dart';

import 'app_colors.dart';

@immutable
class AppTypography {
  const AppTypography({
    this.display = const TextStyle(
      fontWeight: FontWeight.w700,
      fontSize: 40,
      height: 1.15,
    ),
    this.headline = const TextStyle(
      fontWeight: FontWeight.w700,
      fontSize: 28,
      height: 1.2,
    ),
    this.titleLg = const TextStyle(
      fontWeight: FontWeight.w700,
      fontSize: 24,
      height: 1.25,
    ),
    this.title = const TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 20,
      height: 1.3,
    ),
    this.titleSm = const TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 18,
      height: 1.35,
    ),
    this.subtitle = const TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 16,
      height: 1.4,
    ),
    this.bodyLg = const TextStyle(
      fontWeight: FontWeight.w400,
      fontSize: 16,
      height: 1.55,
    ),
    this.content = const TextStyle(
      fontWeight: FontWeight.w400,
      fontSize: 14,
      height: 1.5,
    ),
    this.bodySm = const TextStyle(
      fontWeight: FontWeight.w400,
      fontSize: 13,
      height: 1.5,
    ),
    this.label = const TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 14,
      height: 1.4,
    ),
    this.caption = const TextStyle(
      fontWeight: FontWeight.w400,
      fontSize: 12,
      height: 1.4,
    ),
    this.captionStrong = const TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 12,
      height: 1.4,
    ),
    this.micro = const TextStyle(
      fontWeight: FontWeight.w500,
      fontSize: 11.52,
      height: 1.2,
    ),
    this.trackingDisplay = 0,
    this.trackingHeading = 0,
    this.trackingLabel = 0,
    this.trackingCaption = 0,
  });
  final TextStyle display;
  final TextStyle headline;
  final TextStyle titleLg;
  final TextStyle title;
  final TextStyle titleSm;
  final TextStyle subtitle;
  final TextStyle bodyLg;
  final TextStyle content;
  final TextStyle bodySm;
  final TextStyle label;
  final TextStyle caption;
  final TextStyle captionStrong;
  final TextStyle micro;
  final double trackingDisplay;
  final double trackingHeading;
  final double trackingLabel;
  final double trackingCaption;
}

class AppTextStyles {
  const AppTextStyles({required this.colors, required this.typography});
  final AppColors colors;
  final AppTypography typography;
  TextStyle get display => typography.display.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingDisplay,
  );
  TextStyle get headline => typography.headline.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingHeading,
  );
  TextStyle get titleLg => typography.titleLg.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingHeading,
  );
  TextStyle get title => typography.title.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingHeading,
  );
  TextStyle get titleSm => typography.titleSm.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingHeading,
  );
  TextStyle get subtitle => typography.subtitle.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingHeading,
  );
  TextStyle get bodyLg => typography.bodyLg.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingCaption,
  );
  TextStyle get content => typography.content.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingCaption,
  );
  TextStyle get bodySm => typography.bodySm.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingCaption,
  );
  TextStyle get label => typography.label.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingLabel,
  );
  TextStyle get caption => typography.caption.copyWith(
    color: colors.onSurfaceMuted,
    letterSpacing: typography.trackingCaption,
  );
  TextStyle get captionStrong => typography.captionStrong.copyWith(
    color: colors.onSurface,
    letterSpacing: typography.trackingCaption,
  );
  TextStyle get micro => typography.micro.copyWith(
    color: colors.onSurfaceMuted,
    letterSpacing: typography.trackingCaption,
  );
  TextStyle get numericDisplay =>
      display.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
  TextStyle get numericTitle =>
      title.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
  TextStyle get numericContent =>
      content.copyWith(fontFeatures: const [FontFeature.tabularFigures()]);
  double get trackingDisplay => typography.trackingDisplay;
  double get trackingHeading => typography.trackingHeading;
  double get trackingLabel => typography.trackingLabel;
  double get trackingCaption => typography.trackingCaption;
}
