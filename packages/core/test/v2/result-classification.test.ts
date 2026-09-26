import { describe, expect, it } from 'vitest';
import type { CoverageCounts } from '../../src/v2/contracts/coverage.js';
import type { PrototypeLifecycleRecord } from '../../src/v2/contracts/prototype-lifecycle.js';
import {
  classifyCaptureResults,
  type ClassifyCaptureResultsInput,
  type ResultBundleFact,
  type ResultReceiptFact,
} from '../../src/v2/result-classification.js';

const digest = `sha256:${'a'.repeat(64)}`;
const operationKey = '00000000-0000-4000-8000-0000000000b7';
const now = '2026-09-26T02:00:00.000Z';

const completeCounts: CoverageCounts = {
  selected: 4,
  captured: 4,
  reused: 0,
  failed: 0,
  skipped: 0,
  unsupported: 0,
  cancelled: 0,
  interrupted: 0,
  missing: 0,
  stale: 0,
};

const partialCounts: CoverageCounts = {
  ...completeCounts,
  captured: 3,
  failed: 1,
};

function bundle(input: Partial<ResultBundleFact> & Pick<ResultBundleFact, 'bundleId'>): ResultBundleFact {
  return {
    prototypeId: 'cold-chain-ops',
    status: 'writable',
    snapshots: [
      {
        snapshotId: 'snapshot-active',
        sourceRunId: 'run-active',
        coverageCounts: completeCounts,
      },
    ],
    ...input,
  };
}

function record(patch: Partial<PrototypeLifecycleRecord> & Pick<PrototypeLifecycleRecord, 'operation'>): PrototypeLifecycleRecord {
  return {
    prototypeId: 'cold-chain-ops',
    stage: 'review',
    artifacts: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

function input(patch: Partial<ClassifyCaptureResultsInput> = {}): ClassifyCaptureResultsInput {
  return {
    lifecycle: { records: {} },
    bundles: [],
    jobs: [],
    receipts: [],
    handoffs: [],
    objectFactsKnown: true,
    ...patch,
  };
}

const officialArtifacts = {
  jobId: 'job-official',
  bundleId: 'bundle-official',
  snapshotId: 'snapshot-official',
  handoffId: 'handoff-official',
  deliveryId: 'delivery-official',
  agentPromptPath: '/tmp/agent-prompt.md',
  receiptPath: '/tmp/receipt.json',
  finalizedAt: now,
  operationKey,
  requestDigest: digest,
};

function officialBundle(): ResultBundleFact {
  return bundle({
    bundleId: 'bundle-official',
    snapshots: [
      {
        snapshotId: 'snapshot-official',
        sourceRunId: 'run-official',
        coverageCounts: completeCounts,
      },
      {
        snapshotId: 'snapshot-later',
        sourceRunId: 'run-later',
        coverageCounts: completeCounts,
      },
    ],
  });
}

function officialReceipt(source?: ResultReceiptFact['source']): ResultReceiptFact {
  return {
    deliveryId: 'delivery-official',
    bundleId: 'bundle-official',
    snapshotId: 'snapshot-official',
    handoffId: 'handoff-official',
    ...(source ? { source } : {}),
  };
}

function officialFacts(source?: ResultReceiptFact['source']): ClassifyCaptureResultsInput {
  return input({
    lifecycle: {
      records: {
        'cold-chain-ops': record({
          stage: 'final',
          operation: { kind: 'idle' },
          artifacts: officialArtifacts,
        }),
      },
    },
    bundles: [officialBundle()],
    jobs: [
      {
        jobId: 'job-official',
        bundleId: 'bundle-official',
        runId: 'run-official',
        status: 'completed',
        operationKey,
      },
      {
        jobId: 'job-later',
        bundleId: 'bundle-official',
        runId: 'run-later',
        status: 'completed',
      },
    ],
    handoffs: [
      {
        handoffId: 'handoff-official',
        bundleId: 'bundle-official',
        snapshotId: 'snapshot-official',
      },
    ],
    receipts: [officialReceipt(source)],
  });
}

describe('capture result classification', () => {
  it('marks an exact lifecycle binding as officially finalized', () => {
    const classified = classifyCaptureResults(officialFacts('gui'));
    expect(classified.snapshot('bundle-official', 'snapshot-official')).toMatchObject({
      kind: 'officially-finalized',
      origin: 'gui',
      handoffId: 'handoff-official',
      deliveryId: 'delivery-official',
      incompleteCount: 0,
    });
    expect(classified.prototype('cold-chain-ops')?.kind).toBe('officially-finalized');
    expect(classified.job('job-official')?.kind).toBe('officially-finalized');
  });

  it('does not treat a later complete Snapshot or active result as the formal binding', () => {
    const classified = classifyCaptureResults(officialFacts('gui'));
    expect(classified.snapshot('bundle-official', 'snapshot-later')).toMatchObject({
      kind: 'diagnostic-only',
      origin: 'unknown',
    });
    expect(classified.job('job-later')?.kind).toBe('diagnostic-only');
    expect(classified.job('job-later')?.snapshotId).toBe('snapshot-later');
  });

  it('keeps a complete unbound Bundle diagnostic, including a CLI receipt', () => {
    const classified = classifyCaptureResults(input({
      bundles: [
        bundle({
          bundleId: 'bundle-cli',
          prototypeId: 'hengdong',
          snapshots: [
            {
              snapshotId: 'snapshot-cli',
              sourceRunId: 'run-cli',
              coverageCounts: completeCounts,
            },
          ],
        }),
      ],
      receipts: [
        {
          deliveryId: 'delivery-cli',
          bundleId: 'bundle-cli',
          snapshotId: 'snapshot-cli',
          handoffId: 'handoff-cli',
          source: 'cli',
        },
      ],
    }));
    expect(classified.snapshot('bundle-cli', 'snapshot-cli')).toMatchObject({
      kind: 'diagnostic-only',
      origin: 'cli',
      incompleteCount: 0,
    });
  });

  it('reports an unknown origin when the matching receipt has no source', () => {
    const classified = classifyCaptureResults(officialFacts());
    expect(classified.snapshot('bundle-official', 'snapshot-official')).toMatchObject({
      kind: 'officially-finalized',
      origin: 'unknown',
    });
  });

  it('does not guess when matching receipts disagree about source', () => {
    const classified = classifyCaptureResults(input({
      bundles: [bundle({ bundleId: 'bundle-mixed', snapshots: [{
        snapshotId: 'snapshot-mixed',
        sourceRunId: 'run-mixed',
        coverageCounts: completeCounts,
      }] })],
      receipts: [
        {
          deliveryId: 'delivery-a',
          bundleId: 'bundle-mixed',
          snapshotId: 'snapshot-mixed',
          handoffId: 'handoff-a',
          source: 'cli',
        },
        {
          deliveryId: 'delivery-b',
          bundleId: 'bundle-mixed',
          snapshotId: 'snapshot-mixed',
          handoffId: 'handoff-b',
          source: 'gui',
        },
      ],
    }));
    expect(classified.snapshot('bundle-mixed', 'snapshot-mixed').origin).toBe('unknown');
  });

  it.each([
    ['preflighting', 'finalizing'],
    ['capturing', 'finalizing'],
    ['building-prompt', 'finalizing'],
    ['awaiting-confirmation', 'awaiting-item-confirmation'],
    ['awaiting-risks', 'awaiting-item-confirmation'],
  ] as const)('maps finalization phase %s to %s', (phase, kind) => {
    const classified = classifyCaptureResults(input({
      lifecycle: {
        records: {
          'cold-chain-ops': record({
            operation: {
              kind: 'finalizing',
              operationKey,
              phase,
              startedAt: now,
              ...(phase === 'awaiting-risks' || phase === 'building-prompt'
                ? { jobId: 'job-live', bundleId: 'bundle-live', snapshotId: 'snapshot-live' }
                : {}),
            },
          }),
        },
      },
      bundles: phase === 'preflighting' || phase === 'awaiting-confirmation'
        ? []
        : [bundle({
          bundleId: 'bundle-live',
          snapshots: [{
            snapshotId: 'snapshot-live',
            sourceRunId: 'run-live',
            coverageCounts: partialCounts,
          }],
        })],
      jobs: phase === 'preflighting' || phase === 'awaiting-confirmation'
        ? []
        : [{
          jobId: 'job-live',
          bundleId: 'bundle-live',
          runId: 'run-live',
          status: 'completed',
          operationKey,
        }],
    }));
    expect(classified.prototype('cold-chain-ops')).toMatchObject({
      kind,
      origin: 'unknown',
      ...(phase === 'awaiting-risks' || phase === 'building-prompt'
        ? { incompleteCount: 1, snapshotId: 'snapshot-live' }
        : {}),
    });
  });

  it('marks a failed finalization, and its linked partial Snapshot, as incomplete', () => {
    const classified = classifyCaptureResults(input({
      lifecycle: {
        records: {
          'cold-chain-ops': record({
            operation: {
              kind: 'failed',
              action: 'finalize',
              operationKey,
              message: '采集未完整',
              failedAt: now,
            },
          }),
        },
      },
      bundles: [bundle({
        bundleId: 'bundle-failed',
        snapshots: [{
          snapshotId: 'snapshot-failed',
          sourceRunId: 'run-failed',
          coverageCounts: partialCounts,
        }],
      })],
      jobs: [{
        jobId: 'job-failed',
        bundleId: 'bundle-failed',
        runId: 'run-failed',
        status: 'completed',
        operationKey,
      }],
    }));
    expect(classified.prototype('cold-chain-ops')).toMatchObject({
      kind: 'finalization-incomplete',
      snapshotId: 'snapshot-failed',
      incompleteCount: 1,
    });
    expect(classified.snapshot('bundle-failed', 'snapshot-failed').kind).toBe('finalization-incomplete');
    expect(classified.job('job-failed')?.kind).toBe('finalization-incomplete');
  });

  it('marks a trashed lifecycle binding as a broken reference', () => {
    const facts = officialFacts('gui');
    facts.bundles = [{ ...officialBundle(), status: 'trashed' }];
    const classified = classifyCaptureResults(facts);
    expect(classified.snapshot('bundle-official', 'snapshot-official')).toMatchObject({
      kind: 'reference-invalid',
      origin: 'gui',
    });
    expect(classified.prototype('cold-chain-ops')?.kind).toBe('reference-invalid');
  });

  it('marks a deleted bound Snapshot as a broken reference and does not reuse another Snapshot', () => {
    const facts = officialFacts('gui');
    facts.bundles = [bundle({
      bundleId: 'bundle-official',
      snapshots: [{
        snapshotId: 'snapshot-later',
        sourceRunId: 'run-later',
        coverageCounts: completeCounts,
      }],
    })];
    facts.jobs = [
      ...(facts.jobs),
      {
        jobId: 'job-unread',
        bundleId: 'bundle-official',
        runId: 'run-missing',
        status: 'completed',
      },
    ];
    const classified = classifyCaptureResults(facts);
    const bound = classified.snapshot('bundle-official', 'snapshot-official');
    expect(bound).toMatchObject({
      kind: 'reference-invalid',
      snapshotId: 'snapshot-official',
      incompleteCount: 0,
    });
    expect(classified.snapshot('bundle-official', 'snapshot-later').kind).toBe('diagnostic-only');
    expect(classified.job('job-official')).toMatchObject({
      kind: 'reference-invalid',
      snapshotId: 'snapshot-official',
    });
    expect(classified.job('job-unread')).toMatchObject({ kind: 'read-failed' });
    expect(classified.job('job-unread')?.snapshotId).toBeUndefined();
  });

  it('reports a Snapshot read failure without borrowing another active Snapshot', () => {
    const facts = officialFacts('gui');
    facts.bundles = [bundle({
      bundleId: 'bundle-official',
      snapshots: [{
        snapshotId: 'snapshot-later',
        sourceRunId: 'run-later',
        coverageCounts: partialCounts,
      }],
    })];
    facts.unreadableSnapshots = [{ bundleId: 'bundle-official', snapshotId: 'snapshot-official' }];
    const classified = classifyCaptureResults(facts);
    expect(classified.snapshot('bundle-official', 'snapshot-official')).toMatchObject({
      kind: 'read-failed',
      incompleteCount: 0,
      snapshotId: 'snapshot-official',
    });
    expect(classified.snapshot('bundle-official', 'snapshot-later')).toMatchObject({
      kind: 'diagnostic-only',
      incompleteCount: 1,
    });
  });

  it('keeps an in-progress phase when object facts have not loaded', () => {
    const classified = classifyCaptureResults(input({
      objectFactsKnown: false,
      lifecycle: {
        records: {
          'cold-chain-ops': record({
            operation: {
              kind: 'finalizing',
              operationKey,
              phase: 'awaiting-confirmation',
              startedAt: now,
            },
          }),
        },
      },
    }));
    expect(classified.prototype('cold-chain-ops')?.kind).toBe('awaiting-item-confirmation');
  });
});
