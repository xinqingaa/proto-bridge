import 'package:flutter/material.dart';

import '../features/demo/demo_page.dart';
import '../features/demo/theme_settings_page.dart';
import '../common/widgets/navigation/launch_screen.dart';
import 'routes.dart';

export 'routes.dart';

final appNavigatorKey = GlobalKey<NavigatorState>();

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.demo: (_) => const DemoPage(),
  AppRoutes.settings: (_) => const DemoSettingsPage(),
  AppRoutes.launchPreview: (context) => Scaffold(
    body: CommonLaunchScreen(
      brandName: 'PBWork',
      onStart: () => Navigator.of(context).pop(),
    ),
  ),
  AppRoutes.launch: (context) => Scaffold(
    body: CommonLaunchScreen(
      brandName: 'PBWork',
      onStart: () => Navigator.of(context).pushReplacementNamed(AppRoutes.demo),
    ),
  ),
};
