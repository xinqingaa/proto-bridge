import type { BlobRecord } from "./contracts/blob.js";
import type {
  CaseEvidenceRevision,
  Fact,
  Provenance,
} from "./contracts/evidence.js";
import type { Run } from "./contracts/run.js";
import type { BundleSnapshot } from "./contracts/snapshot.js";

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
  label: string;
  role?: string;
  tag?: string;
  text?: string;
  visible?: boolean;
  bbox?: { x: number; y: number; width: number; height: number };
  firstSourceIndex: number;
  sourceFactIds: string[];
  facts: EvidenceReadableFact[];
};

export type EvidenceCaseReadModel = {
  caseId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  scenarioLabel?: string;
  revisionId: string;
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

export type EvidenceReadModel = {
  bundleId: string;
  snapshotId: string;
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
    factId.endsWith(".visible")
  ) {
    return "structure";
  }
  if (factId.includes(".action.") || factId.includes(".scenario.")) {
    return "interaction";
  }
  if (factId.endsWith(".bbox")) return "visual";
  if (factId.endsWith(".runtime.semantic-coverage")) return "coverage";
  if (factId.includes(".runtime.actual.")) return "environment";
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

const NODE_FACT_SUFFIX = /\.(role|visible|tag|bbox|text)$/;

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
    const role = stringValue(bySuffix("role"));
    const tag = stringValue(bySuffix("tag"));
    const visible = booleanValue(bySuffix("visible"));
    const bbox = bboxValue(bySuffix("bbox"));
    return {
      regionId,
      label: text?.replace(/\s+/g, " ").trim().slice(0, 80) || role || regionId,
      ...(role ? { role } : {}),
      ...(tag ? { tag } : {}),
      ...(text ? { text } : {}),
      ...(visible !== undefined ? { visible } : {}),
      ...(bbox ? { bbox } : {}),
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
    const model: EvidenceCaseReadModel = {
      caseId: selected.caseId,
      screenId: selected.caseKey.screenId,
      variantId: selected.caseKey.variantId,
      themeId: selected.caseKey.themeId,
      deviceId: selected.caseKey.deviceId,
      ...(scenario
        ? {
            scenarioLabel: `${scenario.ownerScreenId}.${scenario.scenarioId} / ${scenario.checkpointId}`,
          }
        : {}),
      revisionId: revision.revisionId,
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

  const screenModels = [...screens.entries()].map(
    ([screenId, screenCases]) => ({
      screenId,
      cases: screenCases,
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
  const partial =
    counts.failed +
      counts.skipped +
      counts.unsupported +
      counts.cancelled +
      counts.interrupted +
      counts.missing >
    0;
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

  return {
    bundleId: input.snapshot.bundleId,
    snapshotId: input.snapshot.snapshotId,
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
    messages,
  };
}
