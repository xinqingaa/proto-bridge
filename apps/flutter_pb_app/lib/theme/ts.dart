import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:unified_popups/liquid_glass.dart';

import '../common/widgets/navigation/screen_transition.dart';
import '../storage/providers.dart';
import '../storage/app_prefs.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';
import 'app_tokens.dart';
import 'theme_pack.dart';

export 'theme_pack.dart';

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final stored = ref.watch(appPrefsProvider).readThemeMode();
    return stored == 'dark' ? ThemeMode.dark : ThemeMode.light;
  }

  void setMode(ThemeMode mode) {
    ref
        .read(appPrefsProvider)
        .writeThemeMode(mode == ThemeMode.dark ? 'dark' : 'light');
    state = mode;
  }

  void toggle() {
    setMode(state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark);
  }
}

/// 当前亮度（对齐 pbwork light/dark 主题），经 [AppPrefs] 持久化。
final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);

final themePacksProvider = Provider<List<AppThemePack>>(
  (ref) => const [AppThemePack.base],
);

class ThemePackNotifier extends Notifier<AppThemePack> {
  @override
  AppThemePack build() {
    final packs = ref.watch(themePacksProvider);
    if (packs.isEmpty ||
        packs.any((pack) => pack.id.trim().isEmpty) ||
        packs.map((pack) => pack.id).toSet().length != packs.length) {
      throw StateError('Theme packs must have nonempty, unique identities.');
    }
    final stored = ref
        .watch(appPrefsProvider)
        .readString(AppPrefs.themePackKey);
    return packs.firstWhere(
      (pack) => pack.id == stored,
      orElse: () => packs.first,
    );
  }

  void select(String id) {
    final pack = ref
        .read(themePacksProvider)
        .firstWhere((pack) => pack.id == id);
    ref.read(appPrefsProvider).writeString(AppPrefs.themePackKey, id);
    state = pack;
  }
}

final themePackProvider = NotifierProvider<ThemePackNotifier, AppThemePack>(
  ThemePackNotifier.new,
);

/// ThemeExtension owned by the nearest Material Theme, never a global singleton.
class TS extends ThemeExtension<TS> {
  TS({
    required this.brightness,
    this.pack = AppThemePack.base,
    AppColors? colors,
  }) : colors = colors ?? pack.colorsFor(brightness);

  final Brightness brightness;
  final AppThemePack pack;
  final AppColors colors;
  bool get isDark => brightness == Brightness.dark;
  late final AppTextStyles textStyle = AppTextStyles(
    colors: colors,
    typography: pack.typography,
  );
  AppSpacing get spacing => pack.spacing;
  AppSizing get sizing => pack.sizing;
  AppRadius get radius => pack.radius;
  AppOpacity get opacity => isDark ? pack.darkOpacity : pack.lightOpacity;
  AppMotion get motion => pack.motion;
  AppElevation get elevation =>
      isDark ? pack.darkElevation : pack.lightElevation;
  late final AppBorderTokens border = AppBorderTokens(colors: colors);
  AppLayoutTokens get layout => pack.layout;
  AppLayerTokens get layer => pack.layer;
  AppEffectTokens get effect => pack.effect;
  AppAssets get assets => pack.assets;

  static TS of(BuildContext context) {
    final tokens = Theme.of(context).extension<TS>();
    if (tokens == null) throw StateError('Install TS in ThemeData.extensions.');
    return tokens;
  }

  @override
  TS copyWith({
    Brightness? brightness,
    AppThemePack? pack,
    AppColors? colors,
  }) => TS(
    brightness: brightness ?? this.brightness,
    pack: pack ?? this.pack,
    colors: colors ?? (pack == null && brightness == null ? this.colors : null),
  );

  @override
  TS lerp(covariant TS? other, double t) {
    if (other == null) return this;
    final target = t < 0.5 ? this : other;
    return TS(
      brightness: target.brightness,
      pack: target.pack,
      colors: colors.lerp(other.colors, t),
    );
  }

  LiquidGlassStyle glassStyle({bool clear = false, Color? tint}) =>
      LiquidGlassStyle(
        backgroundColor: tint ?? (clear ? colors.glassClear : colors.glassTint),
        borderColor: colors.glassEdge,
        topHighlightColor: colors.glassEdge,
        pressHighlightColor: colors.primary.withValues(alpha: opacity.pressed),
        shadowColor: elevation.glass.color,
        blurSigma: effect.glassBackdropBlur,
        outlineWidth: border.widthHairline,
        topStrokeWidth: border.widthStrong,
        shadowBlurRadius: elevation.glass.blurRadius,
        shadowOffset: elevation.glass.offset,
        pressColorDuration: motion.durationFast,
        pressScaleDuration: motion.durationNormal,
        pressScale: motion.scalePressed,
        pressCurve: motion.easingStandard,
      );

  ThemeData toThemeData() {
    final scheme = ColorScheme(
      brightness: brightness,
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
      extensions: [this],
      brightness: brightness,
      colorScheme: scheme,
      pageTransitionsTheme: PbPageTransitions.theme(),
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
