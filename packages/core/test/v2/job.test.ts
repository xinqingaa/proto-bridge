import { describe, expect, it } from 'vitest';
import { CaptureJob } from '../../src/v2/contracts/job.js';
import { V2_SCHEMA_MAJOR } from '../../src/v2/contracts/version.js';
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
    status: 'accepted',
    acceptedAt: '2026-07-28T09:00:00.000Z',
    journal: [{ at: '2026-07-28T09:00:00.000Z', event: 'accepted' }],
    ...overrides,
  };
}

describe('CaptureJob schema', () => {
  it('accepts a freshly accepted job with no startedAt/endedAt/runId', () => {
    expect(CaptureJob.safeParse(baseJob()).success).toBe(true);
  });

  it('rejects an accepted job that already carries startedAt or runId', () => {
    expect(CaptureJob.safeParse(baseJob({ startedAt: '2026-07-28T09:00:01.000Z' })).success).toBe(false);
    expect(CaptureJob.safeParse(baseJob({ runId: 'run-1' })).success).toBe(false);
  });

  it('accepts a running job with startedAt and runId, and no endedAt', () => {
    const running = baseJob({ status: 'running', startedAt: '2026-07-28T09:00:01.000Z', runId: 'run-1' });
    expect(CaptureJob.safeParse(running).success).toBe(true);
  });

  it('rejects a running job missing startedAt or runId', () => {
    expect(CaptureJob.safeParse(baseJob({ status: 'running', runId: 'run-1' })).success).toBe(false);
    expect(CaptureJob.safeParse(baseJob({ status: 'running', startedAt: '2026-07-28T09:00:01.000Z' })).success).toBe(false);
  });

  it('rejects a running job that already carries endedAt', () => {
    const invalid = baseJob({
      status: 'running',
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
});
