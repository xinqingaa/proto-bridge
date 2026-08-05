import { describe, expect, it } from 'vitest';
import {
  createReviewEvent,
  reduceReviewEvents,
  reviewVerifierReceiptDigest,
  type ReviewActor,
  type ReviewEvent,
  type ReviewEventPayload,
  type ReviewSessionSeed,
} from '../../src/review/index.js';

const seed: ReviewSessionSeed = {
  reviewRunId: 'review-test',
  workspaceId: 'workspace-test',
  generationId: 'generation-test',
  bundleId: 'bundle-test',
  snapshotId: 'snapshot-test',
  handoffId: 'handoff-test',
  targetRoot: '/target',
  targetBaselineCommit: 'base',
  targetRevision: 'revision-a',
  selectedCaseIds: ['screen::default', 'screen::scenario'],
  requiredSourceDigests: ['sha256:source-a'],
  requiredScenarioCaseIds: ['screen::scenario'],
  obligationContractVersion: 1,
  requiredObligations: [
    { obligationId: 'obligation-structure', dimension: 'structure', screenId: 'screen', caseIds: ['screen::default'], kind: 'semantic-region-topology', subject: 'content', expected: { scrollOwner: 'content' }, evidenceRefs: ['fact.structure'] },
    { obligationId: 'obligation-token', dimension: 'tokens', screenId: 'screen', caseIds: ['screen::default'], kind: 'token-mapping', subject: 'content.background', expected: { tokenId: 'surface.primary' }, evidenceRefs: ['fact.token'] },
  ],
  verificationContractVersion: 1,
  comparatorVersion: 'compare-v1',
  createdAt: '2026-08-04T00:00:00.000Z',
};

function chain(...items: Array<{ actor: ReviewActor; payload: ReviewEventPayload; tool?: string }>): ReviewEvent[] {
  const events: ReviewEvent[] = [];
  for (const [index, item] of [{ actor: 'operator' as const, payload: { kind: 'session-started' as const, seed } }, ...items].entries()) {
    events.push(createReviewEvent({
      eventId: `event-${index}`,
      previousEventDigest: events.at(-1)?.eventDigest ?? null,
      at: `2026-08-04T00:00:0${index}.000Z`,
      actor: item.actor,
      ...(['mcp', 'runner'].includes(item.actor) ? { tool: item.tool ?? `${item.actor}-test-tool` } : {}),
      payload: item.payload,
    }));
  }
  return events;
}

const source = { kind: 'source' as const, digest: 'sha256:source-a', mimeType: 'image/png', byteLength: 1, width: 1170, height: 2532, owner: { screenId: 'screen' } };
const target = { kind: 'target' as const, digest: 'sha256:target-a', mimeType: 'image/png', byteLength: 1, width: 1170, height: 2532, owner: { screenId: 'screen', caseId: 'screen::default', attemptId: 'attempt-1' } };
const diff = { kind: 'diff' as const, digest: 'sha256:diff-a', mimeType: 'image/png', byteLength: 1, width: 1170, height: 2532, owner: { screenId: 'screen', caseId: 'screen::default', attemptId: 'attempt-1' } };

const unsignedVerifierReceipt = {
  receiptVersion: 1 as const,
  verifierId: 'fixture-verifier-v1',
  adapterId: 'fixture',
  targetRevision: seed.targetRevision,
  targetHead: seed.targetBaselineCommit,
  targetContentDigest: 'sha256:content',
  results: seed.requiredObligations.map((item) => ({
    obligationId: item.obligationId,
    dimension: item.dimension,
    status: 'matched' as const,
    detail: 'Machine verified.',
  })),
};
const verifierReceipt = {
  ...unsignedVerifierReceipt,
  receiptDigest: reviewVerifierReceiptDigest(unsignedVerifierReceipt),
};

function coverageEvents(): Array<{ actor: ReviewActor; payload: ReviewEventPayload; tool?: string }> {
  return [
    { actor: 'operator', payload: { kind: 'tranche-authorized', screenId: 'screen', tranche: 1, approvalRef: 'approval-1' } },
    { actor: 'mcp', payload: { kind: 'screenshot-viewed', screenId: 'screen', caseIds: seed.selectedCaseIds, source } },
    { actor: 'runner', payload: { kind: 'target-rendered', screenId: 'screen', caseId: 'screen::default', sourceDigest: source.digest, tranche: 1, round: 1, attemptId: 'attempt-1', targetRevision: seed.targetRevision, target } },
    { actor: 'runner', payload: { kind: 'artifacts-compared', screenId: 'screen', caseId: 'screen::default', attemptId: 'attempt-1', sourceDigest: source.digest, targetDigest: target.digest, diff, comparable: true, normalizedDiffSignature: 'signature-a' } },
    { actor: 'runner', payload: { kind: 'scenario-replayed', screenId: 'screen', caseId: 'screen::scenario', scenarioId: 'scenario', receiptDigest: 'sha256:scenario', targetRevision: seed.targetRevision } },
    { actor: 'runner', tool: verifierReceipt.verifierId, payload: { kind: 'target-claims-verified', receipt: verifierReceipt } },
  ];
}

const matchedAssessments = seed.requiredObligations.map((item) => ({
  obligationId: item.obligationId,
  status: 'matched' as const,
  detail: 'Verified against target implementation and runtime receipt.',
  evidenceDigests: [diff.digest, verifierReceipt.receiptDigest],
  verifierReceiptDigest: verifierReceipt.receiptDigest,
}));

describe('authoritative Review reducer', () => {
  it('completes only from runner receipts and human confirmation', () => {
    const events = chain(
      ...coverageEvents(),
      { actor: 'agent', payload: { kind: 'obligations-assessed', assessments: matchedAssessments } },
      { actor: 'agent', payload: { kind: 'findings-recorded', findings: [{ findingId: 'minor', screenId: 'screen', severity: 'Minor', status: 'open', detail: 'detail', evidenceDigests: [diff.digest] }] } },
      { actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human-confirmation', decision: 'complete' } },
    );
    expect(reduceReviewEvents(events)).toMatchObject({ status: 'completed', eventCount: 10 });
  });

  it('does not confuse complete artifact coverage or empty findings with semantic verification', () => {
    const zeroAssessments = chain(
      ...coverageEvents(),
      { actor: 'agent', payload: { kind: 'findings-recorded', findings: [] } },
      { actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human', decision: 'complete' } },
    );
    expect(() => reduceReviewEvents(zeroAssessments)).toThrow(/missingObligations/);

    const partialAssessments = chain(
      ...coverageEvents(),
      { actor: 'agent', payload: { kind: 'obligations-assessed', assessments: matchedAssessments.slice(0, 1) } },
      { actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human', decision: 'complete' } },
    );
    expect(() => reduceReviewEvents(partialAssessments)).toThrow(/obligation-token/);
  });

  it('blocks unverified and deviating obligations, while all matched obligations may complete with no findings', () => {
    for (const status of ['unverified', 'deviation'] as const) {
      const assessments = matchedAssessments.map((item, index) => {
        if (index !== 0) return item;
        const { verifierReceiptDigest: _, ...withoutReceipt } = item;
        return { ...withoutReceipt, status, evidenceDigests: [diff.digest] };
      });
      expect(() => reduceReviewEvents(chain(
        ...coverageEvents(),
        { actor: 'agent', payload: { kind: 'obligations-assessed', assessments } },
        { actor: 'agent', payload: { kind: 'findings-recorded', findings: [] } },
        { actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human', decision: 'complete' } },
      ))).toThrow(status === 'unverified' ? /unverifiedObligations/ : /deviatingObligations/);
    }

    expect(reduceReviewEvents(chain(
      ...coverageEvents(),
      { actor: 'agent', payload: { kind: 'obligations-assessed', assessments: matchedAssessments } },
      { actor: 'agent', payload: { kind: 'findings-recorded', findings: [] } },
      { actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human', decision: 'complete' } },
    )).status).toBe('completed');
  });

  it('rejects unknown obligations and agent-authored not-applicable claims', () => {
    expect(() => reduceReviewEvents(chain({
      actor: 'agent',
      payload: { kind: 'obligations-assessed', assessments: [{ obligationId: 'obligation-unknown', status: 'matched', detail: 'invented', evidenceDigests: [] }] },
    }))).toThrow(/Unknown Review obligation/);
    expect(() => reduceReviewEvents(chain({
      actor: 'agent',
      payload: { kind: 'obligations-assessed', assessments: [{ obligationId: 'obligation-structure', status: 'not-applicable', detail: 'not used', evidenceDigests: [], targetBasis: 'target policy' }] },
    }))).toThrow(/operator\/human authority/);
  });

  it('rejects matched assessments without verifier authority and tampered receipts', () => {
    expect(() => reduceReviewEvents(chain({
      actor: 'agent',
      payload: { kind: 'obligations-assessed', assessments: [{ obligationId: 'obligation-structure', status: 'matched', detail: 'self asserted', evidenceDigests: [] }] },
    }))).toThrow(/requires a successful verifier receipt/);

    expect(() => reduceReviewEvents(chain({
      actor: 'runner',
      tool: verifierReceipt.verifierId,
      payload: { kind: 'target-claims-verified', receipt: { ...verifierReceipt, receiptDigest: 'sha256:tampered' } },
    }))).toThrow(/receipt digest is invalid/);

    const driftedUnsigned = { ...unsignedVerifierReceipt, targetContentDigest: 'sha256:other-content' };
    const driftedReceipt = { ...driftedUnsigned, receiptDigest: reviewVerifierReceiptDigest(driftedUnsigned) };
    expect(() => reduceReviewEvents(chain(
      { actor: 'runner', tool: verifierReceipt.verifierId, payload: { kind: 'target-claims-verified', receipt: verifierReceipt } },
      { actor: 'runner', tool: driftedReceipt.verifierId, payload: { kind: 'target-claims-verified', receipt: driftedReceipt } },
    ))).toThrow(/content drifted/);
  });

  it('keeps legacy Review event logs readable but prevents silent completion', () => {
    const legacySeed = { ...seed } as ReviewSessionSeed & { obligationContractVersion?: never; requiredObligations?: never };
    delete legacySeed.obligationContractVersion;
    delete legacySeed.requiredObligations;
    delete legacySeed.verificationContractVersion;
    const legacyStart = createReviewEvent({ eventId: 'legacy-0', previousEventDigest: null, at: '2026-08-04T00:00:00.000Z', actor: 'operator', payload: { kind: 'session-started', seed: legacySeed } });
    expect(reduceReviewEvents([legacyStart])).toMatchObject({ obligationContractVersion: 'legacy-unavailable', requiredObligations: [] });
    const finalize = createReviewEvent({ eventId: 'legacy-1', previousEventDigest: legacyStart.eventDigest, at: '2026-08-04T00:00:01.000Z', actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human', decision: 'complete' } });
    expect(() => reduceReviewEvents([legacyStart, finalize])).toThrow(/legacyObligationContractMissing/);
  });

  it('rejects event-chain, revision, authorization and completion forgery', () => {
    const unauthorized = chain({ actor: 'agent', payload: { kind: 'tranche-authorized', screenId: 'screen', tranche: 1, approvalRef: 'fake' } });
    expect(() => reduceReviewEvents(unauthorized)).toThrow(/self-authorize/);
    const tampered = chain();
    tampered[0]!.eventDigest = 'sha256:tampered';
    expect(() => reduceReviewEvents(tampered)).toThrow(/event chain/);
    const drift = chain(
      { actor: 'operator', payload: { kind: 'tranche-authorized', screenId: 'screen', tranche: 1, approvalRef: 'ok' } },
      { actor: 'runner', payload: { kind: 'target-rendered', screenId: 'screen', caseId: 'screen::default', sourceDigest: source.digest, tranche: 1, round: 1, attemptId: 'attempt-1', targetRevision: 'revision-b', target } },
    );
    expect(() => reduceReviewEvents(drift)).toThrow(/revision drifted/);
    const earlyFinalize = chain({ actor: 'human', payload: { kind: 'human-finalized', confirmationRef: 'human', decision: 'complete' } });
    expect(() => reduceReviewEvents(earlyFinalize)).toThrow(/completion gates failed/);
  });

  it('enforces accepted-deviation authority and bounded stop conditions', () => {
    const accepted = chain({ actor: 'agent', payload: { kind: 'findings-recorded', findings: [{ findingId: 'accepted', screenId: 'screen', severity: 'Accepted', status: 'accepted', detail: 'native', evidenceDigests: [], targetBasis: 'docs/theme.md', humanConfirmed: true }] } });
    expect(() => reduceReviewEvents(accepted)).toThrow(/human confirmation/);

    const rounds = chain(
      { actor: 'operator', payload: { kind: 'tranche-authorized', screenId: 'screen', tranche: 1, approvalRef: 'ok' } },
      { actor: 'runner', payload: { kind: 'target-rendered', screenId: 'screen', caseId: 'screen::default', sourceDigest: source.digest, tranche: 1, round: 1, attemptId: 'attempt-1', targetRevision: seed.targetRevision, target } },
      { actor: 'runner', payload: { kind: 'target-rendered', screenId: 'screen', caseId: 'screen::default', sourceDigest: source.digest, tranche: 1, round: 2, attemptId: 'attempt-2', targetRevision: seed.targetRevision, target: { ...target, digest: 'sha256:target-2', owner: { ...target.owner, attemptId: 'attempt-2' } } } },
      { actor: 'runner', payload: { kind: 'target-rendered', screenId: 'screen', caseId: 'screen::default', sourceDigest: source.digest, tranche: 1, round: 3, attemptId: 'attempt-3', targetRevision: seed.targetRevision, target: { ...target, digest: 'sha256:target-3', owner: { ...target.owner, attemptId: 'attempt-3' } } } },
      { actor: 'agent', payload: { kind: 'findings-recorded', findings: [{ findingId: 'major', screenId: 'screen', severity: 'Major', status: 'open', detail: 'still open', evidenceDigests: [] }] } },
    );
    expect(reduceReviewEvents(rounds)).toMatchObject({ status: 'needs-human', stopReason: 'tranche-round-limit' });
    expect(() => reduceReviewEvents(chain(), { generationId: 'generation-other' })).toThrow(/generation/);
  });
});
