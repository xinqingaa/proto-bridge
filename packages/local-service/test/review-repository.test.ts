import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReviewArtifact, ReviewSessionSeed } from '@proto-bridge/core/review';
import { ReviewRepository } from '../src/review-repository.js';

let root: string | undefined;
const generationId = 'generation-review-test';

function seed(reviewRunId = 'review-test'): ReviewSessionSeed {
  return {
    reviewRunId,
    workspaceId: 'workspace-review-test',
    generationId,
    bundleId: 'bundle-test',
    snapshotId: 'snapshot-test',
    handoffId: 'handoff-test',
    targetRoot: '/tmp/target',
    targetBaselineCommit: 'baseline',
    targetRevision: 'revision-a',
    selectedCaseIds: ['screen::default'],
    requiredSourceDigests: ['sha256:source'],
    requiredScenarioCaseIds: [],
    obligationContractVersion: 1,
    requiredObligations: [
      { obligationId: 'obligation-test', dimension: 'structure', screenId: 'screen', caseIds: ['screen::default'], kind: 'topology', subject: 'content', expected: { scrollOwner: 'content' }, evidenceRefs: ['fact.structure'] },
    ],
    comparatorVersion: 'compare-v1',
    createdAt: '2026-08-04T00:00:00.000Z',
  };
}

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

async function repository() {
  root ??= await mkdtemp(path.join(os.tmpdir(), 'pb-review-repository-'));
  return new ReviewRepository(root, 'workspace-review-test', () => generationId);
}

describe('ReviewRepository', () => {
  it('serializes append-only events and recovers the derived session after restart', async () => {
    const first = await repository();
    await first.start(seed());
    await first.append({ reviewRunId: 'review-test', actor: 'operator', payload: { kind: 'tranche-authorized', screenId: 'screen', tranche: 1, approvalRef: 'approval' } });
    await first.close();

    const restarted = await repository();
    const recovered = await restarted.read('review-test');
    expect(recovered).toMatchObject({ eventCount: 2, status: 'active' });
    const lines = (await readFile(path.join(root!, 'review-test', 'events.ndjson'), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);
    await restarted.close();
  });

  it('rejects a second writer and artifact digest mismatch', async () => {
    const first = await repository();
    await first.start(seed());
    const second = await repository();
    await expect(second.append({ reviewRunId: 'review-test', actor: 'agent', payload: { kind: 'findings-recorded', findings: [] } })).rejects.toMatchObject({ code: 'writer-lock-held' });

    const bytes = Buffer.from('artifact');
    const artifact: ReviewArtifact = {
      kind: 'target',
      digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      mimeType: 'image/png',
      byteLength: bytes.byteLength,
      owner: { screenId: 'screen', caseId: 'screen::default', attemptId: 'attempt-1' },
    };
    await expect(first.putArtifact('review-test', { ...artifact, digest: 'sha256:wrong' }, bytes)).rejects.toMatchObject({ code: 'review-artifact-digest-mismatch' });
    const stored = await first.putArtifact('review-test', artifact, bytes);
    expect(await readFile(stored, 'utf8')).toBe('artifact');
    await first.close();
  });

  it('invalidates recovery when the Workspace generation changes', async () => {
    const first = await repository();
    await first.start(seed());
    await first.close();
    const changed = new ReviewRepository(root!, 'workspace-review-test', () => 'generation-next');
    await expect(changed.read('review-test')).rejects.toThrow(/generation/);
  });
});
