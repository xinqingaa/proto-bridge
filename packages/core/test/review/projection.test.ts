import { describe, expect, it } from 'vitest';
import {
  projectReviewObligations,
  projectReviewSession,
  type ReviewSession,
} from '../../src/review/index.js';

const obligations: ReviewSession['requiredObligations'] = [
  { obligationId: 'obligation-a', dimension: 'structure', screenId: 'screen-a', caseIds: ['case-a'], kind: 'topology', subject: 'content', expected: { value: 'expected-value-a' }, evidenceRefs: ['fact-a'] },
  { obligationId: 'obligation-b', dimension: 'structure', screenId: 'screen-a', caseIds: ['case-a'], kind: 'topology', subject: 'header', expected: { value: 'expected-value-b' }, evidenceRefs: ['fact-b'] },
  { obligationId: 'obligation-c', dimension: 'tokens', screenId: 'screen-a', caseIds: ['case-a'], kind: 'token', subject: 'content.color', expected: { tokenId: 'surface' }, evidenceRefs: ['fact-c'] },
];

function session(): ReviewSession {
  return {
    reviewRunId: 'review-test',
    workspaceId: 'workspace-test',
    generationId: 'generation-test',
    bundleId: 'bundle-test',
    snapshotId: 'snapshot-test',
    handoffId: 'handoff-test',
    targetRoot: '/target',
    targetBaselineCommit: 'base',
    targetRevision: 'revision',
    selectedCaseIds: ['case-a'],
    requiredSourceDigests: ['sha256:source'],
    requiredScenarioCaseIds: [],
    obligationContractVersion: 1,
    requiredObligations: obligations,
    comparatorVersion: 'compare-v1',
    createdAt: '2026-08-05T00:00:00.000Z',
    status: 'active',
    eventHeadDigest: 'sha256:event',
    eventCount: 2,
    viewedSourceDigests: [],
    renderedSourceDigests: [],
    replayedScenarioCaseIds: [],
    authorizedTranches: [],
    attempts: [],
    findings: [],
    obligationAssessments: [{ obligationId: 'obligation-a', status: 'matched', detail: 'verified', evidenceDigests: ['sha256:receipt'] }],
    artifacts: [],
  };
}

describe('Review progressive projection', () => {
  it('returns Review progress without embedding the obligation payload', () => {
    const projected = projectReviewSession(session());
    expect(projected.obligationSummary).toMatchObject({
      required: 3,
      assessed: 1,
      unassessed: 2,
      byStatus: { matched: 1, unassessed: 2 },
    });
    expect(projected.obligationQueryHints).toEqual([
      { screenId: 'screen-a', dimension: 'structure' },
      { screenId: 'screen-a', dimension: 'tokens' },
    ]);
    expect(JSON.stringify(projected)).not.toContain('expected-value-a');
    expect(projected).not.toHaveProperty('requiredObligations');
  });

  it('pages and filters obligations by fixed Review assessment state', () => {
    const first = projectReviewObligations(session(), {
      reviewRunId: 'review-test',
      screenId: 'screen-a',
      dimension: 'structure',
      pageSize: 1,
    });
    expect(first.items).toHaveLength(1);
    expect(first.continuation).toMatch(/^pbrp1\./);
    const second = projectReviewObligations(session(), {
      reviewRunId: 'review-test',
      screenId: 'screen-a',
      dimension: 'structure',
      pageSize: 1,
      cursor: first.continuation,
    });
    expect(second.items[0]?.obligation.obligationId).toBe('obligation-b');

    const unassessed = projectReviewObligations(session(), {
      reviewRunId: 'review-test',
      status: 'unassessed',
    });
    expect(unassessed.items.map((item) => item.obligation.obligationId)).toEqual(['obligation-b', 'obligation-c']);
    expect(() => projectReviewObligations(session(), {
      reviewRunId: 'review-test',
      dimension: 'tokens',
      cursor: first.continuation,
    })).toThrowError(expect.objectContaining({ code: 'invalid-continuation' }));
  });
});
