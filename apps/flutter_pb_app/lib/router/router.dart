import 'package:flutter/material.dart';

import '../features/cold_chain_ops/cold_chain_models.dart';
import '../features/cold_chain_ops/exception_queue_page.dart';
import '../features/cold_chain_ops/resolution_form_page.dart';
import '../features/cold_chain_ops/shipment_detail_page.dart';
import '../features/demo/demo_page.dart';
import '../features/hub/hub_page.dart';
import 'routes.dart';

export 'routes.dart';

final appNavigatorKey = GlobalKey<NavigatorState>();

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.hub: (_) => const HubPage(),
  AppRoutes.demo: (_) => const DemoPage(),
  AppRoutes.coldChainExceptions: (context) {
    final args = ExceptionQueueArgs.fromRouteArgs(
      ModalRoute.of(context)?.settings.arguments,
    );
    return ExceptionQueuePage(variantId: args.variantId);
  },
  AppRoutes.coldChainShipment: (context) {
    final args = ShipmentDetailArgs.fromRouteArgs(
      ModalRoute.of(context)?.settings.arguments,
    );
    return ShipmentDetailPage(args: args);
  },
  AppRoutes.coldChainResolution: (context) {
    final args = ResolutionFormArgs.fromRouteArgs(
      ModalRoute.of(context)?.settings.arguments,
    );
    return ResolutionFormPage(args: args);
  },
};
