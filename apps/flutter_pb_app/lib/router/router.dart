import 'package:flutter/material.dart';

import '../features/cold_chain_ops/exception_queue_page.dart';
import '../features/cold_chain_ops/resolution_form_page.dart';
import '../features/cold_chain_ops/shipment_detail_page.dart';
import '../features/demo/demo_page.dart';
import '../features/field_service/field_service_page.dart';
import '../features/hub/hub_page.dart';
import '../features/ledger_planet/ledger_planet_page.dart';
import '../features/ledger_planet/task_detail_page.dart';
import '../features/ledger_planet_v2/ledger_planet_page.dart';
import '../features/ledger_planet_v2/task_detail_page.dart';
import '../features/v6/exception_queue_page.dart';
import '../features/v6/resolution_form_page.dart';
import '../features/v6/shipment_detail_page.dart';
import 'routes.dart';

export 'routes.dart';

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.hub: (_) => const HubPage(),
  AppRoutes.demo: (_) => const DemoPage(),
  AppRoutes.fieldService: (_) => const FieldServicePage(),
  AppRoutes.ledgerPlanet: (_) => const LedgerPlanetPage(),
  AppRoutes.ledgerPlanetTaskDetail: (context) =>
      TaskDetailPage.fromRouteArgs(ModalRoute.of(context)?.settings.arguments),
  AppRoutes.ledgerPlanetV2: (_) => const LedgerPlanetV2Page(),
  AppRoutes.ledgerPlanetV2TaskDetail: (context) =>
      TaskDetailV2Page.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainExceptionQueue: (context) =>
      ExceptionQueuePage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainShipmentDetail: (context) =>
      ShipmentDetailPage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainResolutionForm: (context) =>
      ResolutionFormPage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.v6ExceptionQueue: (context) => V6ExceptionQueuePage.fromRouteArgs(
    ModalRoute.of(context)?.settings.arguments,
  ),
  AppRoutes.v6ShipmentDetail: (context) => V6ShipmentDetailPage.fromRouteArgs(
    ModalRoute.of(context)?.settings.arguments,
  ),
  AppRoutes.v6ResolutionForm: (context) => V6ResolutionFormPage.fromRouteArgs(
    ModalRoute.of(context)?.settings.arguments,
  ),
};
