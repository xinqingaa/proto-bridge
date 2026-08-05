import { createHash } from 'node:crypto';
import type {
  ReviewActor,
  ReviewEvent,
  ReviewEventPayload,
  ReviewFinding,
  ReviewObligationAssessment,
  ReviewSession,
} from './contracts.js';

export function reviewEventDigest(input: Omit<ReviewEvent, 'eventDigest'>): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(input)).digest('hex')}`;
}

export function createReviewEvent(input: {
  eventId: string;
  previousEventDigest: string | null;
  at: string;
  actor: ReviewActor;
  tool?: string;
  payload: ReviewEventPayload;
}): ReviewEvent {
  return { ...input, eventDigest: reviewEventDigest(input) };
}

export function reduceReviewEvents(
  events: ReviewEvent[],
  expected?: { generationId?: string | 'legacy-unavailable'; targetRevision?: string },
): ReviewSession {
  if (events.length === 0 || events[0]?.payload.kind !== 'session-started') {
    throw new Error('Review event chain must start with session-started.');
  }
  let previous: string | null = null;
  let session: ReviewSession | undefined;
  const findingById = new Map<string, ReviewFinding>();
  const assessmentById = new Map<string, ReviewObligationAssessment>();
  for (const event of events) {
    const { eventDigest, ...unsigned } = event;
    if (event.previousEventDigest !== previous || reviewEventDigest(unsigned) !== eventDigest) {
      throw new Error(`Invalid Review event chain at ${event.eventId}.`);
    }
    previous = event.eventDigest;
    const payload = event.payload;
    if (payload.kind === 'session-started') {
      if (session) throw new Error('Review session-started may appear only once.');
      session = {
        ...payload.seed,
        obligationContractVersion: payload.seed.obligationContractVersion ?? 'legacy-unavailable',
        requiredObligations: payload.seed.requiredObligations ?? [],
        status: 'active',
        eventHeadDigest: event.eventDigest,
        eventCount: 1,
        viewedSourceDigests: [],
        renderedSourceDigests: [],
        replayedScenarioCaseIds: [],
        authorizedTranches: [],
        attempts: [],
        findings: [],
        obligationAssessments: [],
        artifacts: [],
      };
      if (session.obligationContractVersion === 1 && session.requiredObligations.length === 0) {
        throw new Error('Review obligation contract v1 must contain required obligations.');
      }
      if (new Set(session.requiredObligations.map((item) => item.obligationId)).size !== session.requiredObligations.length) {
        throw new Error('Review required obligation IDs must be unique.');
      }
      if (expected?.generationId !== undefined && session.generationId !== expected.generationId) {
        throw new Error('Review generation does not match the active Workspace generation.');
      }
      if (expected?.targetRevision !== undefined && session.targetRevision !== expected.targetRevision) {
        throw new Error('Review target revision does not match the active Target revision.');
      }
      continue;
    }
    if (!session) throw new Error('Review session is not initialized.');
    if (['completed', 'invalidated'].includes(session.status)) throw new Error(`Review ${session.reviewRunId} is terminal.`);
    if (payload.kind === 'tranche-authorized') {
      if (!['operator', 'human', 'pbwork', 'cli', 'mcp-host-approval'].includes(event.actor)) throw new Error('Agent/tool cannot self-authorize a Review tranche.');
      if (session.authorizedTranches.some((item) => item.screenId === payload.screenId && item.tranche === payload.tranche)) throw new Error('Review tranche authorization is duplicated.');
      session.authorizedTranches.push(payload);
      session.status = 'active';
      delete session.stopReason;
    } else if (payload.kind === 'screenshot-viewed') {
      if (event.actor !== 'mcp' || !event.tool) throw new Error('Screenshot viewed facts require a successful MCP tool receipt.');
      if (payload.source.kind !== 'source' || !session.requiredSourceDigests.includes(payload.source.digest)) throw new Error('Screenshot receipt is not bound to this Review.');
      session.viewedSourceDigests.push(payload.source.digest);
      session.artifacts.push(payload.source);
    } else if (payload.kind === 'target-rendered') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Target render facts require a successful runner receipt.');
      if (payload.targetRevision !== session.targetRevision) throw new Error('Target revision drifted during Review.');
      if (!session.authorizedTranches.some((item) => item.screenId === payload.screenId && item.tranche === payload.tranche)) throw new Error('Target render requires an authorized Screen tranche.');
      if (payload.round < 1 || payload.round > 3) throw new Error('Review tranche round must be 1..3.');
      if (!session.selectedCaseIds.includes(payload.caseId) || !session.requiredSourceDigests.includes(payload.sourceDigest)) throw new Error('Target render is outside the fixed Review selection.');
      if (session.attempts.some((item) => item.attemptId === payload.attemptId)) throw new Error('Review attempt ID is immutable.');
      const priorRounds = session.attempts
        .filter((item) => item.screenId === payload.screenId && item.tranche === payload.tranche)
        .map((item) => item.round);
      if (priorRounds.includes(payload.round) || payload.round !== (priorRounds.length === 0 ? 1 : Math.max(...priorRounds) + 1)) {
        throw new Error('Review tranche rounds must advance exactly once from 1 through 3.');
      }
      session.attempts.push({
        attemptId: payload.attemptId,
        screenId: payload.screenId,
        caseId: payload.caseId,
        sourceDigest: payload.sourceDigest,
        tranche: payload.tranche,
        round: payload.round,
        targetRevision: payload.targetRevision,
        targetDigest: payload.target.digest,
      });
      session.renderedSourceDigests.push(payload.sourceDigest);
      session.artifacts.push(payload.target);
    } else if (payload.kind === 'scenario-replayed') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Scenario replay facts require a successful runner receipt.');
      if (payload.targetRevision !== session.targetRevision || !session.requiredScenarioCaseIds.includes(payload.caseId)) throw new Error('Scenario receipt is outside the fixed Review target revision/selection.');
      session.replayedScenarioCaseIds.push(payload.caseId);
    } else if (payload.kind === 'artifacts-compared') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Compare facts require a successful comparator receipt.');
      const attempt = session.attempts.find((item) => item.attemptId === payload.attemptId);
      if (!attempt || attempt.sourceDigest !== payload.sourceDigest || attempt.targetDigest !== payload.targetDigest) throw new Error('Compare receipt does not match its Review attempt.');
      attempt.diffDigest = payload.diff.digest;
      if (payload.normalizedDiffSignature !== undefined) attempt.normalizedDiffSignature = payload.normalizedDiffSignature;
      attempt.comparable = payload.comparable;
      session.artifacts.push(payload.diff, ...(payload.overlay ? [payload.overlay] : []));
      if (!payload.comparable) {
        session.status = 'unverified';
        session.stopReason = payload.reason ?? 'artifacts-not-comparable';
      } else {
        const comparable = session.attempts.filter((item) => item.screenId === payload.screenId && item.comparable);
        if (comparable.length >= 2 && comparable.at(-1)?.normalizedDiffSignature === comparable.at(-2)?.normalizedDiffSignature) {
          session.status = 'needs-human';
          session.stopReason = 'repeated-normalized-diff';
        }
      }
    } else if (payload.kind === 'obligations-assessed') {
      const requiredIds = new Set(session.requiredObligations.map((item) => item.obligationId));
      for (const assessment of payload.assessments) {
        if (!requiredIds.has(assessment.obligationId)) throw new Error(`Unknown Review obligation ${assessment.obligationId}.`);
        if (!['matched', 'deviation', 'unverified', 'not-applicable'].includes(assessment.status)) throw new Error('Unknown Review obligation assessment status.');
        if (typeof assessment.detail !== 'string' || !assessment.detail.trim()) throw new Error('Review obligation assessment requires detail.');
        if (!Array.isArray(assessment.evidenceDigests) || assessment.evidenceDigests.some((item) => typeof item !== 'string')) throw new Error('Review obligation assessment evidenceDigests must be strings.');
        if (assessment.status === 'not-applicable' && (!['operator', 'human'].includes(event.actor) || !assessment.targetBasis?.trim())) {
          throw new Error('Not-applicable obligation requires operator/human authority and target basis.');
        }
        assessmentById.set(assessment.obligationId, assessment);
      }
      session.obligationAssessments = [...assessmentById.values()].sort((a, b) => a.obligationId.localeCompare(b.obligationId));
    } else if (payload.kind === 'findings-recorded') {
      for (const finding of payload.findings) {
        if (finding.severity === 'Accepted' && (!['operator', 'human'].includes(event.actor) || !finding.humanConfirmed || !finding.targetBasis)) throw new Error('Accepted deviation requires human confirmation and target basis.');
        findingById.set(finding.findingId, finding);
      }
      session.findings = [...findingById.values()].sort((a, b) => a.findingId.localeCompare(b.findingId));
      const openBlocking = session.findings.filter((item) => ['Critical', 'Major'].includes(item.severity) && item.status === 'open');
      if (openBlocking.length === 0 && session.status === 'active') session.status = 'awaiting-human-review';
      const lastAttempt = session.attempts.at(-1);
      if (openBlocking.length > 0 && lastAttempt?.round === 3) {
        session.status = 'needs-human';
        session.stopReason = 'tranche-round-limit';
      }
    } else if (payload.kind === 'human-finalized') {
      if (!['operator', 'human'].includes(event.actor) || !payload.confirmationRef) throw new Error('Review completion requires a human confirmation event.');
      assertCompletionGates(session);
      session.status = 'completed';
      session.completedAt = event.at;
    } else if (payload.kind === 'invalidated') {
      session.status = 'invalidated';
      session.stopReason = payload.reason;
    }
    session.eventHeadDigest = event.eventDigest;
    session.eventCount += 1;
  }
  return normalizeSession(session!);
}

function assertCompletionGates(session: ReviewSession): void {
  const missingViewed = session.requiredSourceDigests.filter((item) => !session.viewedSourceDigests.includes(item));
  const missingRendered = session.requiredSourceDigests.filter((item) => !session.renderedSourceDigests.includes(item));
  const missingScenarios = session.requiredScenarioCaseIds.filter((item) => !session.replayedScenarioCaseIds.includes(item));
  const openBlocking = session.findings.filter((item) => ['Critical', 'Major'].includes(item.severity) && item.status === 'open');
  const unverified = session.findings.filter((item) => item.severity === 'Unverified' || item.status === 'unverified');
  const assessedById = new Map(session.obligationAssessments.map((item) => [item.obligationId, item]));
  const missingObligations = session.requiredObligations.filter((item) => !assessedById.has(item.obligationId)).map((item) => item.obligationId);
  const unverifiedObligations = session.obligationAssessments.filter((item) => item.status === 'unverified').map((item) => item.obligationId);
  const deviatingObligations = session.obligationAssessments.filter((item) => item.status === 'deviation').map((item) => item.obligationId);
  const legacyObligationContractMissing = session.obligationContractVersion !== 1;
  if (missingViewed.length || missingRendered.length || missingScenarios.length || openBlocking.length || unverified.length || missingObligations.length || unverifiedObligations.length || deviatingObligations.length || legacyObligationContractMissing || session.status === 'unverified') {
    throw new Error(`Review completion gates failed: ${JSON.stringify({ missingViewed, missingRendered, missingScenarios, openBlocking: openBlocking.map((item) => item.findingId), unverified: unverified.map((item) => item.findingId), missingObligations, unverifiedObligations, deviatingObligations, legacyObligationContractMissing })}`);
  }
}

function normalizeSession(session: ReviewSession): ReviewSession {
  session.viewedSourceDigests = [...new Set(session.viewedSourceDigests)].sort();
  session.renderedSourceDigests = [...new Set(session.renderedSourceDigests)].sort();
  session.replayedScenarioCaseIds = [...new Set(session.replayedScenarioCaseIds)].sort();
  session.authorizedTranches.sort((a, b) => a.screenId.localeCompare(b.screenId) || a.tranche - b.tranche);
  return session;
}
