import type { CaseAttempt } from "./contracts/attempt.js";
import type { BlobRecord } from "./contracts/blob.js";
import { incompleteCaseCount } from "./contracts/coverage.js";
import type {
  CaseEvidenceRevision,
  Fact,
  Provenance,
} from "./contracts/evidence.js";
import type { Run } from "./contracts/run.js";
import { computeScopeKey } from "./contracts/scope.js";
import type { BundleSnapshot } from "./contracts/snapshot.js";
import type { ThemeIdentity } from "./theme/schema.js";

export type EvidenceFactCategory =
  | "content"
  | "structure"
  | "interaction"
  | "visual"
  | "coverage"
  | "environment"
  | "other";

export type EvidenceReadableFact = {
  /** Zero-based position in the immutable revision.facts array. */
  sourceIndex: number;
  factId: string;
  category: EvidenceFactCategory;
  label: string;
  resolution: Fact["resolution"];
  value?: unknown;
  issueRef?: string;
  provenance: Provenance[];
};

export type EvidenceSemanticRegionReadModel = {
  /** Exact Fact identity prefix; no display regrouping rewrites it. */
  regionId: string;
  identity?: { screenId: string; pbId: string; pbKey?: string };
  label: string;
  role?: string;
  tag?: string;
  text?: string;
  visible?: boolean;
  bbox?: { x: number; y: number; width: number; height: number };
  componentId?: string;
  props?: Record<string, unknown>;
  tokenBindings?: Record<string, string>;
  semanticParent?: unknown;
  semanticAncestors?: unknown[];
  documentOrder?: number;
  scrollOwner?: unknown;
  positioning?: string;
  firstSourceIndex: number;
  sourceFactIds: string[];
  facts: EvidenceReadableFact[];
};

export type EvidenceExecutionReadModel = {
  executionId: string;
  sourceCaseId: string;
  mode: "independent" | "shared-appearance";
  sourceTheme: { theme: string; mode: string };
  stateDigest?: string;
  /** Checked only against the current fixed Snapshot/Handoff Case revisions. */
  sourceExecutionStatus?: "matched" | "not-in-fixed-selection" | "mismatch";
  sourceRevisionId?: string;
};

export type EvidenceCaseReadModel = {
  caseId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  theme?: string;
  deviceId: string;
  scenarioLabel?: string;
  scenario?: {
    ownerScreenId: string;
    scenarioId: string;
    checkpointId: string;
  };
  revisionId: string;
  scopeKey?: string;
  /** Absent for historical Evidence; never infer execution from declarations. */
  execution?: EvidenceExecutionReadModel;
  evidenceLevel: CaseEvidenceRevision["evidenceLevel"];
  scopeKind: "page" | "fragment";
  fragmentLabels: string[];
  screenshotBlobIds: string[];
  facts: EvidenceReadableFact[];
  contextFacts: EvidenceReadableFact[];
  interactionFacts: EvidenceReadableFact[];
  regions: EvidenceSemanticRegionReadModel[];
  unknownCount: number;
  conflictCount: number;
  semanticCoverage: "declared" | "undeclared" | "incomplete" | "not-recorded";
};

export type EvidenceScreenReadModel = {
  screenId: string;
  cases: EvidenceCaseReadModel[];
};

/** Latest Attempt of a Snapshot slot whose result is neither captured nor reused. */
export type EvidenceFailedAttemptReadModel = {
  caseId: string;
  scopeKey: string;
  screenId: string;
  variantId: string;
  themeId: string;
  theme?: string;
  deviceId: string;
  scenario?: {
    ownerScreenId: string;
    scenarioId: string;
    checkpointId: string;
  };
  scopeKind: "page" | "fragment";
  attemptId: string;
  runId: string;
  result: Exclude<CaseAttempt["result"], "captured" | "reused">;
  reason?: string;
  /** An earlier revision still occupies this slot; it is not this Attempt's result. */
  hasActiveRevision: boolean;
};

export type EvidenceReadModel = {
  bundleId: string;
  snapshotId: string;
  /** Pack, named theme and mode fixed by the source Run. Case `themeId` is the mode. */
  themePack?: ThemeIdentity;
  themeCoverage?: {
    declared: Array<{ theme: string; mode: string }>;
    captured: Array<{ theme: string; mode: string; caseCount: number }>;
    missing: Array<{ theme: string; mode: string }>;
    status: "complete" | "partial";
    combinations: Array<{
      theme: string;
      mode: string;
      expectedCaseCount: number;
      capturedCaseCount: number;
      missingCaseCount: number;
    }>;
  };
  sourceRunId: string;
  committedAt: string;
  deliveryStatus: "ready" | "attention";
  coverageStatus: "complete" | "partial";
  semanticStatus: "declared" | "limited";
  evidenceLevels: Array<{
    level: CaseEvidenceRevision["evidenceLevel"];
    count: number;
  }>;
  summary: {
    selected: number;
    captured: number;
    reused: number;
    failed: number;
    missing: number;
    screenshots: number;
    unknown: number;
    conflicts: number;
  };
  screens: EvidenceScreenReadModel[];
  failedAttempts: EvidenceFailedAttemptReadModel[];
  messages: string[];
};

export type BuildEvidenceReadModelInput = {
  snapshot: BundleSnapshot;
  runs: Run[];
  revisions: CaseEvidenceRevision[];
  blobs: BlobRecord[];
};

function categoryFor(factId: string): EvidenceFactCategory {
  if (factId.endsWith(".text")) return "content";
  if (
    factId.endsWith(".role") ||
    factId.endsWith(".tag") ||
    factId.endsWith(".visible") ||
    factId.endsWith(".semanticParent") ||
    factId.endsWith(".semanticAncestors") ||
    factId.endsWith(".documentOrder") ||
    factId.endsWith(".scrollOwner") ||
    factId.endsWith(".positioning") ||
    factId.includes(".structure.")
  ) {
    return "structure";
  }
  if (factId.includes(".action.") || factId.includes(".scenario.")) {
    return "interaction";
  }
  if (factId.endsWith(".bbox")) return "visual";
  if (factId.endsWith(".runtime.semantic-coverage")) return "coverage";
  if (factId.includes(".runtime.actual.") || factId.endsWith(".runtime.execution")) return "environment";
  return "other";
}

function labelFor(factId: string, category: EvidenceFactCategory): string {
  const suffix = factId.split(".").at(-1) ?? factId;
  const labels: Record<EvidenceFactCategory, string> = {
    content: "可见内容",
    structure:
      suffix === "role" ? "语义角色" : suffix === "tag" ? "元素类型" : "可见性",
    interaction: factId.includes(".scenario.") ? "业务场景" : "可执行动作",
    visual: "位置与尺寸",
    coverage: "语义覆盖",
    environment: "采集环境",
    other: suffix,
  };
  return labels[category];
}

function readableFact(fact: Fact, sourceIndex: number): EvidenceReadableFact {
  const category = categoryFor(fact.factId);
  return {
    sourceIndex,
    factId: fact.factId,
    category,
    label: labelFor(fact.factId, category),
    resolution: fact.resolution,
    ...(fact.effectiveValue !== undefined
      ? { value: fact.effectiveValue }
      : fact.candidates[0]
        ? { value: fact.candidates[0].value }
        : {}),
    ...(fact.issueRef ? { issueRef: fact.issueRef } : {}),
    provenance: fact.candidates.map((candidate) => candidate.provenance),
  };
}

const NODE_FACT_SUFFIX = /\.(identity|role|visible|tag|bbox|text|componentId|props|tokenBindings|semanticParent|semanticAncestors|documentOrder|scrollOwner|positioning)$/;

function stringValue(
  fact: EvidenceReadableFact | undefined,
): string | undefined {
  return typeof fact?.value === "string" ? fact.value : undefined;
}

function booleanValue(
  fact: EvidenceReadableFact | undefined,
): boolean | undefined {
  return typeof fact?.value === "boolean" ? fact.value : undefined;
}

function bboxValue(
  fact: EvidenceReadableFact | undefined,
): EvidenceSemanticRegionReadModel["bbox"] {
  if (!fact?.value || typeof fact.value !== "object") return undefined;
  const value = fact.value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every(
    (key) => typeof value[key] === "number",
  )
    ? {
        x: value.x as number,
        y: value.y as number,
        width: value.width as number,
        height: value.height as number,
      }
    : undefined;
}

function semanticRegions(
  facts: EvidenceReadableFact[],
): EvidenceSemanticRegionReadModel[] {
  const groups = new Map<string, EvidenceReadableFact[]>();
  for (const fact of facts) {
    const suffix = fact.factId.match(NODE_FACT_SUFFIX);
    if (!suffix) continue;
    const regionId = fact.factId.slice(0, -suffix[0].length);
    const existing = groups.get(regionId) ?? [];
    existing.push(fact);
    groups.set(regionId, existing);
  }
  return [...groups].map(([regionId, regionFacts]) => {
    const bySuffix = (suffix: string) =>
      regionFacts.find((fact) => fact.factId.endsWith(`.${suffix}`));
    const text = stringValue(bySuffix("text"));
    const identityValue = bySuffix("identity")?.value;
    const identityObject = identityValue && typeof identityValue === "object" && !Array.isArray(identityValue)
      ? identityValue as Record<string, unknown>
      : undefined;
    const identity =
      typeof identityObject?.screenId === "string" && typeof identityObject.pbId === "string"
        ? {
            screenId: identityObject.screenId,
            pbId: identityObject.pbId,
            ...(typeof identityObject.pbKey === "string" ? { pbKey: identityObject.pbKey } : {}),
          }
        : undefined;
    const role = stringValue(bySuffix("role"));
    const tag = stringValue(bySuffix("tag"));
    const visible = booleanValue(bySuffix("visible"));
    const bbox = bboxValue(bySuffix("bbox"));
    const componentId = stringValue(bySuffix("componentId"));
    const propsFact = bySuffix("props")?.value;
    const props =
      propsFact && typeof propsFact === "object" && !Array.isArray(propsFact)
        ? (propsFact as Record<string, unknown>)
        : undefined;
    const tokenBindingsFact = bySuffix("tokenBindings")?.value;
    const tokenBindings =
      tokenBindingsFact && typeof tokenBindingsFact === "object"
        ? (tokenBindingsFact as Record<string, string>)
        : undefined;
    const semanticParent = bySuffix("semanticParent")?.value;
    const semanticAncestorsValue = bySuffix("semanticAncestors")?.value;
    const semanticAncestors = Array.isArray(semanticAncestorsValue)
      ? semanticAncestorsValue
      : undefined;
    const documentOrderValue = bySuffix("documentOrder")?.value;
    const documentOrder =
      typeof documentOrderValue === "number" ? documentOrderValue : undefined;
    const scrollOwner = bySuffix("scrollOwner")?.value;
    const positioning = stringValue(bySuffix("positioning"));
    return {
      regionId,
      ...(identity ? { identity } : {}),
      label: text?.replace(/\s+/g, " ").trim().slice(0, 80) || role || regionId,
      ...(role ? { role } : {}),
      ...(tag ? { tag } : {}),
      ...(text ? { text } : {}),
      ...(visible !== undefined ? { visible } : {}),
      ...(bbox ? { bbox } : {}),
      ...(componentId ? { componentId } : {}),
      ...(props ? { props } : {}),
      ...(tokenBindings ? { tokenBindings } : {}),
      ...(semanticParent !== undefined ? { semanticParent } : {}),
      ...(semanticAncestors ? { semanticAncestors } : {}),
      ...(documentOrder !== undefined ? { documentOrder } : {}),
      ...(scrollOwner !== undefined ? { scrollOwner } : {}),
      ...(positioning ? { positioning } : {}),
      firstSourceIndex: regionFacts[0]?.sourceIndex ?? 0,
      sourceFactIds: regionFacts.map((fact) => fact.factId),
      facts: regionFacts,
    };
  });
}

function semanticCoverageOf(
  facts: EvidenceReadableFact[],
): EvidenceCaseReadModel["semanticCoverage"] {
  const coverage = facts.find((fact) => fact.category === "coverage");
  const status =
    coverage?.value &&
    typeof coverage.value === "object" &&
    "status" in coverage.value
      ? (coverage.value as { status?: unknown }).status
      : undefined;
  return status === "declared" ||
    status === "undeclared" ||
    status === "incomplete"
    ? status
    : "not-recorded";
}

function screenshotOwners(blobs: BlobRecord[]): Map<string, string[]> {
  const byRevision = new Map<string, string[]>();
  for (const blob of blobs) {
    if (blob.kind !== "screenshot") continue;
    for (const owner of blob.ownerRefs) {
      if (owner.kind !== "revision") continue;
      const current = byRevision.get(owner.objectId) ?? [];
      current.push(blob.blobId);
      byRevision.set(owner.objectId, current);
    }
  }
  return byRevision;
}

function executionOf(facts: EvidenceReadableFact[], screenId: string): EvidenceExecutionReadModel | undefined {
  const fact = facts.find((item) => item.factId === `${screenId}.runtime.execution` && item.resolution === "resolved");
  const value = fact?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const execution = value as Record<string, unknown>;
  const theme = execution.sourceTheme;
  if (typeof execution.executionId !== "string" || !execution.executionId ||
      typeof execution.sourceCaseId !== "string" || !execution.sourceCaseId ||
      (execution.mode !== "independent" && execution.mode !== "shared-appearance") ||
      !theme || typeof theme !== "object" || Array.isArray(theme)) return undefined;
  const sourceTheme = theme as Record<string, unknown>;
  if (typeof sourceTheme.theme !== "string" || typeof sourceTheme.mode !== "string") return undefined;
  return {
    executionId: execution.executionId,
    sourceCaseId: execution.sourceCaseId,
    mode: execution.mode,
    sourceTheme: { theme: sourceTheme.theme, mode: sourceTheme.mode },
    ...(typeof execution.stateDigest === "string" ? { stateDigest: execution.stateDigest } : {}),
  };
}

/** Case identity is a declaration, not a revision ref; never resolve it through active/latest. */
export function projectExecutionSources(cases: EvidenceCaseReadModel[]): EvidenceCaseReadModel[] {
  return cases.map((item) => {
    if (!item.execution) return item;
    const { sourceRevisionId: _previousRevision, sourceExecutionStatus: _previousStatus, ...execution } = item.execution;
    const sources = cases.filter((source) => source.caseId === execution.sourceCaseId);
    const matched = sources.find((source) =>
      source.scopeKey === item.scopeKey &&
      source.execution?.executionId === execution.executionId &&
      source.execution.mode === "independent",
    );
    return {
      ...item,
      execution: {
        ...execution,
        sourceTheme: { ...execution.sourceTheme },
        sourceExecutionStatus: matched ? "matched" : sources.length ? "mismatch" : "not-in-fixed-selection",
        ...(matched ? { sourceRevisionId: matched.revisionId } : {}),
      },
    };
  });
}

/**
 * Human- and Agent-facing projection over immutable V2 objects. It never
 * invents facts: every displayed value retains the Fact's provenance and
 * unresolved values remain explicitly unknown/conflicted.
 */
export function buildEvidenceReadModel(
  input: BuildEvidenceReadModelInput,
): EvidenceReadModel {
  const cases = new Map(
    input.runs.flatMap((run) =>
      run.selection.cases.map(
        (selected) => [selected.caseId, selected] as const,
      ),
    ),
  );
  const revisions = new Map(
    input.revisions.map((revision) => [revision.revisionId, revision] as const),
  );
  const screenshots = screenshotOwners(input.blobs);
  const screens = new Map<string, EvidenceCaseReadModel[]>();

  for (const slot of input.snapshot.activeSlots) {
    const revision = revisions.get(slot.revisionId);
    const selected = cases.get(slot.caseId);
    if (!revision || !selected) continue;
    const facts = revision.facts.map(readableFact);
    const regions = semanticRegions(facts);
    const scenario = selected.caseKey.scenario;
    const execution = executionOf(facts, selected.caseKey.screenId);
    const model: EvidenceCaseReadModel = {
      caseId: selected.caseId,
      screenId: selected.caseKey.screenId,
      variantId: selected.caseKey.variantId,
      themeId: selected.caseKey.themeId,
      ...(selected.caseKey.theme ? { theme: selected.caseKey.theme } : {}),
      deviceId: selected.caseKey.deviceId,
      ...(scenario
        ? {
            scenarioLabel: `${scenario.ownerScreenId}.${scenario.scenarioId} / ${scenario.checkpointId}`,
            scenario: {
              ownerScreenId: scenario.ownerScreenId,
              scenarioId: scenario.scenarioId,
              checkpointId: scenario.checkpointId,
            },
          }
        : {}),
      revisionId: revision.revisionId,
      scopeKey: slot.scopeKey,
      ...(execution ? { execution } : {}),
      evidenceLevel: revision.evidenceLevel,
      scopeKind:
        revision.captureScope.fragments.length > 0 ? "fragment" : "page",
      fragmentLabels: revision.captureScope.fragments.map(
        (fragment) =>
          `${fragment.pbId}${fragment.pbKey ? `#${fragment.pbKey}` : ""}`,
      ),
      screenshotBlobIds: screenshots.get(revision.revisionId) ?? [],
      facts,
      contextFacts: facts.filter(
        (fact) =>
          fact.category === "coverage" ||
          fact.category === "environment" ||
          fact.category === "other",
      ),
      interactionFacts: facts.filter((fact) => fact.category === "interaction"),
      regions,
      unknownCount: facts.filter((fact) => fact.resolution === "unknown")
        .length,
      conflictCount: facts.filter(
        (fact) => fact.resolution === "unresolved-conflict",
      ).length,
      semanticCoverage: semanticCoverageOf(facts),
    };
    const existing = screens.get(model.screenId) ?? [];
    existing.push(model);
    screens.set(model.screenId, existing);
  }

  const attempts = new Map(
    input.runs.flatMap((run) =>
      run.attempts.map((attempt) => [attempt.attemptId, attempt] as const),
    ),
  );
  const activeSlotKeys = new Set(
    input.snapshot.activeSlots.map((slot) => `${slot.caseId}#${slot.scopeKey}`),
  );
  const failedAttempts: EvidenceFailedAttemptReadModel[] = [];
  for (const ref of input.snapshot.latestAttempts) {
    const attempt = attempts.get(ref.attemptId);
    const selected = cases.get(ref.caseId);
    if (!attempt || !selected) continue;
    if (attempt.result === "captured" || attempt.result === "reused") continue;
    const scenario = selected.caseKey.scenario;
    failedAttempts.push({
      caseId: ref.caseId,
      scopeKey: ref.scopeKey,
      screenId: selected.caseKey.screenId,
      variantId: selected.caseKey.variantId,
      themeId: selected.caseKey.themeId,
      ...(selected.caseKey.theme ? { theme: selected.caseKey.theme } : {}),
      deviceId: selected.caseKey.deviceId,
      ...(scenario
        ? {
            scenario: {
              ownerScreenId: scenario.ownerScreenId,
              scenarioId: scenario.scenarioId,
              checkpointId: scenario.checkpointId,
            },
          }
        : {}),
      scopeKind:
        attempt.captureScope.fragments.length > 0 ? "fragment" : "page",
      attemptId: attempt.attemptId,
      runId: attempt.runId,
      result: attempt.result,
      ...(attempt.reason ? { reason: attempt.reason } : {}),
      hasActiveRevision: activeSlotKeys.has(`${ref.caseId}#${ref.scopeKey}`),
    });
  }

  const fixedCases = projectExecutionSources([...screens.values()].flat());
  const screenModels = [...screens.entries()].map(
    ([screenId]) => ({
      screenId,
      cases: fixedCases.filter((item) => item.screenId === screenId),
    }),
  );
  const allCases = screenModels.flatMap((screen) => screen.cases);
  const screenshotCount = new Set(
    allCases.flatMap((item) => item.screenshotBlobIds),
  ).size;
  const counts = input.snapshot.coverage.counts;
  const unknown = allCases.reduce((sum, item) => sum + item.unknownCount, 0);
  const conflicts = allCases.reduce((sum, item) => sum + item.conflictCount, 0);
  const semanticLimited = allCases.some(
    (item) =>
      item.semanticCoverage === "undeclared" ||
      item.semanticCoverage === "incomplete" ||
      item.semanticCoverage === "not-recorded",
  );
  const evidenceLevelCounts = new Map<
    CaseEvidenceRevision["evidenceLevel"],
    number
  >();
  for (const item of allCases) {
    evidenceLevelCounts.set(
      item.evidenceLevel,
      (evidenceLevelCounts.get(item.evidenceLevel) ?? 0) + 1,
    );
  }
  const partial = incompleteCaseCount(counts) > 0;
  const messages: string[] = [];
  if (partial) {
    messages.push("部分选择没有成功 Evidence；请检查失败项或重采。");
  }
  if (semanticLimited) {
    messages.push(
      "至少一个页面没有可证明的完整语义覆盖；已保留实际观测内容，没有补造缺失证据。",
    );
  }
  if (unknown > 0) messages.push(`${unknown} 个事实仍为 unknown。`);
  if (conflicts > 0) messages.push(`${conflicts} 个事实存在未解决冲突。`);
  if (messages.length === 0) {
    messages.push("所选 Evidence 已完整解析，可继续创建 Handoff。");
  }

  const sourceRun = input.runs.find(
    (run) => run.runId === input.snapshot.sourceRunId,
  );
  return {
    bundleId: input.snapshot.bundleId,
    snapshotId: input.snapshot.snapshotId,
    ...(sourceRun ? { themePack: sourceRun.selection.themePack } : {}),
    ...(sourceRun?.selection.declaredThemeModes ? {
      themeCoverage: projectThemeCoverage(sourceRun.selection.declaredThemeModes!, [...screens.values()].flat(), sourceRun.selection.themePack.theme,
        sourceRun.selection.cases.map((item) => ({ screenId: item.caseKey.screenId, variantId: item.caseKey.variantId, deviceId: item.caseKey.deviceId, ...(item.caseKey.scenario ? { scenario: item.caseKey.scenario } : {}), scopeKey: computeScopeKey(item.captureScope) }))),
    } : {}),
    sourceRunId: input.snapshot.sourceRunId,
    committedAt: input.snapshot.committedAt,
    deliveryStatus:
      partial || semanticLimited || unknown > 0 || conflicts > 0
        ? "attention"
        : "ready",
    coverageStatus: partial ? "partial" : "complete",
    semanticStatus: semanticLimited ? "limited" : "declared",
    evidenceLevels: [...evidenceLevelCounts].map(([level, count]) => ({
      level,
      count,
    })),
    summary: {
      selected: counts.selected,
      captured: counts.captured,
      reused: counts.reused,
      failed: counts.failed,
      missing: counts.missing,
      screenshots: screenshotCount,
      unknown,
      conflicts,
    },
    screens: screenModels,
    failedAttempts,
    messages,
  };
}

/** Theme tables are declarations; only selected Cases with Screenshot refs count here. */
export function projectThemeCoverage(
  declared: Array<{ theme: string; mode: string }>,
  cases: EvidenceCaseReadModel[],
  defaultTheme: string,
  expectedCases: Array<Pick<EvidenceCaseReadModel, "screenId" | "variantId" | "deviceId" | "scenario" | "scopeKey">> = cases,
): NonNullable<EvidenceReadModel['themeCoverage']> {
  const baseKey = (item: typeof expectedCases[number]) => JSON.stringify({
    screenId: item.screenId, variantId: item.variantId, deviceId: item.deviceId,
    scenario: item.scenario ? { ownerScreenId: item.scenario.ownerScreenId, scenarioId: item.scenario.scenarioId, checkpointId: item.scenario.checkpointId } : null,
    scopeKey: item.scopeKey ?? null,
  });
  const expected = new Set(expectedCases.map(baseKey));
  const combinations = declared.map(({ theme, mode }) => {
    const observed = new Set(cases.filter((item) =>
      (item.theme ?? defaultTheme) === theme && item.themeId === mode && item.screenshotBlobIds.length > 0,
    ).map(baseKey).filter((key) => expected.has(key)));
    return { theme, mode, expectedCaseCount: expected.size, capturedCaseCount: observed.size, missingCaseCount: expected.size - observed.size };
  });
  return {
    declared,
    captured: combinations.flatMap((item) => item.capturedCaseCount ? [{ theme: item.theme, mode: item.mode, caseCount: item.capturedCaseCount }] : []),
    missing: combinations.filter((item) => item.missingCaseCount > 0).map(({ theme, mode }) => ({ theme, mode })),
    status: combinations.every((item) => item.expectedCaseCount > 0 && item.missingCaseCount === 0) ? "complete" : "partial",
    combinations,
  };
}
