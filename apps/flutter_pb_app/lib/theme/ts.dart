import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'pb_colors.dart';
import 'pb_text_styles.dart';
import 'pb_tokens.dart';

/// 当前亮度（对齐 pbwork light/dark 主题）。
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.light);

/// 主题服务：组件侧请通过 [TS] 读取。
class ThemeService {
  ThemeService._(this._brightness);

  factory ThemeService.of(Brightness brightness) => ThemeService._(brightness);

  final Brightness _brightness;

  bool get isDark => _brightness == Brightness.dark;

  late final PbColors colors = isDark ? PbColors.dark : PbColors.light;
  late final PbTextStyles textStyle = PbTextStyles(colors: colors);

  final PbSpacing spacing = const PbSpacing();
  final PbSizing sizing = const PbSizing();
  final PbRadius radius = const PbRadius();
  final PbOpacity opacity = const PbOpacity();
  final PbMotion motion = const PbMotion();
  final PbElevation elevation = const PbElevation();

  ThemeData toThemeData() {
    final scheme = ColorScheme(
      brightness: _brightness,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      secondary: colors.secondary,
      onSecondary: colors.onSecondary,
      error: colors.error,
      onError: colors.onError,
      surface: colors.surface,
      onSurface: colors.onSurface,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: _brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: colors.background,
      dividerColor: colors.divider,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.surface,
        foregroundColor: colors.onSurface,
        elevation: elevation.none,
        centerTitle: true,
        titleTextStyle: textStyle.title,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: colors.surface,
        selectedItemColor: colors.primary,
        unselectedItemColor: colors.onSurfaceMuted,
        type: BottomNavigationBarType.fixed,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: colors.secondarySoft,
        selectedColor: colors.primarySoft,
        labelStyle: textStyle.captionStrong,
        side: BorderSide(color: colors.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius.full),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: EdgeInsets.symmetric(
          horizontal: spacing.md,
          vertical: spacing.smPlus,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.md),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.md),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius.md),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
        labelStyle: textStyle.label.copyWith(color: colors.onSurfaceMuted),
        hintStyle: textStyle.content.copyWith(color: colors.onSurfaceMuted),
      ),
    );
  }
}

/// 全局主题简写入口。
///
/// 用法：`TS.colors.primary` / `TS.textStyle.title`。
/// 在 [MaterialApp] 之下、或调用 [TS.bind] / [TS.ensure] 后使用。
abstract final class TS {
  static ThemeService _service = ThemeService.of(Brightness.light);

  static ThemeService get current => _service;

  static PbColors get colors => _service.colors;
  static PbTextStyles get textStyle => _service.textStyle;
  static PbSpacing get spacing => _service.spacing;
  static PbSizing get sizing => _service.sizing;
  static PbRadius get radius => _service.radius;
  static PbOpacity get opacity => _service.opacity;
  static PbMotion get motion => _service.motion;
  static PbElevation get elevation => _service.elevation;

  /// 绑定当前亮度（App 根节点 / 主题切换时调用）。
  static void bind(Brightness brightness) {
    _service = ThemeService.of(brightness);
  }

  /// 从 [BuildContext] 同步亮度（组件 build 内可选调用）。
  static ThemeService of(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    if (_service._brightness != brightness) {
      bind(brightness);
    }
    return _service;
  }
}

/// 在 Widget 树中保持 [TS] 与当前 Theme 同步。
class TsBinder extends StatelessWidget {
  const TsBinder({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return child;
  }
}
