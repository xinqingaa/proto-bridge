/// Navigator 1.0 named route paths.
///
/// New prototype pages: add a constant here, register in [appRoutes],
/// and expose an entry on HubPage.
abstract final class AppRoutes {
  static const hub = '/';
  static const demo = '/demo';
  static const fieldService = '/prototypes/field-service';
  static const ledgerPlanet = '/prototypes/ledger-planet';
  static const ledgerPlanetTaskDetail = '/prototypes/ledger-planet/task-detail';
  static const ledgerPlanetV2 = '/prototypes/ledger-planet-v2';
  static const ledgerPlanetV2TaskDetail =
      '/prototypes/ledger-planet-v2/task-detail';
  static const coldChainExceptionQueue =
      '/prototypes/cold-chain-ops/exception-queue';
  static const coldChainShipmentDetail =
      '/prototypes/cold-chain-ops/shipment-detail';
  static const coldChainResolutionForm =
      '/prototypes/cold-chain-ops/resolution-form';
  static const v6ExceptionQueue = '/prototypes/v6/exception-queue';
  static const v6ShipmentDetail = '/prototypes/v6/shipment-detail';
  static const v6ResolutionForm = '/prototypes/v6/resolution-form';
}
