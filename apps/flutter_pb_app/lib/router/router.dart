import 'package:flutter/material.dart';

import '../features/cold_chain/exception_queue/exception_queue_page.dart';
import '../features/demo/demo_page.dart';
import '../features/hub/hub_page.dart';
import 'routes.dart';

export 'routes.dart';

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.hub: (_) => const HubPage(),
  AppRoutes.demo: (_) => const DemoPage(),
  AppRoutes.coldChainExceptionQueue: (_) => const ExceptionQueuePage(),
};
