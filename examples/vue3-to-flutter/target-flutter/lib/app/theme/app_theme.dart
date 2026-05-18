import 'package:flutter/material.dart';

import 'theme_service.dart';

ThemeData buildAppTheme({Brightness brightness = Brightness.light}) {
  final service = ThemeService(brightness);
  final colors = service.colors;
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: colors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: colors.accent,
      brightness: brightness,
      primary: colors.primary,
      surface: colors.surface,
    ),
    textTheme: TextTheme(
      headlineLarge: service.textStyles.title.copyWith(color: colors.text),
      titleMedium: service.textStyles.sectionTitle.copyWith(color: colors.text),
      bodyMedium: TextStyle(color: colors.text),
      labelSmall: service.textStyles.caption.copyWith(color: colors.muted),
    ),
  );
}
