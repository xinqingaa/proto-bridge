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
  static const coldChain = '/prototypes/cold-chain';
  static const coldChainV2 = '/prototypes/cold-chain-v2';
  static const coldChainV3 = '/prototypes/cold-chain-v3';
  static const coldChainV3ShipmentDetail =
      '/prototypes/cold-chain-v3/shipment-detail';
  static const coldChainV3ResolutionForm =
      '/prototypes/cold-chain-v3/resolution-form';
  static const coldChainV4Gpt = '/prototypes/cold-chain-v4-gpt';
  static const coldChainV4GptShipmentDetail =
      '/prototypes/cold-chain-v4-gpt/shipment-detail';
  static const coldChainV4GptResolutionForm =
      '/prototypes/cold-chain-v4-gpt/resolution-form';

  /// Delivery 2026-08-03 cold-chain-ops Evidence reconstruction.
  static const coldChainOpsQueue = '/deliveries/2026-08-03/cold-chain-ops/queue';
  static const coldChainOpsShipmentDetail =
      '/deliveries/2026-08-03/cold-chain-ops/shipment-detail';
  static const coldChainOpsResolutionForm =
      '/deliveries/2026-08-03/cold-chain-ops/resolution-form';
}
