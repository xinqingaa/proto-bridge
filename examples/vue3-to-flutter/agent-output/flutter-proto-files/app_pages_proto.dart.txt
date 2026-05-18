import 'package:flutter/material.dart';

import '../example_home_page.dart';
import '../modules/account/_proto/account_proto_pages.dart';
import 'app_routes.dart';

class AppPagesProto {
  const AppPagesProto._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case Routes.pnlAnalysis:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ProtoPnlAnalysisPage(),
        );
      case Routes.holdingList:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ProtoHoldingListPage(),
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
