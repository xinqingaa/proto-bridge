import 'package:flutter/material.dart';

import '../features/demo/demo_page.dart';
import '../features/cold_chain_evidence_20260803_021714/exception_queue_page.dart';
import '../features/cold_chain_evidence_20260803_021714/resolution_form_page.dart';
import '../features/cold_chain_evidence_20260803_021714/shipment_detail_page.dart';
import '../features/cold_chain/cold_chain_page.dart';
import '../features/cold_chain_v2/cold_chain_v2.dart';
import '../features/cold_chain_v3/cold_chain_v3.dart';
import '../features/field_service/field_service_page.dart';
import '../features/hub/hub_page.dart';
import '../features/ledger_planet/ledger_planet_page.dart';
import '../features/ledger_planet/task_detail_page.dart';
import '../features/ledger_planet_v2/ledger_planet_page.dart';
import '../features/ledger_planet_v2/task_detail_page.dart';
import 'routes.dart';

export 'routes.dart';

final Map<String, WidgetBuilder> appRoutes = {
  AppRoutes.hub: (_) => const HubPage(),
  AppRoutes.demo: (_) => const DemoPage(),
  AppRoutes.evidence20260803Queue: (context) =>
      EvidenceExceptionQueuePage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.evidence20260803ShipmentDetail: (context) =>
      EvidenceShipmentDetailPage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.evidence20260803ResolutionForm: (context) =>
      EvidenceResolutionFormPage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.fieldService: (_) => const FieldServicePage(),
  AppRoutes.ledgerPlanet: (_) => const LedgerPlanetPage(),
  AppRoutes.ledgerPlanetTaskDetail: (context) =>
      TaskDetailPage.fromRouteArgs(ModalRoute.of(context)?.settings.arguments),
  AppRoutes.ledgerPlanetV2: (_) => const LedgerPlanetV2Page(),
  AppRoutes.ledgerPlanetV2TaskDetail: (context) =>
      TaskDetailV2Page.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChain: (_) => const ColdChainPage(),
  AppRoutes.coldChainV2: (_) => const ColdChainV2Page(),
  AppRoutes.coldChainV3: (context) =>
      ColdChainV3ExceptionQueuePage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainV3ShipmentDetail: (context) =>
      ColdChainV3ShipmentDetailPage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
  AppRoutes.coldChainV3ResolutionForm: (context) =>
      ColdChainV3ResolutionFormPage.fromRouteArgs(
        ModalRoute.of(context)?.settings.arguments,
      ),
};
