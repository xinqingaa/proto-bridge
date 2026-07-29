import { describe, expect, it } from 'vitest';
import {
  assertJobStatusTransition,
  canTransitionJobStatus,
  CaptureJob,
  terminalJobStatusToRunTerminationReason,
} from '../../src/v2/contracts/job.js';
import { V2_SCHEMA_MAJOR } from '../../src/v2/contracts/version.js';
import { JOB_STATUSES } from '../../src/v2/contracts/vocabulary.js';
import { ledgerPlanetTaskList } from '../../src/v2/fixtures/index.js';

const { WORKSPACE_ID, BUNDLE_ID, PROTOTYPE_ID, TASK_LIST_CASE_ID, TASK_LIST_CASE_KEY, FULL_CASE_SCOPE } = ledgerPlanetTaskList;

const SELECTION = {
  prototypeId: PROTOTYPE_ID,
  cases: [{ caseId: TASK_LIST_CASE_ID, caseKey: TASK_LIST_CASE_KEY, captureScope: FULL_CASE_SCOPE }],
  acceptedWarningIds: [],
};

function baseJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    schemaVersion: V2_SCHEMA_MAJOR,
    jobId: 'job-1',
    workspaceId: WORKSPACE_ID,
    bundleId: BUNDLE_ID,
    selection: SELECTION,
    inputVersion: 'registry-rev-2026-07-28',
    status: 'queued',
    acceptedAt: '2026-07-28T09:00:00.000Z',
    journal: [{ at: '2026-07-28T09:00:00.000Z', event: 'queued' }],
    ...overrides,
  };
}

describe('CaptureJob schema', () => {
  it('exports the one canonical Job status vocabulary', () => {
    expect(JOB_STATUSES).toEqual([
      'queued',
      'discovering',
      'capturing',
      'writing',
      'completed',
      'cancelled',
      'interrupted',
      'failed',
    ]);
    expect(CaptureJob.safeParse(baseJob({ status: 'accepted' })).success).toBe(false);
    expect(CaptureJob.safeParse(baseJob({ status: 'running' })).success).toBe(false);
  });

  it('accepts a freshly queued job with no startedAt/endedAt/runId', () => {
    expect(CaptureJob.safeParse(baseJob()).success).toBe(true);
  });

  it('rejects a queued job that already carries startedAt or runId', () => {
    expect(CaptureJob.safeParse(baseJob({ startedAt: '2026-07-28T09:00:01.000Z' })).success).toBe(false);
    expect(CaptureJob.safeParse(baseJob({ runId: 'run-1' })).success).toBe(false);
  });

  it.each(['discovering', 'capturing', 'writing'] as const)(
    'accepts a %s job with startedAt and runId, and no endedAt',
    (status) => {
      expect(
        CaptureJob.safeParse(baseJob({ status, startedAt: '2026-07-28T09:00:01.000Z', runId: 'run-1' })).success,
      ).toBe(true);
    },
  );

  it.each(['discovering', 'capturing', 'writing'] as const)('rejects a %s job missing startedAt or runId', (status) => {
    expect(CaptureJob.safeParse(baseJob({ status, runId: 'run-1' })).success).toBe(false);
    expect(CaptureJob.safeParse(baseJob({ status, startedAt: '2026-07-28T09:00:01.000Z' })).success).toBe(false);
  });

  it('rejects an executing job that already carries endedAt', () => {
    const invalid = baseJob({
      status: 'capturing',
      startedAt: '2026-07-28T09:00:01.000Z',
      runId: 'run-1',
      endedAt: '2026-07-28T09:00:02.000Z',
    });
    expect(CaptureJob.safeParse(invalid).success).toBe(false);
  });

  it('accepts a terminal job that started and ran to completion', () => {
    const completed = baseJob({
      status: 'completed',
      startedAt: '2026-07-28T09:00:01.000Z',
      runId: 'run-1',
      endedAt: '2026-07-28T09:00:02.000Z',
    });
    expect(CaptureJob.safeParse(completed).success).toBe(true);
  });

  it('accepts a terminal job cancelled before it ever started (no startedAt/runId)', () => {
    const cancelled = baseJob({ status: 'cancelled', endedAt: '2026-07-28T09:00:02.000Z' });
    expect(CaptureJob.safeParse(cancelled).success).toBe(true);
  });

  it('rejects a terminal job missing endedAt', () => {
    expect(CaptureJob.safeParse(baseJob({ status: 'completed', startedAt: 't', runId: 'run-1' })).success).toBe(false);
  });

  it('rejects a terminal job with startedAt but no runId, or vice versa', () => {
    expect(
      CaptureJob.safeParse(
        baseJob({ status: 'interrupted', startedAt: '2026-07-28T09:00:01.000Z', endedAt: '2026-07-28T09:00:02.000Z' }),
      ).success,
    ).toBe(false);
    expect(
      CaptureJob.safeParse(baseJob({ status: 'interrupted', runId: 'run-1', endedAt: '2026-07-28T09:00:02.000Z' })).success,
    ).toBe(false);
  });

  it('requires completed Jobs to have actually started', () => {
    expect(CaptureJob.safeParse(baseJob({ status: 'completed', endedAt: '2026-07-28T09:00:02.000Z' })).success).toBe(false);
  });
});

describe('CaptureJob status transitions', () => {
  it('accepts the complete observable happy path', () => {
    const path = ['queued', 'discovering', 'capturing', 'writing', 'completed'] as const;
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransitionJobStatus(path[index]!, path[index + 1]!)).toBe(true);
      expect(() => assertJobStatusTransition(path[index]!, path[index + 1]!)).not.toThrow();
    }
  });

  it('allows zero-Attempt discovery to proceed directly to writing', () => {
    expect(canTransitionJobStatus('discovering', 'writing')).toBe(true);
  });

  it('allows cancellation, interruption and failure from non-terminal phases', () => {
    for (const from of ['queued', 'discovering', 'capturing', 'writing'] as const) {
      for (const to of ['cancelled', 'interrupted', 'failed'] as const) {
        expect(canTransitionJobStatus(from, to)).toBe(true);
      }
    }
  });

  it('rejects backward, skipped and post-terminal transitions', () => {
    expect(() => assertJobStatusTransition('queued', 'capturing')).toThrow(/cannot transition/);
    expect(() => assertJobStatusTransition('capturing', 'discovering')).toThrow(/cannot transition/);
    expect(() => assertJobStatusTransition('completed', 'writing')).toThrow(/cannot transition/);
  });

  it('uses terminal Job statuses directly as Run termination reasons', () => {
    for (const status of ['completed', 'cancelled', 'interrupted', 'failed'] as const) {
      expect(terminalJobStatusToRunTerminationReason(status)).toBe(status);
    }
  });
});
