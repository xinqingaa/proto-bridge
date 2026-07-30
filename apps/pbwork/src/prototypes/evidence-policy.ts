/**
 * Existing screens that predate the authored Evidence completeness contract.
 *
 * A Screen not listed here is strict by default. This makes every future
 * Screen fail registry validation until its default/critical Variants declare
 * stable requiredFragments. Remove IDs as legacy screens are upgraded.
 */
export const LEGACY_EVIDENCE_SCREEN_IDS = new Set([
  "field-service.dashboard",
  "field-service.work-orders",
  "field-service.work-order-detail",
  "field-service.create-work-order",
  "field-service.customer-detail",
  "field-service.messages",
  "field-service.settings",
  "ledger-planet.ledger-home",
  "ledger-planet.record-edit",
  "ledger-planet.record-detail",
  "ledger-planet.analytics",
  "ledger-planet.benefits-home",
  "ledger-planet.activity-detail",
  "ledger-planet.coupon-wallet",
  "ledger-planet.coupon-detail",
  "ledger-planet.me-home",
  "ledger-planet.wallet",
  "ledger-planet.profile",
  "ledger-planet.settings",
  "ledger-planet.help-center",
  "ledger-planet.help-article",
  "ledger-planet.about",
]);

export function requiresStrictEvidence(screenId: string): boolean {
  return !LEGACY_EVIDENCE_SCREEN_IDS.has(screenId);
}
