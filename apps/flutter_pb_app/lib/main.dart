import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'review/authoritative_review_harness.dart';
import 'storage/providers.dart';

Future<void> main() async {
  // This is deliberately the first runtime action in debug builds. The
  // authoritative review provider only attaches to an App the user has
  // already started; release builds do not expose these extensions.
  assert(() {
    ProtoBridgeReviewHarness.enable();
    return true;
  }());
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const PbApp(),
    ),
  );
}
