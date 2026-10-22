import { describe, expect, it } from 'vitest';
import {
  buildEvidenceReadModel,
  buildReconstructionAcceptanceContract,
  buildHandoffIndex,
  buildScreenPacket,
  computeCaseId,
  computeScopeKey,
  fixtures,
  normalizeCaptureScope,
  projectCaptureCoverage,
  type BlobRecord,
  type CapturePlan,
  type EvidenceCaseReadModel,
} from '../../src/v2/index.js';
import { buildAcceptanceContractFromStore } from '../../src/v2/store/acceptance.js';
import type { V2Store } from '../../src/v2/store/types.js';
import { buildNextSnapshot } from '../../src/v2/store/snapshot-builder.js';

function coverageFixture() {
  const reference = fixtures.referenceCaseSlice;
  const base = reference.RUN_1.selection.cases[0]!;
  const waterKey = { ...base.caseKey, theme: 'water', themeId: 'light' };
  const darkKey = { ...base.caseKey, theme: 'water', themeId: 'dark' };
  const representative = { ...base, caseKey: waterKey, caseId: computeCaseId(waterKey) };
  const omitted = { ...base, caseKey: darkKey, caseId: computeCaseId(darkKey) };
  const plan: CapturePlan = {
    version: 1, purpose: 'implementation-delivery', inputVersion: 'input-current', sourceDigest: 'source-current',
    baseline: { theme: 'default', mode: 'light' }, fullCaseCount: 3,
    businessCases: [base], observations: [{ selectedCase: base, reason: 'baseline' }, { selectedCase: representative, reason: 'representative' }],
    rules: [{ ruleKey: 'paint-only-dark', ruleScreenId: base.caseKey.screenId, ruleId: 'paint-only-dark',
      rationale: 'Same declared usage; dark paint resolves from fixed theme table.',
      dimensions: ['structure', 'components', 'bindings', 'resources', 'layout'],
      representatives: [{ caseId: representative.caseId, scopeKey: computeScopeKey(representative.captureScope) }] }],
    derivations: [{ selectedCase: omitted, baseline: { caseId: base.caseId, scopeKey: computeScopeKey(base.captureScope) },
      ruleKey: 'paint-only-dark', pixels: 'unobserved' }],
  };
  const evidence = buildEvidenceReadModel({ snapshot: reference.SNAPSHOT, runs: [reference.RUN_1, reference.RUN_2],
    revisions: [reference.PRIMARY_ACTIVE_REVISION, reference.FRAGMENT_SCOPED_ACTIVE_REVISION], blobs: [] });
  const template = evidence.screens[0]!.cases[0]!;
  const cases: EvidenceCaseReadModel[] = [base, representative].map((selected, index) => ({
    ...template, ...selected.caseKey, caseId: selected.caseId, scopeKey: computeScopeKey(selected.captureScope),
    revisionId: `fixed-revision-${index}`, screenshotBlobIds: [`shot-${index}`], semanticCoverage: 'declared', unknownCount: 0, conflictCount: 0,
    capturePlanSource: { runId: 'run-current', inputVersion: plan.inputVersion, scopeKeys: [computeScopeKey(selected.captureScope)] },
  }));
  return { plan, cases, base, representative, evidence };
}

function coveringReuseFixture(result: 'reused' | 'failed' = 'reused', sourceKind: 'primary' | 'covering' = 'primary') {
  const reference = fixtures.referenceCaseSlice;
  const run = structuredClone(reference.RUN_2);
  const selected = run.selection.cases[0]!;
  const plan: CapturePlan = {
    version: 1, purpose: 'implementation-delivery', inputVersion: 'input-current',
    baseline: { theme: run.selection.themePack.theme, mode: run.selection.themePack.mode }, fullCaseCount: 1,
    businessCases: [selected], observations: [{ selectedCase: selected, reason: 'baseline' }], rules: [], derivations: [],
  };
  run.selection.capturePlan = plan;
  run.inputVersion = plan.inputVersion;
  const { revisionId: _revisionId, ...attempt } = run.attempts[0]!;
  run.attempts = [result === 'reused'
    ? { ...attempt, result, revisionId: reference.PRIMARY_REVISION_ID }
    : { ...attempt, result, reason: 'narrow retry failed' }];
  run.coverage.counts = { ...run.coverage.counts, captured: 0, reused: result === 'reused' ? 1 : 0, failed: result === 'failed' ? 1 : 0 };
  const captureScope = sourceKind === 'primary' ? reference.FULL_CASE_SCOPE : normalizeCaptureScope({
    ...reference.FULL_CASE_SCOPE, fragments: [reference.TASK_LIST_LIST_FRAGMENT, reference.TASK_LIST_ROOT_FRAGMENT],
  });
  const revision = { ...reference.PRIMARY_ACTIVE_REVISION, captureScope, scopeKey: computeScopeKey(captureScope),
    dependencyDigests: [{ dependencyId: `runtime:${selected.caseKey.screenId}`, digest: plan.inputVersion }] };
  const previousSnapshot = { ...reference.SNAPSHOT, sourceRunId: reference.RUN_1.runId,
    activeSlots: [{ caseId: revision.caseId, kind: sourceKind === 'primary' ? 'primary' as const : 'scoped' as const,
      scopeKey: revision.scopeKey, revisionId: revision.revisionId }], latestAttempts: reference.SNAPSHOT.latestAttempts.slice(0, 1) };
  const snapshot = buildNextSnapshot({ previousSnapshot, run, revisionsById: new Map([[revision.revisionId, revision]]),
    snapshotId: 'snapshot-covering-reuse', committedAt: run.endedAt, coverage: run.coverage });
  const blobs: BlobRecord[] = [{ schemaVersion: 2, blobId: 'screenshot-covering', workspaceId: snapshot.workspaceId,
    bundleId: snapshot.bundleId, kind: 'screenshot', mediaType: 'image/png', byteLength: 1, digest: `sha256:${'a'.repeat(64)}`,
    createdAt: run.endedAt, ownerRefs: [{ kind: 'revision', objectId: revision.revisionId }] }];
  const input = { snapshot, runs: [reference.RUN_1, run], revisions: [revision], blobs };
  const handoff = { ...reference.HANDOFF, snapshotId: snapshot.snapshotId,
    selectedCases: [{ ...reference.HANDOFF.selectedCases[0]!, ...selected, scopeKey: computeScopeKey(selected.captureScope),
      resolution: 'resolved' as const, revisionId: revision.revisionId, relevantAttemptId: run.attempts[0]!.attemptId }] };
  const store = { getSnapshot: async () => snapshot, listRuns: async () => input.runs,
    listEvidenceRevisions: async () => input.revisions, listBlobRecords: async () => blobs } as unknown as V2Store;
  return { input, handoff, store, plan, run, revision };
}

describe('Capture coverage provenance', () => {
  it('separates complete business and planned observations from unobserved rule-derived pixels', () => {
    const { plan, cases } = coverageFixture();
    const result = projectCaptureCoverage(plan, cases);
    expect(result.business).toMatchObject({ expectedCaseCount: 1, observedCaseCount: 1, status: 'complete' });
    expect(result.screenshots).toEqual({ plannedCaseCount: 2, observedCaseCount: 2, missingCaseCount: 0, unobservedAppearanceCount: 1, status: 'complete' });
    expect(result.themeRules).toMatchObject({ supportedDerivationCount: 1, uncheckedDerivationCount: 0 });
    expect(result.derivations[0]).toMatchObject({ status: 'rule-derived', businessSource: 'reference-reuse', pixels: 'unobserved', baseline: { revisionId: 'fixed-revision-0' }, representatives: [{ revisionId: 'fixed-revision-1' }] });
    expect(cases).toHaveLength(2);
  });

  it('does not borrow a representative outside the fixed selection, wrong Scope or changed inputs', () => {
    const { plan, cases, base } = coverageFixture();
    const narrowed = projectCaptureCoverage(plan, cases.slice(0, 1), [base]);
    expect(narrowed.business.status).toBe('complete');
    expect(narrowed.themeRules.status).toBe('partial');
    expect(narrowed.derivations[0]?.missingSourceCaseIds).toEqual([plan.rules[0]!.representatives[0]!.caseId]);
    const changed = cases.map((item, index) => index ? { ...item, capturePlanSource: { runId: 'old', inputVersion: 'old', scopeKeys: [item.scopeKey!] } } : item);
    expect(projectCaptureCoverage(plan, changed).themeRules.supportedDerivationCount).toBe(0);
    const wrongScope = cases.map((item, index) => index ? { ...item, scopeKey: 'another-scope',
      capturePlanSource: { ...item.capturePlanSource!, scopeKeys: ['another-scope'] } } : item);
    expect(projectCaptureCoverage(plan, wrongScope).themeRules.supportedDerivationCount).toBe(0);
  });

  it('keeps unknown, incomplete and screenshot-less sources unchecked and blocks Acceptance readiness', () => {
    const { plan, cases, evidence } = coverageFixture();
    for (const replacement of [{ unknownCount: 1 }, { semanticCoverage: 'incomplete' as const }, { screenshotBlobIds: [] }]) {
      const changed = cases.map((item, index) => index ? { ...item, ...replacement } : item);
      const coverage = projectCaptureCoverage(plan, changed);
      expect(coverage.derivations[0]?.status).toBe('unchecked');
      const acceptance = buildReconstructionAcceptanceContract({ handoffId: 'handoff-sample', workspaceId: 'workspace-sample',
        evidence: { ...evidence, capturePlan: plan, captureCoverage: coverage, screens: [] } });
      expect(acceptance.readiness.blockers).toContain('1 appearance rules lack reliable fixed sources.');
    }
  });

  it('recomputes fixed Handoff and Screen coverage instead of borrowing full Snapshot sources', () => {
    const { plan, cases, base, representative, evidence } = coverageFixture();
    const ref = fixtures.referenceCaseSlice.HANDOFF.selectedCases[0]!;
    const handoff = { ...fixtures.referenceCaseSlice.HANDOFF,
      selectedCases: [base, representative].map((selected, index) => ({ ...ref, ...selected,
        scopeKey: computeScopeKey(selected.captureScope), resolution: 'resolved' as const,
        revisionId: cases[index]!.revisionId, relevantAttemptId: `attempt-current-${index}` })),
    };
    const fixedEvidence = { ...evidence, capturePlan: plan, captureCoverage: projectCaptureCoverage(plan, cases), screens: [{ screenId: base.caseKey.screenId, cases }] };
    const input = { handoff, evidence: fixedEvidence, acceptance: buildReconstructionAcceptanceContract({ handoffId: handoff.handoffId, workspaceId: handoff.workspaceId, evidence: fixedEvidence }), blobs: [] };
    expect(buildHandoffIndex(input).captureCoverage?.themeRules.status).toBe('complete');
    const fullPacket = buildScreenPacket(input, base.caseKey.screenId).appearanceEvidence!;
    const representativeSet = fullPacket.referenceSets.find((item) => item.referenceSetId === fullPacket.derivations[0]!.representativeSetId)!;
    expect(representativeSet.sourceIds.map((sourceId) => fullPacket.sources.find((source) => source.sourceId === sourceId)?.revisionId)).toEqual(['fixed-revision-1']);
    handoff.selectedCases.pop();
    expect(buildHandoffIndex(input).captureCoverage?.themeRules.status).toBe('partial');
    const packet = buildScreenPacket(input, base.caseKey.screenId);
    expect(packet.appearanceEvidence?.derivations[0]?.status).toBe('unchecked');
    const appearance = packet.appearanceEvidence!;
    expect(appearance.referenceSets.find((item) => item.referenceSetId === appearance.derivations[0]!.representativeSetId)?.sourceIds).toEqual([]);
    expect(appearance.sources.map((source) => source.revisionId)).toEqual(['fixed-revision-0']);
    expect(appearance.derivations[0]?.missingSourceCaseIds).toEqual([representative.caseId]);
    expect(packet.cases).toHaveLength(1);
  });

  it('shares rule declarations and fixed reference sets across distinct unobserved appearances', () => {
    const { plan, cases, base, representative, evidence } = coverageFixture();
    const anotherKey = { ...plan.derivations[0]!.selectedCase.caseKey, theme: 'sun' };
    const another = { ...plan.derivations[0]!, selectedCase: { ...base, caseKey: anotherKey, caseId: computeCaseId(anotherKey) } };
    plan.derivations.push(another);
    plan.fullCaseCount++;
    const ref = fixtures.referenceCaseSlice.HANDOFF.selectedCases[0]!;
    const handoff = { ...fixtures.referenceCaseSlice.HANDOFF,
      selectedCases: [base, representative].map((selected, index) => ({ ...ref, ...selected,
        scopeKey: computeScopeKey(selected.captureScope), resolution: 'resolved' as const,
        revisionId: cases[index]!.revisionId, relevantAttemptId: `attempt-current-${index}` })),
    };
    const coverage = projectCaptureCoverage(plan, cases);
    const fixedEvidence = { ...evidence, capturePlan: plan, captureCoverage: coverage, screens: [{ screenId: base.caseKey.screenId, cases }] };
    const input = { handoff, evidence: fixedEvidence, acceptance: buildReconstructionAcceptanceContract({ handoffId: handoff.handoffId, workspaceId: handoff.workspaceId, evidence: fixedEvidence }), blobs: [] };
    const appearance = buildScreenPacket(input, base.caseKey.screenId).appearanceEvidence!;
    expect(appearance.rules).toEqual([{ ruleKey: 'paint-only-dark', ruleScreenId: base.caseKey.screenId,
      ruleId: 'paint-only-dark', rationale: plan.rules[0]!.rationale, dimensions: plan.rules[0]!.dimensions }]);
    expect(appearance.sources).toHaveLength(2);
    expect(appearance.referenceSets).toHaveLength(1);
    expect(new Set(appearance.derivations.map((item) => item.representativeSetId)).size).toBe(1);
    expect(appearance.derivations.map((item) => item.caseId)).toEqual(plan.derivations.map((item) => item.selectedCase.caseId));
    expect(appearance.derivations).toEqual(expect.arrayContaining([
      expect.objectContaining({ theme: 'water', status: 'rule-derived', pixels: 'unobserved' }),
      expect.objectContaining({ theme: 'sun', status: 'rule-derived', pixels: 'unobserved' }),
    ]));
    for (const item of appearance.derivations) {
      expect(appearance.sources.find((source) => source.sourceId === item.baselineSourceId)?.revisionId).toBe('fixed-revision-0');
      expect(item).not.toHaveProperty('rationale');
      expect(item).not.toHaveProperty('representatives');
    }
  });

  it('keeps a fixed covering revision readable without inventing plan coverage for an unplanned Scope', () => {
    const { plan, cases, base, evidence } = coverageFixture();
    const reference = fixtures.referenceCaseSlice;
    const captureScope = reference.LIST_FRAGMENT_SCOPE;
    const handoff = { ...reference.HANDOFF, selectedCases: [{ ...reference.HANDOFF.selectedCases[0]!, ...base,
      captureScope, scopeKey: computeScopeKey(captureScope), resolution: 'resolved' as const,
      revisionId: cases[0]!.revisionId, relevantAttemptId: 'attempt-covering' }] };
    const fixedEvidence = { ...evidence, capturePlan: plan, captureCoverage: projectCaptureCoverage(plan, cases), screens: [{ screenId: base.caseKey.screenId, cases }] };
    const input = { handoff, evidence: fixedEvidence, acceptance: buildReconstructionAcceptanceContract({ handoffId: handoff.handoffId, workspaceId: handoff.workspaceId, evidence: fixedEvidence }), blobs: [] };
    expect(buildHandoffIndex(input).screens[0]?.caseIds).toEqual([base.caseId]);
    expect(buildHandoffIndex(input).captureCoverage).toBeNull();
    const packet = buildScreenPacket(input, base.caseKey.screenId);
    expect(packet.cases).toHaveLength(1);
    expect(packet.appearanceEvidence).toBeNull();
  });

  it('builds Acceptance from the exact fixed revision when its captured Scope covers the request', async () => {
    const reference = fixtures.referenceCaseSlice;
    const handoff = { ...reference.HANDOFF, selectedCases: [{ ...reference.HANDOFF.selectedCases[0]!,
      captureScope: reference.LIST_FRAGMENT_SCOPE, scopeKey: reference.LIST_FRAGMENT_SCOPE_KEY,
      resolution: 'resolved' as const, revisionId: reference.PRIMARY_REVISION_ID, relevantAttemptId: reference.ATTEMPT_1_ID }] };
    const store = {
      getSnapshot: async () => reference.SNAPSHOT,
      listRuns: async () => [reference.RUN_1, reference.RUN_2],
      listEvidenceRevisions: async () => [reference.PRIMARY_ACTIVE_REVISION, reference.FRAGMENT_SCOPED_ACTIVE_REVISION],
      listBlobRecords: async () => [],
    } as unknown as V2Store;
    const result = await buildAcceptanceContractFromStore({ store, handoff });
    expect(result.evidence.screens.flatMap((screen) => screen.cases).map((item) => item.revisionId)).toEqual([reference.PRIMARY_REVISION_ID]);
  });

  it.each(['primary', 'covering'] as const)('counts a successful current-Scope reuse of a fixed %s revision in Snapshot, Handoff and Acceptance coverage', async (sourceKind) => {
    const { input, handoff, store, run, plan, revision } = coveringReuseFixture('reused', sourceKind);
    expect(input.snapshot.activeSlots).toEqual([{ caseId: revision.caseId, kind: sourceKind === 'primary' ? 'primary' : 'scoped', scopeKey: revision.scopeKey, revisionId: revision.revisionId }]);
    const evidence = buildEvidenceReadModel(input);
    expect(evidence.screens[0]!.cases[0]).toMatchObject({ scopeKey: revision.scopeKey,
      capturePlanSource: { runId: run.runId, inputVersion: plan.inputVersion, scopeKeys: [run.attempts[0]!.scopeKey] } });
    expect(evidence.captureCoverage?.business).toMatchObject({ status: 'complete', observedCaseCount: 1 });
    expect(evidence.captureCoverage?.screenshots).toMatchObject({ status: 'complete', observedCaseCount: 1 });
    const acceptance = await buildAcceptanceContractFromStore({ store, handoff });
    expect(acceptance.contract.captureCoverage?.business.missingCaseCount).toBe(0);
    expect(acceptance.contract.captureCoverage?.screenshots.missingCaseCount).toBe(0);
    const consumerInput = { handoff, evidence, acceptance: acceptance.contract, blobs: input.blobs };
    expect(buildHandoffIndex(consumerInput).captureCoverage?.screenshots.status).toBe('complete');
    expect(buildScreenPacket(consumerInput, run.selection.cases[0]!.caseKey.screenId).appearanceEvidence?.screenshots.status).toBe('complete');
  });

  it.each(['primary', 'covering'] as const)('keeps old %s screenshots readable but cannot use them to complete a failed current-Scope retry', async (sourceKind) => {
    const { input, handoff, store, revision } = coveringReuseFixture('failed', sourceKind);
    const evidence = buildEvidenceReadModel(input);
    expect(evidence.screens[0]!.cases[0]).toMatchObject({ revisionId: revision.revisionId, screenshotBlobIds: ['screenshot-covering'] });
    expect(evidence.screens[0]!.cases[0]!.capturePlanSource).toBeUndefined();
    expect(evidence.captureCoverage?.business).toMatchObject({ status: 'partial', missingCaseCount: 1 });
    expect(evidence.captureCoverage?.screenshots).toMatchObject({ status: 'partial', missingCaseCount: 1 });
    const acceptance = await buildAcceptanceContractFromStore({ store, handoff });
    expect(acceptance.contract.readiness.blockers).toContain('1 planned business states have no successful fixed source.');
    expect(acceptance.contract.readiness.blockers).toContain('1 planned Screenshot observations are missing.');
  });

  it.each(['input', 'revision', 'attempt-ref'] as const)('rejects a covering reuse whose fixed %s binding no longer matches', (kind) => {
    const { input, run, revision } = coveringReuseFixture();
    if (kind === 'input') revision.dependencyDigests[0]!.digest = 'old-input';
    if (kind === 'revision') run.attempts[0]!.revisionId = 'different-revision';
    if (kind === 'attempt-ref') input.snapshot.latestAttempts.find((item) => item.scopeKey === run.attempts[0]!.scopeKey)!.attemptId = 'different-attempt';
    const evidence = buildEvidenceReadModel(input);
    expect(evidence.screens[0]!.cases[0]!.capturePlanSource).toBeUndefined();
    expect(evidence.captureCoverage?.business.observedCaseCount).toBe(0);
    expect(evidence.captureCoverage?.screenshots.observedCaseCount).toBe(0);
  });

  it('does not let a carried-forward revision support a new source Run after a failed attempt', () => {
    const reference = fixtures.referenceCaseSlice;
    const run = structuredClone(reference.RUN_1);
    const { plan } = coverageFixture();
    run.selection.capturePlan = plan;
    run.inputVersion = plan.inputVersion;
    const revision = { ...reference.PRIMARY_ACTIVE_REVISION, dependencyDigests: [{ dependencyId: `runtime:${run.selection.cases[0]!.caseKey.screenId}`, digest: plan.inputVersion }] };
    const snapshot = { ...reference.SNAPSHOT, sourceRunId: run.runId };
    const input = { snapshot, runs: [run, reference.RUN_2], revisions: [revision, reference.FRAGMENT_SCOPED_ACTIVE_REVISION], blobs: [] };
    const read = () => buildEvidenceReadModel(input).screens.flatMap((screen) => screen.cases).find((item) => item.revisionId === revision.revisionId)!;
    expect(read().capturePlanSource).toEqual({ runId: run.runId, inputVersion: plan.inputVersion, scopeKeys: [run.attempts[0]!.scopeKey] });
    const { revisionId: _revisionId, ...attempt } = run.attempts[0]!;
    run.attempts[0] = { ...attempt, result: 'failed', reason: 'new capture failed' };
    expect(read().capturePlanSource).toBeUndefined();
    run.attempts = structuredClone(reference.RUN_1.attempts);
    revision.dependencyDigests[0]!.digest = 'old-input';
    expect(read().capturePlanSource).toBeUndefined();
  });
});
