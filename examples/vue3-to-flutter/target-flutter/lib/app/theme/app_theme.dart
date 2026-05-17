import 'package:flutter/material.dart';

import 'theme_service.dart';

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: themeService.colors.background,
    colorScheme: ColorScheme.fromSeed(
      seedColor: themeService.colors.primary,
      primary: themeService.colors.primary,
      surface: themeService.colors.surface,
    ),
    textTheme: TextTheme(
      headlineLarge: themeService.textStyles.title,
      titleMedium: themeService.textStyles.sectionTitle,
      bodyMedium: TextStyle(color: themeService.colors.text),
      labelSmall: themeService.textStyles.caption,
    ),
  );
}
