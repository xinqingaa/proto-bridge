import { describe, expect, it } from 'vitest';
import {
  assertPrototypeLifecycleUpdate,
  PrototypeLifecycleDocument,
} from '../../src/v2/contracts/prototype-lifecycle.js';

const at = '2026-09-26T00:00:00.000Z';
const operationKey = '00000000-0000-4000-8000-000000000001';
const artifacts = {
  jobId: 'job-lifecycle-1',
  bundleId: 'bundle-lifecycle-1',
  snapshotId: 'snapshot-lifecycle-1',
  handoffId: 'handoff-lifecycle-1',
  deliveryId: 'delivery-lifecycle-1',
  agentPromptPath: '/deliveries/agent-prompt.md',
  receiptPath: '/deliveries/receipt.json',
  finalizedAt: at,
  operationKey,
  requestDigest: `sha256:${'a'.repeat(64)}`,
};

function document(stage: 'review' | 'final') {
  return PrototypeLifecycleDocument.parse({
    schemaVersion: 1,
    workspaceId: 'workspace-lifecycle-test',
    generationId: 'generation-lifecycle-test',
    revision: 1,
    records: {
      sample: {
        prototypeId: 'sample',
        stage,
        operation: { kind: 'idle' },
        artifacts: stage === 'final' ? artifacts : null,
        createdAt: at,
        updatedAt: at,
      },
    },
    history: [],
    updatedAt: at,
  });
}

function update(
  previous: ReturnType<typeof document>,
  record: Record<string, unknown>,
) {
  return {
    ...previous,
    revision: previous.revision + 1,
    records: { sample: { ...previous.records.sample, ...record } },
    updatedAt: at,
  };
}

describe('Prototype lifecycle transition contract', () => {
  it('starts finalization only at preflight with no fixed artifact refs', () => {
    const previous = document('review');
    const base = {
      kind: 'finalizing',
      operationKey,
      phase: 'preflighting',
      startedAt: at,
      acceptedWarningIds: [],
      acknowledgedRiskKinds: [],
    };
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, { operation: base }) as never,
      ),
    ).not.toThrow();
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, {
          operation: { ...base, phase: 'awaiting-confirmation' },
        }) as never,
      ),
    ).toThrow(/must start at preflighting/);
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, {
          operation: { ...base, bundleId: artifacts.bundleId },
        }) as never,
      ),
    ).toThrow(/without fixed artifact references/);
  });

  it('starts rollback from final and binds it to exactly the finalized Bundle', () => {
    const previous = document('final');
    const rollback = {
      kind: 'rolling-back',
      operationKey: '00000000-0000-4000-8000-000000000002',
      startedAt: at,
      bundleIds: [artifacts.bundleId],
    };
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, { operation: rollback }) as never,
      ),
    ).not.toThrow();
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, {
          operation: { ...rollback, bundleIds: ['bundle-other'] },
        }) as never,
      ),
    ).toThrow(/exactly its bound Bundle/);
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, {
          operation: { ...rollback, bundleIds: [artifacts.bundleId, 'bundle-other'] },
        }) as never,
      ),
    ).toThrow(/exactly its bound Bundle/);
  });

  it('does not allow final to review without a persisted rollback operation', () => {
    const previous = document('final');
    expect(() =>
      assertPrototypeLifecycleUpdate(
        previous,
        update(previous, {
          stage: 'review',
          operation: { kind: 'idle' },
          artifacts: null,
        }) as never,
      ),
    ).toThrow(/finish the operation/);
  });
});
