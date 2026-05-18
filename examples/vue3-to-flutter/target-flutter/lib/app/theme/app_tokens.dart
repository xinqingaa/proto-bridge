import 'package:flutter/material.dart';

class AppSpacing {
  const AppSpacing._();

  static const xxs = 4.0;
  static const xs = 8.0;
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 20.0;
  static const xl = 28.0;
}

class AppRadii {
  const AppRadii._();

  static const panel = 8.0;
  static const chip = 8.0;
}

class AppPalette {
  const AppPalette({
    required this.background,
    required this.surface,
    required this.surfaceSoft,
    required this.text,
    required this.muted,
    required this.border,
    required this.primary,
    required this.primarySoft,
    required this.accent,
    required this.accentSoft,
    required this.positive,
    required this.negative,
    required this.warning,
  });

  factory AppPalette.light() {
    return const AppPalette(
      background: Color(0xFFF7F7F5),
      surface: Colors.white,
      surfaceSoft: Color(0xFFF0EFEB),
      text: Color(0xFF111111),
      muted: Color(0xFF6B6B63),
      border: Color(0xFFD8D6CF),
      primary: Color(0xFF2F2F2C),
      primarySoft: Color(0xFFEBE8E1),
      accent: Color(0xFFC56A2A),
      accentSoft: Color(0xFFF4DFCF),
      positive: Color(0xFF3F7B55),
      negative: Color(0xFFA54B42),
      warning: Color(0xFFB2752D),
    );
  }

  factory AppPalette.dark() {
    return const AppPalette(
      background: Color(0xFF10100E),
      surface: Color(0xFF191916),
      surfaceSoft: Color(0xFF22211D),
      text: Color(0xFFF4F1EA),
      muted: Color(0xFFAAA59A),
      border: Color(0xFF34322D),
      primary: Color(0xFFF4F1EA),
      primarySoft: Color(0xFF2B2924),
      accent: Color(0xFFE08A3E),
      accentSoft: Color(0xFF3A281D),
      positive: Color(0xFF7FB98B),
      negative: Color(0xFFD9867D),
      warning: Color(0xFFD59B4C),
    );
  }

  final Color background;
  final Color surface;
  final Color surfaceSoft;
  final Color text;
  final Color muted;
  final Color border;
  final Color primary;
  final Color primarySoft;
  final Color accent;
  final Color accentSoft;
  final Color positive;
  final Color negative;
  final Color warning;
}

class AppTextStyles {
  const AppTextStyles();

  TextStyle get title =>
      const TextStyle(fontSize: 26, height: 1.12, fontWeight: FontWeight.w800);
  TextStyle get sectionTitle =>
      const TextStyle(fontSize: 17, fontWeight: FontWeight.w800);
  TextStyle get metric =>
      const TextStyle(fontSize: 21, fontWeight: FontWeight.w800);
  TextStyle get bodyStrong =>
      const TextStyle(fontSize: 15, fontWeight: FontWeight.w800);
  TextStyle get caption =>
      const TextStyle(fontSize: 12, fontWeight: FontWeight.w600);
}
