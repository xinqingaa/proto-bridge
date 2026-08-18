import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:unified_popups/unified_popups.dart';

import '../theme/ts.dart';
import '../router/router.dart';
import '../review/authoritative_review_harness.dart';

class PbApp extends ConsumerWidget {
  const PbApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final brightness = mode == ThemeMode.dark
        ? Brightness.dark
        : Brightness.light;
    TS.bind(brightness);
    final theme = ThemeService.of(brightness).toThemeData();

    return MaterialApp(
      title: 'flutter_pb_app',
      debugShowCheckedModeBanner: false,
      theme: theme,
      darkTheme: ThemeService.of(Brightness.dark).toThemeData(),
      themeMode: mode,
      navigatorKey: ProtoBridgeReviewHarness.navigatorKey,
      navigatorObservers: [Pop.routeObserver],
      builder: (context, child) {
        return ProtoBridgeReviewBridge(
          child: Pop.hostBuilder(
            context,
            TsBinder(child: child ?? const SizedBox.shrink()),
          ),
        );
      },
      initialRoute: ProtoBridgeReviewHarness.reviewMode
          ? ProtoBridgeReviewHarness.reviewRoute
          : AppRoutes.hub,
      routes: appRoutes,
    );
  }
}
