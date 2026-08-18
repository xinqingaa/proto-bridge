import { createHash } from 'node:crypto';
import type {
  ReviewActor,
  ReviewEvent,
  ReviewEventPayload,
  ReviewFinding,
  ReviewObligationAssessment,
  ReviewRuntimeOperationReceipt,
  ReviewSession,
  ReviewVerifierReceipt,
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

export function reviewVerifierReceiptDigest(
  receipt: Omit<ReviewVerifierReceipt, 'receiptDigest'>,
): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(receipt)).digest('hex')}`;
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
  const receiptByDigest = new Map<string, ReviewVerifierReceipt>();
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
        verificationContractVersion: payload.seed.verificationContractVersion ?? 'legacy-unavailable',
        reviewProfile: payload.seed.reviewProfile ?? {
          contractVersion: 'legacy-unavailable',
          coverageProfile: 'l3-full',
          reasonCodes: ['legacy-full-review'],
          excludedCaseIds: [],
          excludedScenarioCaseIds: [],
        },
        runtimeProvider: payload.seed.runtimeProvider ?? { required: true },
        status: 'active',
        codeReviewStatus: 'pending',
        runtimeReviewStatus: payload.seed.runtimeProvider?.required === false ? 'not-applicable' : 'pending',
        reviewOutcome: 'pending',
        eventHeadDigest: event.eventDigest,
        eventCount: 1,
        viewedSourceDigests: [],
        renderedSourceDigests: [],
        replayedScenarioCaseIds: [],
        authorizedTranches: [],
        attempts: [],
        findings: [],
        obligationAssessments: [],
        verifierReceipts: [],
        providerFailures: [],
        runtimeOperationReceipts: [],
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
    if (['closed', 'completed', 'invalidated'].includes(session.status)) throw new Error(`Review ${session.reviewRunId} is terminal.`);
    if (payload.kind === 'runtime-provider-connected') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Runtime provider connection requires a successful runner receipt.');
      const { receipt } = payload;
      if (
        receipt.receiptVersion !== 1
        || !receipt.providerId.trim()
        || event.tool !== receipt.providerId
        || receipt.application.targetCommit !== session.targetBaselineCommit
        || (session.targetContentDigest !== undefined && receipt.application.targetContentDigest !== session.targetContentDigest)
        || !receipt.application.targetContentDigest.trim()
        || !receipt.application.appBuildDigest.trim()
        || !receipt.application.applicationIdentity.trim()
      ) throw new Error('Runtime provider receipt is incomplete or outside the fixed Target identity.');
      if (session.runtimeProvider.providerId && session.runtimeProvider.providerId !== receipt.providerId) throw new Error('Runtime provider does not match the fixed Review provider.');
      if (session.providerSession && session.providerSession.sessionIdentityDigest !== receipt.sessionIdentityDigest) throw new Error('Runtime provider session identity changed without invalidation.');
      session.providerSession = receipt;
      session.runtimeReviewStatus = 'pending';
      delete session.stopReason;
    } else if (payload.kind === 'runtime-provider-session-invalidated') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Runtime provider session invalidation requires a runner receipt.');
      delete session.providerSession;
      session.runtimeReviewStatus = session.runtimeProvider.required ? 'pending' : 'not-applicable';
      session.stopReason = payload.reason;
    } else if (payload.kind === 'provider-call-failed') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Runtime provider failure requires a runner receipt.');
      const { failure } = payload;
      if (!failure.operationId.trim() || !failure.errorCode.trim() || !failure.detailDigest.trim()) throw new Error('Runtime provider failure receipt is incomplete.');
      const previousFailures = session.providerFailures.filter((item) => item.operationId === failure.operationId);
      const expectedOrdinal = previousFailures.length + 1;
      if (failure.attemptOrdinal !== expectedOrdinal || failure.attemptOrdinal > 3) throw new Error('Runtime provider attempts must advance exactly once from 1 through 3.');
      if (previousFailures.some((item) => !item.retryable)) throw new Error('Runtime provider cannot retry a terminal failure.');
      session.providerFailures.push(failure);
    } else if (payload.kind === 'runtime-provider-terminated') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Runtime provider termination requires a runner receipt.');
      const latest = session.providerFailures.at(-1);
      if (!latest || (latest.retryable && latest.attemptOrdinal < 3)) throw new Error('Runtime provider termination requires a non-retryable failure or the third failed attempt.');
      session.runtimeReviewStatus = payload.runtimeStatus;
      session.status = payload.runtimeStatus === 'needs-human' ? 'needs-human' : 'unverified';
      session.stopReason = payload.reason;
    } else if (payload.kind === 'tranche-authorized') {
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
      if (session.reviewProfile.contractVersion === 1 && session.runtimeProvider.required) {
        assertRuntimeReceipt(session, payload.runtimeReceipt, 'screenshot');
      }
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
        ...(payload.runtimeReceipt ? {
          runtimeOperationId: payload.runtimeReceipt.operationId,
          sessionIdentityDigest: payload.runtimeReceipt.sessionIdentityDigest,
          appBuildDigest: payload.runtimeReceipt.appBuildDigest,
        } : {}),
      });
      if (payload.runtimeReceipt) session.runtimeOperationReceipts.push(payload.runtimeReceipt);
      session.renderedSourceDigests.push(payload.sourceDigest);
      session.artifacts.push(payload.target);
    } else if (payload.kind === 'scenario-replayed') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Scenario replay facts require a successful runner receipt.');
      if (session.reviewProfile.contractVersion === 1 && session.runtimeProvider.required) {
        assertRuntimeReceipt(session, payload.runtimeReceipt, 'scenario');
      }
      if (payload.targetRevision !== session.targetRevision || !session.requiredScenarioCaseIds.includes(payload.caseId)) throw new Error('Scenario receipt is outside the fixed Review target revision/selection.');
      if (payload.transition && (
        payload.transition.caseId !== payload.caseId
        || payload.transition.screenId !== payload.screenId
        || payload.transition.scenarioId !== payload.scenarioId
        || payload.transition.preState.caseId !== payload.caseId
        || payload.transition.postState.caseId !== payload.caseId
      )) throw new Error('Structured Scenario receipt identity does not match its Review event.');
      session.replayedScenarioCaseIds.push(payload.caseId);
      if (payload.runtimeReceipt) session.runtimeOperationReceipts.push(payload.runtimeReceipt);
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
    } else if (payload.kind === 'target-claims-verified') {
      if (event.actor !== 'runner' || !event.tool) throw new Error('Target claim verification requires a successful runner receipt.');
      const { receipt } = payload;
      if (
        receipt.receiptVersion !== 1
        || receipt.targetRevision !== session.targetRevision
        || receipt.targetHead !== session.targetBaselineCommit
        || event.tool !== receipt.verifierId
      ) throw new Error('Target claim receipt is outside the fixed Review target revision/verifier.');
      if (!receipt.verifierId.trim() || !receipt.adapterId.trim() || !receipt.targetContentDigest.trim() || receipt.results.length === 0) throw new Error('Target claim verifier receipt is incomplete.');
      if (session.verifierTargetContentDigest && session.verifierTargetContentDigest !== receipt.targetContentDigest) throw new Error('Target content drifted between claim verifier receipts.');
      if (session.providerSession && session.providerSession.application.targetContentDigest !== receipt.targetContentDigest) throw new Error('Runtime App content does not match the fixed Target verifier content.');
      const { receiptDigest, ...unsignedReceipt } = receipt;
      if (reviewVerifierReceiptDigest(unsignedReceipt) !== receiptDigest) throw new Error('Target claim verifier receipt digest is invalid.');
      if (receiptByDigest.has(receiptDigest)) throw new Error('Target claim verifier receipt is duplicated.');
      const requiredById = new Map(session.requiredObligations.map((item) => [item.obligationId, item]));
      const resultIds = new Set<string>();
      for (const result of receipt.results) {
        const obligation = requiredById.get(result.obligationId);
        if (!obligation || obligation.dimension !== result.dimension) throw new Error(`Unknown or mismatched Review verifier obligation ${result.obligationId}.`);
        if (resultIds.has(result.obligationId)) throw new Error(`Duplicate Review verifier result ${result.obligationId}.`);
        if (!['matched', 'deviation', 'unverified'].includes(result.status) || !result.detail.trim()) throw new Error('Review verifier result is invalid.');
        resultIds.add(result.obligationId);
      }
      receiptByDigest.set(receiptDigest, receipt);
      session.verifierReceipts = [...receiptByDigest.values()];
      session.verifierTargetContentDigest = receipt.targetContentDigest;
      for (const result of receipt.results.filter((item) => item.dimension === 'states' || item.dimension === 'interactions')) {
        assessmentById.set(result.obligationId, {
          obligationId: result.obligationId,
          status: result.status,
          detail: result.detail,
          evidenceDigests: [receiptDigest],
          verifierReceiptDigest: receiptDigest,
        });
      }
      session.obligationAssessments = [...assessmentById.values()].sort((a, b) => a.obligationId.localeCompare(b.obligationId));
    } else if (payload.kind === 'obligations-assessed') {
      const requiredIds = new Set(session.requiredObligations.map((item) => item.obligationId));
      for (const assessment of payload.assessments) {
        if (!requiredIds.has(assessment.obligationId)) throw new Error(`Unknown Review obligation ${assessment.obligationId}.`);
        if (!['matched', 'deviation', 'unverified', 'not-applicable'].includes(assessment.status)) throw new Error('Unknown Review obligation assessment status.');
        if (typeof assessment.detail !== 'string' || !assessment.detail.trim()) throw new Error('Review obligation assessment requires detail.');
        if (!Array.isArray(assessment.evidenceDigests) || assessment.evidenceDigests.some((item) => typeof item !== 'string')) throw new Error('Review obligation assessment evidenceDigests must be strings.');
        if (session.verificationContractVersion === 1 && assessment.status === 'matched') {
          const receipt = assessment.verifierReceiptDigest ? receiptByDigest.get(assessment.verifierReceiptDigest) : undefined;
          const result = receipt?.results.find((item) => item.obligationId === assessment.obligationId);
          if (!receipt || result?.status !== 'matched') throw new Error(`Matched Review obligation ${assessment.obligationId} requires a successful verifier receipt.`);
          if (!assessment.evidenceDigests.includes(receipt.receiptDigest)) throw new Error('Matched Review obligation evidenceDigests must include its verifier receipt.');
        }
        if (assessment.verifierReceiptDigest) {
          const receipt = receiptByDigest.get(assessment.verifierReceiptDigest);
          const result = receipt?.results.find((item) => item.obligationId === assessment.obligationId);
          if (!receipt || !result || (assessment.status !== 'not-applicable' && result.status !== assessment.status)) throw new Error(`Review obligation ${assessment.obligationId} does not match its verifier receipt.`);
        }
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
      refreshReviewTrackStatus(session);
      assertCompletionGates(session);
      if (session.reviewProfile.coverageProfile === 'l3-full') {
        if (payload.decision !== 'complete') throw new Error('L3 Full Review requires a complete decision.');
        session.status = 'completed';
        session.reviewOutcome = 'fully-audited';
      } else {
        if (payload.decision !== 'accept') throw new Error('L1/L2 Review can be accepted but cannot be marked completed.');
        session.status = 'closed';
        session.reviewOutcome = session.reviewProfile.coverageProfile === 'l1-quick' ? 'quick-checked' : 'focused-accepted';
      }
      session.completedAt = event.at;
    } else if (payload.kind === 'invalidated') {
      session.status = 'invalidated';
      session.reviewOutcome = 'invalidated';
      session.stopReason = payload.reason;
    }
    refreshReviewTrackStatus(session);
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
  const legacyVerificationContractMissing = session.verificationContractVersion !== 1;
  const runtimeNotVerified = session.runtimeProvider.required && session.reviewProfile.contractVersion === 1 && session.runtimeReviewStatus !== 'verified';
  if (missingViewed.length || missingRendered.length || missingScenarios.length || openBlocking.length || unverified.length || missingObligations.length || unverifiedObligations.length || deviatingObligations.length || legacyObligationContractMissing || legacyVerificationContractMissing || runtimeNotVerified || session.status === 'unverified') {
    throw new Error(`Review completion gates failed: ${JSON.stringify({ missingViewed, missingRendered, missingScenarios, openBlocking: openBlocking.map((item) => item.findingId), unverified: unverified.map((item) => item.findingId), missingObligations, unverifiedObligations, deviatingObligations, legacyObligationContractMissing, legacyVerificationContractMissing, runtimeNotVerified })}`);
  }
}

function assertRuntimeReceipt(
  session: ReviewSession,
  receipt: ReviewRuntimeOperationReceipt | undefined,
  expectedOperation: 'screenshot' | 'scenario',
): asserts receipt is ReviewRuntimeOperationReceipt {
  const provider = session.providerSession;
  if (!provider || !receipt) throw new Error('Runtime operation requires a connected provider session receipt.');
  if (
    receipt.receiptVersion !== 1
    || receipt.operation !== expectedOperation
    || receipt.providerId !== provider.providerId
    || receipt.providerFingerprint !== provider.providerFingerprint
    || receipt.sessionIdentityDigest !== provider.sessionIdentityDigest
    || receipt.applicationIdentity !== provider.application.applicationIdentity
    || receipt.appBuildDigest !== provider.application.appBuildDigest
    || receipt.targetCommit !== session.targetBaselineCommit
    || receipt.targetContentDigest !== provider.application.targetContentDigest
    || receipt.attemptOrdinal < 1
    || receipt.attemptOrdinal > 3
  ) throw new Error('Runtime operation receipt is outside the fixed provider/App/Target session.');
  if (session.runtimeOperationReceipts.some((item) => item.operationId === receipt.operationId)) throw new Error('Runtime operation receipt is duplicated.');
}

function refreshReviewTrackStatus(session: ReviewSession): void {
  const statuses = session.obligationAssessments.map((item) => item.status);
  if (statuses.includes('deviation')) session.codeReviewStatus = 'deviation';
  else if (statuses.includes('unverified')) session.codeReviewStatus = 'unverified';
  else if (session.requiredObligations.length > 0 && session.requiredObligations.every((item) => session.obligationAssessments.some((assessment) => assessment.obligationId === item.obligationId))) session.codeReviewStatus = 'reviewed';
  else session.codeReviewStatus = 'pending';

  if (!session.runtimeProvider.required) {
    session.runtimeReviewStatus = 'not-applicable';
  } else if (!['unavailable', 'unverified', 'needs-human'].includes(session.runtimeReviewStatus)) {
    const rendered = session.requiredSourceDigests.every((item) => session.renderedSourceDigests.includes(item));
    const replayed = session.requiredScenarioCaseIds.every((item) => session.replayedScenarioCaseIds.includes(item));
    const providerReady = session.reviewProfile.contractVersion === 'legacy-unavailable' || session.providerSession !== undefined;
    session.runtimeReviewStatus = rendered && replayed && providerReady ? 'verified' : 'pending';
  }

  if (session.status === 'invalidated') session.reviewOutcome = 'invalidated';
  else if (session.status === 'completed') session.reviewOutcome = 'fully-audited';
  else if (session.status === 'closed') session.reviewOutcome = session.reviewProfile.coverageProfile === 'l1-quick' ? 'quick-checked' : 'focused-accepted';
  else if (session.runtimeReviewStatus === 'needs-human' || (session.reviewProfile.coverageProfile === 'l1-quick' && session.codeReviewStatus === 'deviation')) session.reviewOutcome = 'needs-focused-review';
  else if (session.runtimeReviewStatus === 'unavailable' || session.runtimeReviewStatus === 'unverified') session.reviewOutcome = 'runtime-unverified';
  else if (session.codeReviewStatus === 'reviewed') session.reviewOutcome = 'code-reviewed';
  else session.reviewOutcome = 'pending';
}

function normalizeSession(session: ReviewSession): ReviewSession {
  session.viewedSourceDigests = [...new Set(session.viewedSourceDigests)].sort();
  session.renderedSourceDigests = [...new Set(session.renderedSourceDigests)].sort();
  session.replayedScenarioCaseIds = [...new Set(session.replayedScenarioCaseIds)].sort();
  session.providerFailures.sort((a, b) => a.operationId.localeCompare(b.operationId) || a.attemptOrdinal - b.attemptOrdinal);
  session.authorizedTranches.sort((a, b) => a.screenId.localeCompare(b.screenId) || a.tranche - b.tranche);
  return session;
}
