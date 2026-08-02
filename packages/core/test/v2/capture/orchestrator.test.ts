import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Fact } from '../../../src/v2/contracts/evidence.js';
import type { RuntimeCaptureManifest } from '../../../src/v2/runtime-contract/index.js';
import {
  createAgentHandoff,
  capturePreflightToStore,
  evaluateAgentHandoff,
  preflightSelection,
  type CaptureCaseInput,
  type CapturedCase,
  type CaseCaptureDriver,
  type SelectionDraft,
} from '../../../src/v2/capture/index.js';
import { LocalFileStore } from '../../../src/v2/store/local-file-store.js';
import { ledgerPlanetTaskList as fixture } from '../../../src/v2/fixtures/index.js';

class FakeDriver implements CaseCaptureDriver {
  constructor(private readonly failVariants = new Set<string>()) {}

  async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    const variantId = input.entry.selectedCase.caseKey.variantId;
    if (this.failVariants.has(variantId)) {
      throw new Error(`fixture failure for ${variantId}`);
    }
    const fact: Fact = {
      factId: `${input.entry.selectedCase.caseKey.screenId}.${variantId}.role`,
      candidates: [
        {
          value: 'page',
          provenance: {
            source: 'data-pb',
            locator: `${input.entry.selectedCase.caseKey.screenId}.root#data-pb-role`,
          },
        },
      ],
      resolution: 'resolved',
      effectiveValue: 'page',
    };
    return {
      evidenceLevel: 'instrumented-runtime',
      facts: [fact],
      requiredFactsTotal: 1,
      requiredFactsResolved: 1,
      binaries: [
        {
          kind: 'screenshot',
          mediaType: 'image/png',
          bytes: new Uint8Array([137, 80, 78, 71, variantId.length]),
        },
      ],
      diagnostics: { console: [], pageErrors: [], failedRequests: [] },
    };
  }
}

class UnknownDriver implements CaseCaptureDriver {
  async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    return {
      evidenceLevel: 'instrumented-runtime',
      facts: [
        {
          factId: `${input.entry.selectedCase.caseKey.screenId}.hidden-state`,
          candidates: [
            {
              value: null,
              provenance: {
                source: 'runtime-observation',
                locator: 'hidden-state',
              },
            },
          ],
          resolution: 'unknown',
          issueRef: 'issue-task-list-hidden-state',
        },
      ],
      requiredFactsTotal: 1,
      requiredFactsResolved: 0,
      binaries: [
        {
          kind: 'screenshot',
          mediaType: 'image/png',
          bytes: new Uint8Array([137, 80, 78, 71]),
        },
      ],
      diagnostics: { console: [], pageErrors: [], failedRequests: [] },
    };
  }
}

function manifest(inputVersion: string): RuntimeCaptureManifest {
  return {
    protocolVersion: 2,
    inputVersion,
    capabilities: [
      'describe',
      'prepare',
      'readiness',
      'semantic-snapshot',
      'reset',
      'scenario',
    ],
    screens: [
      {
        prototypeId: 'ledger-planet',
        screenId: 'ledger-planet.task-list',
        screenSlug: 'task-list',
        path: '/prototype/ledger-planet/task-list',
        sourcePath: 'ledger-planet/screens/TaskList.vue',
        defaultVariantId: 'default',
        variants: [
          { variantId: 'default', critical: false },
          { variantId: 'empty', critical: false },
          { variantId: 'claimable', critical: true },
        ],
        actions: [],
        scenarios: [],
      },
    ],
  };
}

function draft(variants: string[]): SelectionDraft {
  return {
    prototypeId: 'ledger-planet',
    screens: [
      {
        screenId: 'ledger-planet.task-list',
        variants: { mode: 'explicit', variantIds: variants },
        themeIds: ['light'],
        deviceIds: ['iphone-14'],
        scenarios: { mode: 'none' },
        captureScope: {
          fragments: [],
          screenshots: { mode: 'all' },
          sourcePolicy: false,
          debugPolicy: true,
          evidenceInputMode: 'instrumented',
          minEvidenceLevel: 'instrumented-runtime',
        },
      },
    ],
    acceptedWarningIds: [],
  };
}

let root: string;
let store: LocalFileStore;
let tick: number;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-capture-store-'));
  store = new LocalFileStore({ root, workspaceId: fixture.WORKSPACE_ID });
  await store.init();
  await store.createBundle({
    bundleId: fixture.BUNDLE_ID,
    prototypeId: fixture.PROTOTYPE_ID,
    run: fixture.RUN_1,
    revisions: [fixture.PRIMARY_ACTIVE_REVISION],
    coverage: fixture.RUN_1.coverage,
  });
  tick = Date.parse('2026-07-29T02:00:00.000Z');
});

afterEach(async () => {
  await store.close();
  await rm(root, { recursive: true, force: true });
});

function now(): Date {
  tick += 1000;
  return new Date(tick);
}

describe('V2 Capture Orchestrator + real Store', () => {
  it('isolates a failed Case, commits the successful Case and controlled Screenshot Blob', async () => {
    const preflight = preflightSelection(
      draft(['empty', 'claimable']),
      manifest('runtime-input-v2'),
    );
    const result = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(new Set(['empty'])),
      now,
    });

    expect(result.run.attempts.map((attempt) => attempt.result).sort()).toEqual(
      ['captured', 'failed'],
    );
    expect(result.run.terminationReason).toBe('completed');
    expect(result.snapshot.coverage.counts.failed).toBe(1);
    expect(result.snapshot.coverage.counts.captured).toBe(1);
    expect(result.storedBlobIds).toHaveLength(1);
    expect(
      await store.getBlob(fixture.BUNDLE_ID, result.storedBlobIds[0]!),
    ).toBeDefined();
    expect((await store.getJob(result.jobId))?.status).toBe('completed');
  });

  it('keeps identical Screenshot bytes reachable for every captured Case', async () => {
    const preflight = preflightSelection(
      draft(['empty', 'claimable']),
      manifest('runtime-input-identical-screenshots'),
    );
    const identicalScreenshotDriver: CaseCaptureDriver = {
      async captureCase(input) {
        const captured = await new FakeDriver().captureCase(input);
        return {
          ...captured,
          binaries: [
            {
              kind: 'screenshot',
              mediaType: 'image/png',
              bytes: new Uint8Array([137, 80, 78, 71]),
            },
          ],
        };
      },
    };
    const result = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: identicalScreenshotDriver,
      now,
    });

    expect(result.storedBlobIds).toHaveLength(2);
    expect(new Set(result.storedBlobIds)).toHaveLength(2);
    const report = await store.createStalenessReport({
      bundleId: fixture.BUNDLE_ID,
      snapshotId: result.snapshot.snapshotId,
      inputVersion: preflight.inputVersion,
      currentDependencyDigests: {
        'manifest:ledger-planet': preflight.manifestDigest,
        'runtime:ledger-planet.task-list': preflight.inputVersion,
      },
    });
    const evaluation = await evaluateAgentHandoff({
      store,
      bundleId: fixture.BUNDLE_ID,
      snapshotId: result.snapshot.snapshotId,
      selectedCases: result.run.selection.cases,
      stalenessReport: report,
    });
    expect(evaluation.coverageStatus).toBe('complete');
    expect(evaluation.risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'partial-coverage' }),
      ]),
    );
  });

  it('persists required unknowns as readable immutable Issues', async () => {
    await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-unknown'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new UnknownDriver(),
      now,
    });
    expect(await store.listIssues(fixture.BUNDLE_ID)).toEqual([
      expect.objectContaining({
        issueId: 'issue-task-list-hidden-state',
        severity: 'warning',
        nextAction: expect.stringContaining('recapture'),
      }),
    ]);
  });

  it('keeps prior active Evidence when an exact retry fails with changed input', async () => {
    const first = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-before'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(),
      now,
    });
    const emptyCaseId = first.run.selection.cases[0]!.caseId;
    const activeBefore = first.snapshot.activeSlots.find(
      (slot) => slot.caseId === emptyCaseId,
    );
    expect(activeBefore).toBeDefined();

    const retry = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-after'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(new Set(['empty'])),
      now,
    });
    expect(retry.run.attempts[0]?.result).toBe('failed');
    expect(
      retry.snapshot.activeSlots.find((slot) => slot.caseId === emptyCaseId),
    ).toEqual(activeBefore);
    expect(
      retry.snapshot.latestAttempts.find((ref) => ref.caseId === emptyCaseId)
        ?.attemptId,
    ).toBe(retry.run.attempts[0]?.attemptId);
  });

  it('reuses an exact same-input capture without invoking the driver again', async () => {
    const preflight = preflightSelection(
      draft(['claimable']),
      manifest('runtime-input-reuse'),
    );
    const first = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(),
      now,
    });
    const second = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(new Set(['claimable'])),
      now,
    });
    expect(first.run.attempts[0]?.result).toBe('captured');
    expect(second.run.attempts[0]).toMatchObject({
      result: 'reused',
      revisionId: first.run.attempts[0]?.revisionId,
    });
  });

  it('does not start new Cases after cancellation and commits a cancelled partial Snapshot', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty', 'claimable']),
        manifest('runtime-input-cancelled'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(),
      signal: controller.signal,
      now,
    });
    expect(result.run.terminationReason).toBe('cancelled');
    expect(result.run.attempts.map((attempt) => attempt.result)).toEqual([
      'cancelled',
      'cancelled',
    ]);
    expect(result.snapshot.coverage.counts.cancelled).toBe(2);
    expect((await store.getJob(result.jobId))?.status).toBe('cancelled');
  });

  it('records an honest unsupported result when the captured Evidence Level is below Preflight requirements', async () => {
    const lowLevelDriver: CaseCaptureDriver = {
      async captureCase() {
        return {
          evidenceLevel: 'screenshot-only',
          facts: [],
          requiredFactsTotal: 0,
          requiredFactsResolved: 0,
          binaries: [],
          diagnostics: { console: [], pageErrors: [], failedRequests: [] },
        };
      },
    };
    const result = await capturePreflightToStore({
      store,
      bundleId: fixture.BUNDLE_ID,
      preflight: preflightSelection(
        draft(['empty']),
        manifest('runtime-input-unsupported'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: lowLevelDriver,
      now,
    });
    expect(result.run.attempts[0]).toMatchObject({
      result: 'unsupported',
      reason:
        'Captured Evidence Level screenshot-only is below required instrumented-runtime.',
    });
    expect(result.run.terminationReason).toBe('failed');
    expect(result.snapshot.coverage.counts.unsupported).toBe(1);
  });

  it('reports partial Handoff coverage when a requested Screenshot Blob is absent', async () => {
    const bundleId = 'bundle-no-screenshot';
    const preflight = preflightSelection(
      draft(['default']),
      manifest('runtime-input-no-screenshot'),
    );
    const noScreenshotDriver: CaseCaptureDriver = {
      async captureCase(input) {
        const captured = await new FakeDriver().captureCase(input);
        return { ...captured, binaries: [] };
      },
    };
    const result = await capturePreflightToStore({
      store,
      bundleId,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: noScreenshotDriver,
      now,
    });
    expect(result.run.attempts[0]?.result).toBe('captured');
    expect(result.storedBlobIds).toHaveLength(0);

    const report = await store.createStalenessReport({
      bundleId,
      snapshotId: result.snapshot.snapshotId,
      inputVersion: preflight.inputVersion,
      currentDependencyDigests: {
        'manifest:ledger-planet': preflight.manifestDigest,
        'runtime:ledger-planet.task-list': preflight.inputVersion,
      },
    });
    const evaluation = await evaluateAgentHandoff({
      store,
      bundleId,
      snapshotId: result.snapshot.snapshotId,
      selectedCases: result.run.selection.cases,
      stalenessReport: report,
    });
    expect(evaluation.coverageStatus).toBe('partial');
    expect(evaluation.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'partial-coverage',
          message: expect.stringContaining('no screenshot Blob is stored'),
        }),
      ]),
    );
  });

  it('atomically creates the first Bundle/Snapshot and fixes a Handoff to that Snapshot', async () => {
    const bundleId = 'bundle-stage-four-new';
    const preflight = preflightSelection(
      draft(['default']),
      manifest('runtime-input-stage-four'),
    );
    const first = await capturePreflightToStore({
      store,
      bundleId,
      preflight,
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(),
      now,
    });
    expect((await store.getBundle(bundleId))?.prototypeId).toBe(
      'ledger-planet',
    );
    expect(first.snapshot.activeSlots).toHaveLength(1);
    const report = await store.createStalenessReport({
      bundleId,
      snapshotId: first.snapshot.snapshotId,
      inputVersion: preflight.inputVersion,
      currentDependencyDigests: {
        'manifest:ledger-planet': preflight.manifestDigest,
        'runtime:ledger-planet.task-list': preflight.inputVersion,
      },
    });
    const handoff = await createAgentHandoff({
      store,
      bundleId,
      snapshotId: first.snapshot.snapshotId,
      selectedCases: first.run.selection.cases,
      stalenessReport: report,
      currentInputVersion: preflight.inputVersion,
      implementationIntent: '实现任务列表',
      acknowledgedRiskKinds: [],
    });
    expect(handoff.coverageStatus).toBe('complete');
    expect(handoff.freshnessStatus).toBe('fresh');

    const recapture = await capturePreflightToStore({
      store,
      bundleId,
      preflight: preflightSelection(
        draft(['claimable']),
        manifest('runtime-input-stage-four-next'),
      ),
      runtimeBaseUrl: 'http://127.0.0.1:3977',
      driver: new FakeDriver(),
      now,
    });
    expect(recapture.snapshot.snapshotId).not.toBe(first.snapshot.snapshotId);
    expect((await store.getHandoff(handoff.handoffId))?.snapshotId).toBe(
      first.snapshot.snapshotId,
    );
  });
});
