import { describe, expect, it } from 'vitest';
import {
  preflightSelection,
  selectionDraftFromSelectedCases,
} from '../../../src/v2/capture/index.js';
import { fixtures } from '../../../src/v2/index.js';
import type { RuntimeCaptureManifest } from '../../../src/v2/runtime-contract/index.js';

describe('selection retry draft', () => {
  it('round-trips persisted Case/Scope identities through the shared resolver', () => {
    const reference = fixtures.referenceCaseSlice;
    const original = reference.RUN_1.selection;
    const draft = selectionDraftFromSelectedCases(
      original.prototypeId,
      original.cases,
      original.themePack,
    );
    const manifest: RuntimeCaptureManifest = {
      protocolVersion: 3,
    theme: {
    packId: 'sample-pack',
    packDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    keyCatalogDigest: 'sha1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    themes: ['default'],
    defaultTheme: 'default',
    modes: ['light', 'dark'],
    defaultMode: 'light',
  },
  clock: { now: '2026-07-28T00:00:00.000Z', timeZone: 'Asia/Shanghai' },
    catalogs: [{
    kind: 'theme-pack',
    inputDigest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    entries: [{
      objectId: 'sample-pack/default/light',
      digest: 'sha1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      value: { values: {}, provenance: {} },
      blobIds: [],
    }],
  }],
      inputVersion: 'retry-test-v1',
      capabilities: [
        'describe',
        'prepare',
        'readiness',
        'semantic-snapshot',
        'reset',
      ],
      screens: [
        {
          prototypeId: reference.PROTOTYPE_ID,
          screenId: reference.SCREEN_ID,
          screenSlug: 'task-list',
          path: '/prototype/sample/task-list',
          defaultVariantId: reference.VARIANT_ID,
          variants: [{ variantId: reference.VARIANT_ID, label: '默认' }],
          actions: [],
          scenarios: [],
        },
      ],
    };
    const resolved = preflightSelection(draft, manifest);
    expect(resolved.selection.cases).toEqual(original.cases);
    const named = { ...original.cases[0]!, caseKey: { ...original.cases[0]!.caseKey, theme: 'default', themeId: 'dark' } };
    named.caseId = `${named.caseKey.screenId}::${named.caseKey.variantId}::dark::${named.caseKey.deviceId}::theme=default`;
    const mixed = [original.cases[0]!, named];
    const retried = preflightSelection(selectionDraftFromSelectedCases(original.prototypeId, mixed, original.themePack), manifest);
    expect(new Set(retried.selection.cases.map((item) => item.caseId))).toEqual(new Set(mixed.map((item) => item.caseId)));
  });
});
