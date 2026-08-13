import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter_pb_app/storage/app_prefs.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('theme_mode defaults to unset and round-trips light/dark', () async {
    final prefs = AppPrefs(await SharedPreferences.getInstance());
    expect(prefs.readThemeMode(), isNull);

    await prefs.writeThemeMode('dark');
    expect(prefs.readThemeMode(), 'dark');

    await prefs.writeThemeMode('light');
    expect(prefs.readThemeMode(), 'light');
  });

  test('rejects unknown theme_mode values', () async {
    final prefs = AppPrefs(await SharedPreferences.getInstance());
    expect(() => prefs.writeThemeMode('system'), throwsArgumentError);
  });
}
