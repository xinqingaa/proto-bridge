import 'package:flutter/material.dart';

import '../features/cold_chain_ops_evidence/exception_queue_page.dart';
import '../features/cold_chain_ops_evidence/resolution_form_page.dart';
import '../features/cold_chain_ops_evidence/shipment_detail_page.dart';
import '../features/demo/demo_page.dart';
import '../features/hub/hub_page.dart';
import 'routes.dart';

export 'routes.dart';

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.hub: (_) => const HubPage(),
  AppRoutes.demo: (_) => const DemoPage(),
  AppRoutes.coldChainExceptionQueue: (context) =>
      ExceptionQueueEvidencePage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainShipmentDetail: (context) =>
      ShipmentDetailEvidencePage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainResolutionForm: (context) =>
      ResolutionFormEvidencePage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
};
