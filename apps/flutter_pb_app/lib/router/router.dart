import 'package:flutter/material.dart';

import '../features/demo/demo_page.dart';
import '../features/hub/hub_page.dart';
import '../review/authoritative_review_harness.dart';
import 'routes.dart';

export 'routes.dart';

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.hub: (_) => const HubPage(),
  AppRoutes.demo: (_) => const DemoPage(),
  ProtoBridgeReviewHarness.reviewRoute: (_) =>
      const ProtoBridgeReviewControlPage(),
};
