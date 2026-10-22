import { describe, expect, it } from 'vitest';
import {
  fixtures,
  computeCaseId,
  type CatalogRevision,
} from '../../src/v2/index.js';
import { projectThemePack } from '../../src/v2/theme-pack-read.js';
import { FIXTURE_THEME_PACK_CATALOG } from '../../src/v2/fixtures/reference-case-slice/shared.js';

describe('Fixed theme table capture status', () => {
  it('does not mistake Catalog values for captured pages and reads legacy Handoffs', () => {
    const handoff = structuredClone(fixtures.referenceCaseSlice.HANDOFF);
    const catalog = structuredClone(
      FIXTURE_THEME_PACK_CATALOG,
    ) as CatalogRevision;
    expect(projectThemePack({ handoff, catalog }).captured).toBe(true);
    expect(projectThemePack({ handoff, catalog, mode: 'dark' }).captured).toBe(
      false,
    );
    const key = {
      ...fixtures.referenceCaseSlice.RUN_1.selection.cases[0]!.caseKey,
      theme: 'default',
      themeId: 'dark',
    };
    const ref = handoff.selectedCases.find(
      (item) => item.resolution === 'resolved',
    )!;
    handoff.selectedCases = [
      { ...ref, caseId: computeCaseId(key), caseKey: key },
    ];
    expect(projectThemePack({ handoff, catalog, mode: 'dark' }).captured).toBe(
      true,
    );
    expect(projectThemePack({ handoff, catalog, mode: 'light' }).captured).toBe(
      false,
    );
    handoff.selectedCases = [
      { ...handoff.selectedCases[0]!, resolution: 'missing' } as typeof ref,
    ];
    expect(projectThemePack({ handoff, catalog, mode: 'dark' }).captured).toBe(
      false,
    );
  });
});
