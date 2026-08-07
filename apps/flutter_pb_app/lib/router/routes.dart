/// Navigator 1.0 named route paths.
///
/// New prototype pages: add a constant here, register in [appRoutes],
/// and expose an entry on HubPage.
abstract final class AppRoutes {
  static const hub = '/';
  static const demo = '/demo';
  static const coldChainExceptionQueue =
      '/prototypes/cold-chain-ops-evidence/exception-queue';
  static const coldChainShipmentDetail =
      '/prototypes/cold-chain-ops-evidence/shipment-detail';
  static const coldChainResolutionForm =
      '/prototypes/cold-chain-ops-evidence/resolution-form';
}
