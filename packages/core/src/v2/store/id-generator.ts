import { randomBytes } from 'node:crypto';

/**
 * Operational ids (Run/Attempt/Evidence revision/Snapshot/Job ids) are
 * machine-minted at write time, unlike authored business ids (Screen,
 * Variant, ...). They still must satisfy the stable-id pattern in
 * `contracts/ids.ts` (pb-v2-spec.md "稳定身份"): lowercase, readable, no
 * CSS selector or DOM path syntax. A timestamp segment is fine here since
 * the fixtures themselves use one (`run-2026-07-28t0900`); it just needs to
 * be readable text, not a hidden array index or random DOM class.
 */
function timestampSlug(date: Date): string {
  return date
    .toISOString()
    .replace(/[:.]/g, '')
    .replace('Z', '')
    .toLowerCase();
}

export function generateOperationalId(prefix: string, now: Date = new Date()): string {
  const suffix = randomBytes(4).toString('hex');
  return `${prefix}-${timestampSlug(now)}-${suffix}`;
}
