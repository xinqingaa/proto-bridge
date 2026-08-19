/// Navigator 1.0 named route paths.
///
/// New prototype pages: add a constant here, register in [appRoutes],
/// and expose an entry on HubPage.
abstract final class AppRoutes {
  static const hub = '/';
  static const demo = '/demo';
  static const coldChainExceptions = '/cold-chain/exceptions';
  static const coldChainShipment = '/cold-chain/shipment';
  static const coldChainResolution = '/cold-chain/resolution';
}
