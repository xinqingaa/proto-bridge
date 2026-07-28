import { FULL_CASE_SCOPE_KEY, TASK_LIST_CASE_ID, TASK_LIST_CASE_KEY } from './shared.js';
import { ATTEMPT_1_ID, HANDOFF, PRIMARY_ACTIVE_REVISION } from './valid.js';

/**
 * Schema-level invalid fixtures from pb-v2-implementation-guide.md "第一批可直接开工的任务" §4.
 * Each entry must fail `schema.safeParse(input)`; `contracts.test.ts` drives
 * this list generically instead of one bespoke test per case.
 */
export type InvalidSchemaFixture = {
  name: string;
  schemaName: 'CaseKey' | 'CaseEvidenceRevision' | 'AgentHandoff' | 'FragmentRef' | 'Candidate';
  input: unknown;
};

export const MISSING_CASE_DIMENSION: InvalidSchemaFixture = {
  name: 'missing-case-dimension',
  schemaName: 'CaseKey',
  input: {
    screenId: TASK_LIST_CASE_KEY.screenId,
    variantId: TASK_LIST_CASE_KEY.variantId,
    themeId: TASK_LIST_CASE_KEY.themeId,
    // deviceId intentionally omitted: a Case must always carry all four dimensions.
  },
};

export const UNKNOWN_MAJOR_SCHEMA_VERSION: InvalidSchemaFixture = {
  name: 'unknown-major-schema-version',
  schemaName: 'CaseEvidenceRevision',
  input: { ...PRIMARY_ACTIVE_REVISION, schemaVersion: 99 },
};

export const HANDOFF_WITH_UNFIXED_REVISION: InvalidSchemaFixture = {
  name: 'handoff-references-unfixed-revision',
  schemaName: 'AgentHandoff',
  input: {
    ...HANDOFF,
    selectedCases: [
      {
        caseId: TASK_LIST_CASE_ID,
        scopeKey: FULL_CASE_SCOPE_KEY,
        relevantAttemptId: ATTEMPT_1_ID,
        // revisionId intentionally omitted: a Handoff must fix a concrete revision, never resolve it at read time.
      },
    ],
  },
};

export const FRAGMENT_WITH_CSS_SELECTOR: InvalidSchemaFixture = {
  name: 'fragment-uses-css-selector',
  schemaName: 'FragmentRef',
  input: { screenId: TASK_LIST_CASE_KEY.screenId, pbId: '.task-row:nth-child(2) > span' },
};

export const TARGET_FACT_IN_EVIDENCE: InvalidSchemaFixture = {
  name: 'target-fact-written-into-evidence',
  schemaName: 'Candidate',
  input: {
    value: 'lib/screens/task_list_screen.dart',
    provenance: { source: 'target', locator: 'target-scan:task_list_screen.dart' },
  },
};

export const INVALID_SCHEMA_FIXTURES: InvalidSchemaFixture[] = [
  MISSING_CASE_DIMENSION,
  UNKNOWN_MAJOR_SCHEMA_VERSION,
  HANDOFF_WITH_UNFIXED_REVISION,
  FRAGMENT_WITH_CSS_SELECTOR,
  TARGET_FACT_IN_EVIDENCE,
];
