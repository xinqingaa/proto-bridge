import 'package:flutter/material.dart';

/// 对齐 pbwork `color.*` token。
class AppColors {
  const AppColors({
    required this.background,
    required this.surface,
    required this.primary,
    required this.navigationActive,
    required this.sectionTabActive,
    required this.primarySoft,
    required this.onPrimary,
    required this.action,
    required this.actionSoft,
    required this.onAction,
    required this.secondary,
    required this.secondarySoft,
    required this.border,
    required this.error,
    required this.errorSoft,
    required this.info,
    required this.success,
    required this.successSoft,
    required this.warning,
    required this.warningSoft,
    required this.onSurface,
    required this.onSurfaceMuted,
    required this.surfaceVariant,
    required this.surfaceRaised,
    required this.surfaceRecessed,
    required this.surfaceSelected,
    required this.toast,
    required this.onToast,
    required this.onBackground,
    required this.onSecondary,
    required this.outline,
    required this.divider,
    required this.disabled,
    required this.scrim,
    required this.onError,
    required this.onSuccess,
    required this.onWarning,
    required this.onInfo,
  });

  final Color background;
  final Color surface;
  final Color primary;
  final Color navigationActive;
  final Color sectionTabActive;
  final Color primarySoft;
  final Color onPrimary;
  final Color action;
  final Color actionSoft;
  final Color onAction;
  final Color secondary;
  final Color secondarySoft;
  final Color border;
  final Color error;
  final Color errorSoft;
  final Color info;
  final Color success;
  final Color successSoft;
  final Color warning;
  final Color warningSoft;
  final Color onSurface;
  final Color onSurfaceMuted;
  final Color surfaceVariant;
  final Color surfaceRaised;
  final Color surfaceRecessed;
  final Color surfaceSelected;
  final Color toast;
  final Color onToast;
  final Color onBackground;
  final Color onSecondary;
  final Color outline;
  final Color divider;
  final Color disabled;
  final Color scrim;
  final Color onError;
  final Color onSuccess;
  final Color onWarning;
  final Color onInfo;

  static const light = AppColors(
    background: Color(0xFFF7F8FA),
    surface: Color(0xFFFFFFFF),
    primary: Color(0xFF2F73D2),
    navigationActive: Color(0xFF2F73D2),
    sectionTabActive: Color(0xFF1D1F23),
    primarySoft: Color(0xFFEAF2FD),
    onPrimary: Color(0xFFFFFFFF),
    action: Color(0xFF202124),
    actionSoft: Color(0xFFE8E9EA),
    onAction: Color(0xFFFFFFFF),
    secondary: Color(0xFF66707A),
    secondarySoft: Color(0xFFF0F2F4),
    border: Color(0xFFDDE1E6),
    error: Color(0xFFB44A42),
    errorSoft: Color(0xFFF7ECEA),
    info: Color(0xFF397BC1),
    success: Color(0xFF39715A),
    successSoft: Color(0xFFEAF2EE),
    warning: Color(0xFF87651C),
    warningSoft: Color(0xFFF5F0E4),
    onSurface: Color(0xFF1D1F23),
    onSurfaceMuted: Color(0xFF666B73),
    surfaceVariant: Color(0xFFF0F2F4),
    surfaceRaised: Color(0xFFFFFFFF),
    surfaceRecessed: Color(0xFFEEF0F3),
    surfaceSelected: Color(0xFFFBFCFD),
    toast: Color(0xCC000000),
    onToast: Color(0xFFFFFFFF),
    onBackground: Color(0xFF1D1F23),
    onSecondary: Color(0xFFFFFFFF),
    outline: Color(0xFFAEB4BC),
    divider: Color(0xFFE5E7EA),
    disabled: Color(0xFF9AA0A8),
    scrim: Color(0x990F172A),
    onError: Color(0xFFFFFFFF),
    onSuccess: Color(0xFFFFFFFF),
    onWarning: Color(0xFF251A00),
    onInfo: Color(0xFFFFFFFF),
  );

  static const dark = AppColors(
    background: Color(0xFF141517),
    surface: Color(0xFF1C1E21),
    primary: Color(0xFF83B2F2),
    navigationActive: Color(0xFF83B2F2),
    sectionTabActive: Color(0xFFF2F3F5),
    primarySoft: Color(0xFF213A5C),
    onPrimary: Color(0xFF17181A),
    action: Color(0xFFF1F3F4),
    actionSoft: Color(0xFF2A2C30),
    onAction: Color(0xFF17181A),
    secondary: Color(0xFFA9AFB7),
    secondarySoft: Color(0xFF292C30),
    border: Color(0xFF34383E),
    error: Color(0xFFD47A73),
    errorSoft: Color(0xFF3B2928),
    info: Color(0xFF79AEE0),
    success: Color(0xFF7FB197),
    successSoft: Color(0xFF21342B),
    warning: Color(0xFFD0AD62),
    warningSoft: Color(0xFF372F20),
    onSurface: Color(0xFFF2F3F5),
    onSurfaceMuted: Color(0xFFA9AFB7),
    surfaceVariant: Color(0xFF24272B),
    surfaceRaised: Color(0xFF292C30),
    surfaceRecessed: Color(0xFF181A1D),
    surfaceSelected: Color(0xFF292C30),
    toast: Color(0xCC000000),
    onToast: Color(0xFFFFFFFF),
    onBackground: Color(0xFFF2F3F5),
    onSecondary: Color(0xFF17181A),
    outline: Color(0xFF747A83),
    divider: Color(0xFF303338),
    disabled: Color(0xFF737981),
    scrim: Color(0xC2050607),
    onError: Color(0xFF17181A),
    onSuccess: Color(0xFF17181A),
    onWarning: Color(0xFF17181A),
    onInfo: Color(0xFF17181A),
  );
}
