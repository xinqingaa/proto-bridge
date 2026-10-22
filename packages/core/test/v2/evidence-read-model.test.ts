import { describe, expect, it } from "vitest";
import {
  buildEvidenceReadModel,
  buildReconstructionAcceptanceContract,
  fixtures,
  projectThemeCoverage,
  projectExecutionSources,
} from "../../src/v2/index.js";

describe("Evidence read model", () => {
  it("groups active Evidence by Screen and reports an undeclared completeness boundary", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.SNAPSHOT,
      runs: [reference.RUN_1, reference.RUN_2],
      revisions: [
        reference.PRIMARY_ACTIVE_REVISION,
        reference.FRAGMENT_SCOPED_ACTIVE_REVISION,
      ],
      blobs: [],
    });

    expect(model.bundleId).toBe(reference.BUNDLE_ID);
    expect(model.screens[0]?.screenId).toBe("sample.task-list");
    expect(model.screens[0]?.cases.length).toBeGreaterThan(0);
    expect(model.screens[0]?.cases[0]?.regions[0]).toMatchObject({
      regionId: "sample.task-list.root",
      role: "page",
      firstSourceIndex: 0,
      sourceFactIds: ["sample.task-list.root.role"],
    });
    expect(model.screens[0]?.cases[0]?.facts[0]?.sourceIndex).toBe(0);
    expect(model.evidenceLevels).toEqual([
      { level: "instrumented-source-runtime", count: 1 },
      { level: "instrumented-runtime", count: 1 },
    ]);
    expect(model.semanticStatus).toBe("limited");
    expect(model.deliveryStatus).toBe("attention");
    expect(model.messages.join(" ")).toContain("完整语义覆盖");
  });

  it("lists latest failed Attempts with their Case identity and reason", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.PARTIAL_SNAPSHOT,
      runs: [reference.RUN_1, reference.RUN_2, reference.PARTIAL_RUN],
      revisions: [
        reference.PRIMARY_ACTIVE_REVISION,
        reference.FRAGMENT_SCOPED_ACTIVE_REVISION,
      ],
      blobs: [],
    });

    expect(model.coverageStatus).toBe("partial");
    expect(model.failedAttempts).toEqual([
      expect.objectContaining({
        caseId: reference.TASK_LIST_CASE_ID,
        scopeKey: reference.LIST_FRAGMENT_SCOPE_KEY,
        screenId: "sample.task-list",
        scopeKind: "fragment",
        result: "failed",
        reason: reference.PARTIAL_FRAGMENT_ATTEMPT.reason,
        hasActiveRevision: true,
      }),
    ]);
  });

  it("reports no failed Attempts for complete coverage", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.SNAPSHOT,
      runs: [reference.RUN_1, reference.RUN_2],
      revisions: [
        reference.PRIMARY_ACTIVE_REVISION,
        reference.FRAGMENT_SCOPED_ACTIVE_REVISION,
      ],
      blobs: [],
    });
    expect(model.failedAttempts).toEqual([]);
  });

  it("does not call a theme complete when only one of its required states has a Screenshot", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.SNAPSHOT, runs: [reference.RUN_1, reference.RUN_2],
      revisions: [reference.PRIMARY_ACTIVE_REVISION, reference.FRAGMENT_SCOPED_ACTIVE_REVISION], blobs: [],
    });
    const base = model.screens[0]!.cases[0]!;
    const declared = ['default', 'water', 'sundial'].flatMap((theme) => ['light', 'dark'].map((mode) => ({ theme, mode })));
    const expected = [base, { ...base, variantId: 'second-state' }];
    const captured = declared.map(({ theme, mode }) => ({ ...base, theme, themeId: mode, caseId: `${base.caseId}-${theme}-${mode}`, screenshotBlobIds: ['shot'] }));
    const partial = projectThemeCoverage(declared, captured, 'default', expected);
    expect(partial.captured).toHaveLength(6);
    expect(partial.status).toBe('partial');
    expect(partial.missing).toEqual(declared);
    expect(partial.combinations.every((item) => item.expectedCaseCount === 2 && item.capturedCaseCount === 1 && item.missingCaseCount === 1)).toBe(true);
    const complete = projectThemeCoverage(declared, [...captured, ...captured.map((item) => ({ ...item, variantId: 'second-state' }))], 'default', expected);
    expect(complete.status).toBe('complete');
    expect(complete.missing).toEqual([]);
    // Duplicate Screenshot/Case observations cannot fill another scope or state.
    expect(projectThemeCoverage(declared, [...captured, ...captured], 'default', expected).status).toBe('partial');
    expect(projectThemeCoverage(declared, captured, 'default', [{ ...base, scopeKey: 'another-scope' }]).captured).toEqual([]);
  });

  it("keeps missing source-Run states in the theme coverage denominator", () => {
    const reference = fixtures.referenceCaseSlice;
    const source = structuredClone(reference.RUN_2);
    source.selection.declaredThemeModes = [{ theme: 'default', mode: 'light' }, { theme: 'water', mode: 'light' }];
    const selected = source.selection.cases[0]!;
    source.selection.cases.push({ ...selected, caseId: 'sample.task-list::unobserved::light::iphone-14', caseKey: { ...selected.caseKey, variantId: 'unobserved' } });
    const model = buildEvidenceReadModel({ snapshot: reference.SNAPSHOT, runs: [reference.RUN_1, source], revisions: [reference.PRIMARY_ACTIVE_REVISION, reference.FRAGMENT_SCOPED_ACTIVE_REVISION], blobs: [] });
    expect(model.themeCoverage?.status).toBe('partial');
    expect(model.themeCoverage?.combinations.every((item) => item.expectedCaseCount === 2 && item.capturedCaseCount === 0 && item.missingCaseCount === 2)).toBe(true);
  });

  it("pins execution sources only when the fixed Case revision belongs to the same execution", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({ snapshot: reference.SNAPSHOT, runs: [reference.RUN_1, reference.RUN_2], revisions: [reference.PRIMARY_ACTIVE_REVISION, reference.FRAGMENT_SCOPED_ACTIVE_REVISION], blobs: [] });
    const base = model.screens[0]!.cases[0]!;
    const source = { ...base, caseId: 'source-case', revisionId: 'source-revision', execution: { executionId: 'execution-original', sourceCaseId: 'source-case', mode: 'independent' as const, sourceTheme: { theme: 'default', mode: 'light' } } };
    const shared = { ...base, caseId: 'shared-case', revisionId: 'shared-revision', execution: { ...source.execution, mode: 'shared-appearance' as const } };
    const matched = projectExecutionSources([source, shared]);
    expect(matched[1]!.execution).toMatchObject({ sourceExecutionStatus: 'matched', sourceRevisionId: 'source-revision' });
    const replaced = projectExecutionSources([{ ...source, revisionId: 'new-source-revision', execution: { ...source.execution, executionId: 'execution-new' } }, matched[1]!]);
    expect(replaced[1]!.execution?.sourceExecutionStatus).toBe('mismatch');
    expect(replaced[1]!.execution?.sourceRevisionId).toBeUndefined();
    const excluded = projectExecutionSources([matched[1]!]);
    expect(excluded[0]!.execution?.sourceExecutionStatus).toBe('not-in-fixed-selection');
    expect(excluded[0]!.execution?.sourceRevisionId).toBeUndefined();
  });

  it("reads execution only from a resolved fixed Fact and leaves historical execution unknown", () => {
    const reference = fixtures.referenceCaseSlice;
    const revision = structuredClone(reference.PRIMARY_ACTIVE_REVISION);
    const screenId = reference.RUN_1.selection.cases[0]!.caseKey.screenId;
    const execution = {
      executionId: 'execution-fixed', sourceCaseId: reference.TASK_LIST_CASE_ID,
      mode: 'shared-appearance', sourceTheme: { theme: 'default', mode: 'light' }, stateDigest: 'state-fixed',
    };
    revision.facts.push({ factId: `${screenId}.runtime.execution`, resolution: 'resolved', effectiveValue: execution,
      candidates: [{ value: execution, provenance: { source: 'runtime-observation', locator: 'capture-execution' } }] });
    const input = { snapshot: reference.SNAPSHOT, runs: [reference.RUN_1, reference.RUN_2], revisions: [revision, reference.FRAGMENT_SCOPED_ACTIVE_REVISION], blobs: [] };
    const cases = buildEvidenceReadModel(input).screens.flatMap((screen) => screen.cases);
    expect(cases.find((item) => item.revisionId === revision.revisionId)?.execution).toEqual({ ...execution, sourceExecutionStatus: "mismatch" });
    expect(cases.find((item) => item.revisionId !== revision.revisionId)?.execution).toBeUndefined();
    revision.facts.at(-1)!.resolution = 'unknown';
    expect(buildEvidenceReadModel(input).screens.flatMap((screen) => screen.cases).every((item) => !item.execution)).toBe(true);
  });

  it("does not turn binding literals into Target token obligations", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.SNAPSHOT,
      runs: [reference.RUN_1, reference.RUN_2],
      revisions: [
        reference.PRIMARY_ACTIVE_REVISION,
        reference.FRAGMENT_SCOPED_ACTIVE_REVISION,
      ],
      blobs: [],
    });
    const region = model.screens[0]!.cases[0]!.regions[0]!;
    region.tokenBindings = {
      transparentSurface: "transparent",
      divider: "color.divider",
    };

    const acceptance = buildReconstructionAcceptanceContract({
      handoffId: "handoff_literal_test",
      workspaceId: reference.WORKSPACE_ID,
      evidence: model,
    });

    expect(
      acceptance.dimensions.tokens.map((item) => item.expected),
    ).toContainEqual({ slot: "divider", tokenId: "color.divider" });
    expect(JSON.stringify(acceptance.dimensions.tokens)).not.toContain(
      "transparent",
    );
  });
});
