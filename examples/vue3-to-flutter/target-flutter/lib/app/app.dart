import 'package:flutter/material.dart';

import 'routes/app_pages.dart';
import 'routes/app_routes.dart';
import 'theme/app_theme.dart';

class ProtoBridgeTargetApp extends StatelessWidget {
  const ProtoBridgeTargetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ProtoBridge Target',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: Routes.home,
      onGenerateRoute: AppPages.onGenerateRoute,
    );
  }
}
