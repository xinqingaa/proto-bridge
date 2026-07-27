import 'package:flutter/material.dart';

import 'app_colors.dart';

/// 对齐 pbwork `typography.*` token。
///
/// 字重 650 在 Flutter 中近似为 [FontWeight.w600]。
class AppTextStyles {
  const AppTextStyles({required this.colors});

  final AppColors colors;

  TextStyle get display => TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 40,
        height: 1.15,
        color: colors.onSurface,
      );

  TextStyle get headline => TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 28,
        height: 1.2,
        color: colors.onSurface,
      );

  TextStyle get titleLg => TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 24,
        height: 1.25,
        color: colors.onSurface,
      );

  TextStyle get title => TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 20,
        height: 1.3,
        color: colors.onSurface,
      );

  TextStyle get titleSm => TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 18,
        height: 1.35,
        color: colors.onSurface,
      );

  TextStyle get subtitle => TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 16,
        height: 1.4,
        color: colors.onSurface,
      );

  TextStyle get bodyLg => TextStyle(
        fontWeight: FontWeight.w400,
        fontSize: 16,
        height: 1.55,
        color: colors.onSurface,
      );

  TextStyle get content => TextStyle(
        fontWeight: FontWeight.w400,
        fontSize: 14,
        height: 1.5,
        color: colors.onSurface,
      );

  TextStyle get bodySm => TextStyle(
        fontWeight: FontWeight.w400,
        fontSize: 13,
        height: 1.5,
        color: colors.onSurface,
      );

  TextStyle get label => TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 14,
        height: 1.4,
        color: colors.onSurface,
      );

  TextStyle get caption => TextStyle(
        fontWeight: FontWeight.w400,
        fontSize: 12,
        height: 1.4,
        color: colors.onSurfaceMuted,
      );

  TextStyle get captionStrong => TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 12,
        height: 1.4,
        color: colors.onSurface,
      );
}
