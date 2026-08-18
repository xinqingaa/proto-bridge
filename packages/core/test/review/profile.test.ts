import { describe, expect, it } from 'vitest';
import { selectReviewProfile, type ReviewCaseCandidate } from '../../src/review/index.js';

const cases: ReviewCaseCandidate[] = [
  { caseId: 'screen-a::default', screenId: 'screen-a', scenarioCase: false, tags: ['baseline'] },
  { caseId: 'screen-a::dark', screenId: 'screen-a', scenarioCase: false, tags: ['theme'] },
  { caseId: 'screen-a::input', screenId: 'screen-a', scenarioCase: true, tags: ['input', 'key-state'] },
  { caseId: 'screen-b::default', screenId: 'screen-b', scenarioCase: false, tags: ['baseline'] },
  { caseId: 'screen-b::overlay', screenId: 'screen-b', scenarioCase: true, tags: ['overlay'] },
  { caseId: 'screen-b::narrow', screenId: 'screen-b', scenarioCase: false, tags: ['narrow'] },
];

const obligations = cases.map((item) => ({
  obligationId: `obligation-${item.caseId}`,
  dimension: 'structure' as const,
  screenId: item.screenId,
  caseIds: [item.caseId],
  kind: 'topology',
  subject: 'content',
  expected: { visible: true },
  evidenceRefs: [`fact-${item.caseId}`],
}));

describe('risk-selected Review Profile', () => {
  it('selects a baseline and at most one risk Case per Screen for L1', () => {
    const selected = selectReviewProfile({ riskSignals: [], cases, obligations });
    expect(selected.profile.coverageProfile).toBe('l1-quick');
    expect(selected.selectedCaseIds).toEqual([
      'screen-a::default',
      'screen-a::input',
      'screen-b::default',
      'screen-b::overlay',
    ]);
    expect(selected.selectedObligations.map((item) => item.caseIds[0])).toEqual(selected.selectedCaseIds);
  });

  it('raises shared and interaction risk to L2 and bounds selection to five Cases', () => {
    const selected = selectReviewProfile({ riskSignals: ['shared-design-system', 'keyboard'], cases, obligations });
    expect(selected.profile.coverageProfile).toBe('l2-focused');
    expect(selected.selectedCaseIds).toHaveLength(5);
    expect(selected.selectedScenarioCaseIds).toContain('screen-a::input');
  });

  it('selects every Case for L3 and never lets a lower request reduce inferred risk', () => {
    const selected = selectReviewProfile({ requestedProfile: 'l1-quick', riskSignals: ['release-acceptance'], cases, obligations });
    expect(selected.profile.coverageProfile).toBe('l3-full');
    expect(selected.selectedCaseIds).toEqual(cases.map((item) => item.caseId).sort());
    expect(selected.profile.excludedCaseIds).toEqual([]);
  });
});
