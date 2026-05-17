import 'package:flutter/material.dart';

import '../example_home_page.dart';
import '../modules/account/presentation/pages/holding_list_page.dart';
import '../modules/account/presentation/pages/pnl_analysis_page.dart';
import 'app_routes.dart';

class AppPages {
  const AppPages._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case Routes.pnlAnalysis:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const PnlAnalysisPage(),
        );
      case Routes.holdingList:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const HoldingListPage(),
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
