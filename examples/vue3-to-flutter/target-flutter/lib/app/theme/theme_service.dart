import 'package:flutter/material.dart';

import 'app_tokens.dart';

class ThemeService {
  const ThemeService([this.brightness = Brightness.light]);

  final Brightness brightness;

  AppPalette get colors =>
      brightness == Brightness.dark ? AppPalette.dark() : AppPalette.light();
  AppTextStyles get textStyles => const AppTextStyles();
}

const themeService = ThemeService();
