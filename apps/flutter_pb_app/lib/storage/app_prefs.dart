import 'package:shared_preferences/shared_preferences.dart';

/// Thin KV wrapper. New keys must be added to `docs/architecture.md` first.
class AppPrefs {
  AppPrefs(this._prefs);

  final SharedPreferences _prefs;

  static const themeModeKey = 'theme_mode';

  /// Returns `light`, `dark`, or `null` when unset.
  String? readThemeMode() {
    final value = _prefs.getString(themeModeKey);
    if (value == 'light' || value == 'dark') return value;
    return null;
  }

  Future<void> writeThemeMode(String mode) async {
    if (mode != 'light' && mode != 'dark') {
      throw ArgumentError.value(mode, 'mode', 'Must be light or dark.');
    }
    await _prefs.setString(themeModeKey, mode);
  }
}
