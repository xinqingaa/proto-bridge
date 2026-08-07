/**
 * Existing screens that predate the authored Evidence completeness contract.
 *
 * A Screen not listed here is strict by default. This makes every future
 * Screen fail registry validation until its default Variant declares
 * stable requiredFragments. Remove IDs as legacy screens are upgraded.
 */
export const LEGACY_EVIDENCE_SCREEN_IDS = new Set<string>();

export function requiresStrictEvidence(screenId: string): boolean {
  return !LEGACY_EVIDENCE_SCREEN_IDS.has(screenId);
}
