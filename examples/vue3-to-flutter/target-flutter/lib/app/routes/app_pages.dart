import 'package:flutter/material.dart';

import '../example_home_page.dart';
import 'app_routes.dart';

class AppPages {
  const AppPages._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case Routes.pnlAnalysis:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ProtoFallbackPage(title: 'P&L Analysis'),
        );
      case Routes.holdingList:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ProtoFallbackPage(title: 'Portfolio Holdings'),
        );
      case Routes.home:
      default:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ExampleHomePage(),
        );
    }
  }
}
