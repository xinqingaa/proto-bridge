import { describe, expect, it } from 'vitest';
import {
  buildEvidenceInventory,
  fixtures,
} from '../../src/v2/index.js';

const f = fixtures.referenceCaseSlice;

describe('Evidence Inventory read model', () => {
  it('keeps Bundle identity and reports unchecked Evidence without a report', () => {
    const inventory = buildEvidenceInventory(f.WORKSPACE_ID, [
      {
        bundle: f.BUNDLE,
        activeSnapshot: f.SNAPSHOT,
        runs: [f.RUN_1, f.RUN_2],
        revisions: [
          f.PRIMARY_ACTIVE_REVISION,
          f.FRAGMENT_SCOPED_ACTIVE_REVISION,
        ],
        blobs: [],
        stalenessReports: [],
        handoffs: [],
      },
    ]);
    const items = inventory.prototypes.flatMap((prototype) =>
      prototype.screens.flatMap((screen) => screen.items),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.bundleId === f.BUNDLE_ID)).toBe(true);
    expect(items.every((item) => item.status === 'unchecked')).toBe(true);
  });
});
