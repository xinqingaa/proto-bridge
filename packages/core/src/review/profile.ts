import type { ReconstructionObligation } from './obligations.js';
import type { ReviewCoverageProfile, ReviewProfile } from './contracts.js';

export type ReviewRiskSignal =
  | 'user-requested-full'
  | 'final-batch'
  | 'release-acceptance'
  | 'shared-design-system'
  | 'theme'
  | 'navigation'
  | 'core-journey'
  | 'multi-screen'
  | 'input'
  | 'keyboard'
  | 'overlay'
  | 'scroll'
  | 'state-transition'
  | 'runtime-error'
  | 'visual-diff'
  | 'clipping'
  | 'occlusion'
  | 'uncertain-observation'
  | 'repeated-provider-failure';

export type ReviewCaseCandidate = {
  caseId: string;
  screenId: string;
  scenarioCase: boolean;
  tags: Array<'baseline' | 'theme' | 'narrow' | 'overlay' | 'key-state' | 'input' | 'scroll' | 'core-journey'>;
};

export type SelectReviewProfileInput = {
  requestedProfile?: ReviewCoverageProfile;
  riskSignals: ReviewRiskSignal[];
  cases: ReviewCaseCandidate[];
  obligations: ReconstructionObligation[];
};

export type SelectedReviewProfile = {
  profile: ReviewProfile;
  selectedCaseIds: string[];
  selectedScenarioCaseIds: string[];
  selectedObligations: ReconstructionObligation[];
};

const PROFILE_RANK: Record<ReviewCoverageProfile, number> = {
  'l1-quick': 1,
  'l2-focused': 2,
  'l3-full': 3,
};

const FULL_SIGNALS = new Set<ReviewRiskSignal>(['user-requested-full', 'final-batch', 'release-acceptance']);
const FOCUSED_SIGNALS = new Set<ReviewRiskSignal>([
  'shared-design-system', 'theme', 'navigation', 'core-journey', 'multi-screen', 'input', 'keyboard',
  'overlay', 'scroll', 'state-transition', 'runtime-error', 'visual-diff', 'clipping', 'occlusion',
  'uncertain-observation', 'repeated-provider-failure',
]);
const TAG_SCORE: Record<ReviewCaseCandidate['tags'][number], number> = {
  baseline: 100,
  'core-journey': 80,
  input: 70,
  overlay: 60,
  scroll: 50,
  'key-state': 40,
  theme: 30,
  narrow: 20,
};

export function selectReviewProfile(input: SelectReviewProfileInput): SelectedReviewProfile {
  assertCandidates(input.cases);
  const signals = [...new Set(input.riskSignals)].sort();
  const inferred: ReviewCoverageProfile = signals.some((item) => FULL_SIGNALS.has(item))
    ? 'l3-full'
    : signals.some((item) => FOCUSED_SIGNALS.has(item))
      ? 'l2-focused'
      : 'l1-quick';
  const requested = input.requestedProfile ?? 'l1-quick';
  const coverageProfile = PROFILE_RANK[requested] > PROFILE_RANK[inferred] ? requested : inferred;
  const ordered = [...input.cases].sort(compareCandidates);
  const selected = coverageProfile === 'l3-full'
    ? ordered
    : coverageProfile === 'l2-focused'
      ? selectFocused(ordered)
      : selectQuick(ordered);
  const selectedCaseIds = selected.map((item) => item.caseId).sort();
  const selectedSet = new Set(selectedCaseIds);
  const selectedScenarioCaseIds = selected.filter((item) => item.scenarioCase).map((item) => item.caseId).sort();
  const selectedObligations = input.obligations.flatMap((obligation) => {
    const caseIds = obligation.caseIds.filter((caseId) => selectedSet.has(caseId));
    return caseIds.length ? [{ ...obligation, caseIds }] : [];
  });
  const excludedCaseIds = ordered
    .filter((item) => !selectedSet.has(item.caseId))
    .map((item) => ({ caseId: item.caseId, reason: `excluded-by-${coverageProfile}` }));
  return {
    profile: {
      contractVersion: 1,
      coverageProfile,
      reasonCodes: signals.length ? signals : ['local-low-risk-change'],
      excludedCaseIds,
      excludedScenarioCaseIds: excludedCaseIds.filter(({ caseId }) => input.cases.find((item) => item.caseId === caseId)?.scenarioCase),
    },
    selectedCaseIds,
    selectedScenarioCaseIds,
    selectedObligations,
  };
}

function selectQuick(cases: ReviewCaseCandidate[]): ReviewCaseCandidate[] {
  const byScreen = new Map<string, ReviewCaseCandidate[]>();
  for (const item of cases) byScreen.set(item.screenId, [...(byScreen.get(item.screenId) ?? []), item]);
  return [...byScreen.values()].flatMap((items) => {
    const baseline = items.find((item) => item.tags.includes('baseline')) ?? items[0];
    const risk = items.find((item) => item.caseId !== baseline?.caseId && item.tags.some((tag) => tag !== 'baseline'));
    return [baseline, risk].filter((item): item is ReviewCaseCandidate => item !== undefined);
  });
}

function selectFocused(cases: ReviewCaseCandidate[]): ReviewCaseCandidate[] {
  const minimum = Math.min(3, cases.length);
  const maximum = Math.min(5, cases.length);
  const baselineByScreen = [...new Map(cases.filter((item) => item.tags.includes('baseline')).map((item) => [item.screenId, item])).values()];
  const selected = new Map(baselineByScreen.slice(0, maximum).map((item) => [item.caseId, item]));
  for (const item of cases) {
    if (selected.size >= maximum) break;
    selected.set(item.caseId, item);
  }
  if (selected.size < minimum) {
    for (const item of cases) selected.set(item.caseId, item);
  }
  return [...selected.values()];
}

function compareCandidates(a: ReviewCaseCandidate, b: ReviewCaseCandidate): number {
  return score(b) - score(a) || a.screenId.localeCompare(b.screenId) || a.caseId.localeCompare(b.caseId);
}

function score(item: ReviewCaseCandidate): number {
  return item.tags.reduce((total, tag) => total + TAG_SCORE[tag], 0) + (item.scenarioCase ? 10 : 0);
}

function assertCandidates(cases: ReviewCaseCandidate[]): void {
  if (cases.length === 0) throw new Error('Review Profile selection requires at least one Case candidate.');
  if (new Set(cases.map((item) => item.caseId)).size !== cases.length) throw new Error('Review Profile Case IDs must be unique.');
  for (const item of cases) {
    if (!item.caseId.trim() || !item.screenId.trim()) throw new Error('Review Profile Case identity is incomplete.');
  }
}
