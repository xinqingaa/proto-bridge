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
  const AppPalette();

  Color get background => const Color(0xFFEEF3F8);
  Color get surface => Colors.white;
  Color get surfaceSoft => const Color(0xFFF7FAFC);
  Color get text => const Color(0xFF17202A);
  Color get muted => const Color(0xFF6B7886);
  Color get border => const Color(0xFFD8E1EA);
  Color get primary => const Color(0xFF176B87);
  Color get primarySoft => const Color(0xFFD8EEF3);
  Color get positive => const Color(0xFF16855B);
  Color get negative => const Color(0xFFC4453C);
  Color get warning => const Color(0xFFA66B00);
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
