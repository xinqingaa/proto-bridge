import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:unified_popups/unified_popups.dart';

import '../theme/ts.dart';
import '../router/router.dart';

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
      navigatorKey: appNavigatorKey,
      navigatorObservers: [Pop.routeObserver],
      builder: (context, child) => Pop.hostBuilder(
        context,
        TsBinder(child: child ?? const SizedBox.shrink()),
      ),
      initialRoute: AppRoutes.hub,
      routes: appRoutes,
    );
  }
}
