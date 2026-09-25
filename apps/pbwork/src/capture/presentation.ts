import { incompleteCaseCount, type CaptureJob } from "@proto-bridge/core/v2";
import { riskKindLabel } from "@proto-bridge/core/v2/prompts/agent-prompt";
import type { CaptureConsoleState } from "@proto-bridge/core/v2/service-contract";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";

export { riskKindLabel };

const RUNNING_STATUSES = new Set([
  "queued",
  "discovering",
  "capturing",
  "writing",
]);

export type CaptureTaskDisplayStatus =
  "running" | "needs-attention" | "resolved" | "completed" | "cancelled";

export type CaptureFailureDisplay = {
  caseId?: string;
  title: string;
  message: string;
  technicalDetail: string;
};

export type CaptureTaskPresentation = {
  job: CaptureJob;
  prototypeId: string;
  prototypeLabel: string;
  scopeLabel: string;
  status: CaptureTaskDisplayStatus;
  statusLabel: string;
  acceptedAtLabel: string;
  viewCount: number;
  progress: number;
  completedCases: number;
  currentCaseLabel?: string | undefined;
  failures: CaptureFailureDisplay[];
  resolvedBy?: CaptureJob;
  resultPath?: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonical(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function selectionKeys(job: CaptureJob): Set<string> {
  return new Set(
    job.selection.cases.map(
      (item) => `${item.caseId}#${canonical(item.captureScope)}`,
    ),
  );
}

function successfulSnapshot(
  state: CaptureConsoleState,
  job: CaptureJob,
): CaptureConsoleState["bundles"][number]["activeSnapshot"] | undefined {
  const bundle = state.bundles.find(
    (item) => item.bundle.bundleId === job.bundleId,
  );
  if (!bundle || !job.runId) return undefined;
  return (
    bundle.snapshots?.find((snapshot) => snapshot.sourceRunId === job.runId) ??
    (bundle.activeSnapshot?.sourceRunId === job.runId
      ? bundle.activeSnapshot
      : undefined)
  );
}

function incompleteCasesOf(
  state: CaptureConsoleState,
  job: CaptureJob,
): number {
  const snapshot = successfulSnapshot(state, job);
  return snapshot ? incompleteCaseCount(snapshot.coverage.counts) : 0;
}

function resolvingJob(
  state: CaptureConsoleState,
  failedJob: CaptureJob,
): CaptureJob | undefined {
  const failedKeys = selectionKeys(failedJob);
  return state.jobs
    .filter(
      (candidate) =>
        candidate.status === "completed" &&
        candidate.acceptedAt > failedJob.acceptedAt &&
        Boolean(successfulSnapshot(state, candidate)) &&
        incompleteCasesOf(state, candidate) === 0,
    )
    .find((candidate) => {
      const candidateKeys = selectionKeys(candidate);
      return [...failedKeys].every((key) => candidateKeys.has(key));
    });
}

function prototypeIdOf(job: CaptureJob): string {
  return (
    job.selection.cases[0]?.caseKey.screenId.split(".")[0] ??
    "unknown-prototype"
  );
}

function scopeLabelOf(job: CaptureJob): string {
  const screenIds = [
    ...new Set(job.selection.cases.map((item) => item.caseKey.screenId)),
  ];
  const screens = loadPrototypeScreens();
  const labels = screenIds.map(
    (screenId) =>
      screens.find((screen) => screen.screenId === screenId)?.label ?? screenId,
  );
  const hasFragment = job.selection.cases.some(
    (item) =>
      item.captureScope.fragments && item.captureScope.fragments.length > 0,
  );
  if (hasFragment && labels.length === 1) {
    return `${labels[0]} · 控件范围`;
  }
  const authoredCount = screens.filter(
    (screen) => screen.prototypeId === prototypeIdOf(job),
  ).length;
  if (
    labels.length > 1 &&
    labels.length >= authoredCount &&
    authoredCount > 0
  ) {
    return `整原型 · ${labels.length} 屏`;
  }
  if (labels.length === 1) return labels[0]!;
  if (labels.length <= 3) return labels.join(" + ");
  return `${labels.slice(0, 2).join(" + ")} 等 ${labels.length} 屏`;
}

function currentCaseLabelOf(job: CaptureJob): string | undefined {
  if (!RUNNING_STATUSES.has(job.status)) return undefined;
  const finished = new Set(
    job.journal
      .filter((entry) => entry.event === "case-finished")
      .map((entry) => entry.detail?.split(":")[0])
      .filter(Boolean),
  );
  const next = job.selection.cases.find((item) => !finished.has(item.caseId));
  return next ? caseLabel(next.caseId) : undefined;
}

function completedCount(job: CaptureJob): number {
  return job.journal.filter((entry) => entry.event === "case-finished").length;
}

function caseLabel(caseId: string | undefined): string {
  if (!caseId) return "采集项";
  const screenId = caseId.split("::")[0] ?? "";
  return (
    loadPrototypeScreens().find((screen) => screen.screenId === screenId)
      ?.label ?? screenId
  );
}

/** "页面 · 状态" or "页面 · 场景「…」" for one Case identity. */
export function caseDisplayLabel(caseId: string): string {
  const [screenId = "", variantId = "", , , scenarioPart] = caseId.split("::");
  const screens = loadPrototypeScreens();
  const screen = screens.find((item) => item.screenId === screenId);
  const screenLabel = screen?.label ?? screenId;
  if (scenarioPart?.startsWith("scenario=")) {
    const [scenarioRef = "", checkpointId = ""] = scenarioPart
      .slice("scenario=".length)
      .split("@");
    const scenario = screens
      .flatMap((owner) =>
        (owner.scenarios ?? []).map((item) => ({
          ref: `${owner.screenId}.${item.id}`,
          label: item.label,
        })),
      )
      .find((item) => item.ref === scenarioRef);
    return `${screenLabel} · 场景「${scenario?.label ?? (checkpointId || scenarioRef)}」`;
  }
  const variantLabel =
    screen?.variants.find((variant) => variant.id === variantId)?.label ??
    variantId;
  return variantLabel ? `${screenLabel} · ${variantLabel}` : screenLabel;
}

export type CaptureFailureKind =
  | "occluded"
  | "missing-fragment"
  | "missing-role"
  | "invalid-identity"
  | "duplicate-identity"
  | "result-unavailable"
  | "unknown";

type FailureCopy = { title: string; message: string; action: string };

const FAILURE_COPY: Record<CaptureFailureKind, FailureCopy> = {
  occluded: {
    title: "区域被其它层遮挡",
    message: "这些必需区域的中心点被别的元素盖住，采集无法确认用户能看到并点到它们。",
    action: "检查浮层、底部栏、固定定位或 z-index 层级；重新采集不能解决。",
  },
  "missing-fragment": {
    title: "必需区域没有出现",
    message: "页面或场景检查点要求的区域在采集时不存在。",
    action: "确认场景动作确实会让该区域出现，并核对 data-pb-id 与 Registry 声明一致。",
  },
  "missing-role": {
    title: "区域缺少语义角色",
    message: "节点有 data-pb-id，但没有 data-pb-role，无法判断它是哪种控件。",
    action: "给节点补 data-pb-role，或改用已声明角色的 DS 组件。",
  },
  "invalid-identity": {
    title: "原型身份不合法",
    message: "有 Screen、Fragment 或 pbKey 不符合稳定身份规则。",
    action: "改 Registry 和页面上的 data-pb-key：只用小写字母、数字、'.'、'-'、'_'，不要用中文显示文字、纯数字、CSS selector 或 DOM path。",
  },
  "duplicate-identity": {
    title: "存在重复采集标识",
    message: "两个区域使用了相同标识，无法判断应记录哪一个。",
    action: "为重复的节点提供不同的 data-pb-key。",
  },
  "result-unavailable": {
    title: "任务结果已经不可用",
    message: "这次失败没有形成可检查的采集结果。",
    action: "可以重新发起采集。",
  },
  unknown: {
    title: "采集未完成",
    message: "采集没有得到可信结果。",
    action: "展开原文查看具体原因。",
  },
};

export function classifyCaptureFailure(reason: string): CaptureFailureKind {
  if (reason.includes("is occluded at its center point")) return "occluded";
  if (reason.includes("without data-pb-role")) return "missing-role";
  if (/Fragment \S+ is missing/.test(reason)) return "missing-fragment";
  if (reason.includes("Duplicate semantic Fragment identity")) {
    return "duplicate-identity";
  }
  if (
    reason.includes("must be a stable lowercase identifier") ||
    reason.includes("failed schema validation")
  ) {
    return "invalid-identity";
  }
  if (reason.includes("Bundle does not exist")) return "result-unavailable";
  return "unknown";
}

function failedFragmentOf(reason: string): string | undefined {
  const match = /Fragment (\S+?)\/(\S*?)(?:\s|$)/.exec(reason);
  if (!match) return undefined;
  return match[2] ? `${match[1]}#${match[2]}` : match[1];
}

export type CaptureFailureCase = {
  caseId: string;
  label: string;
  fragment?: string;
  technicalDetail: string;
};

export type CaptureFailureGroup = FailureCopy & {
  kind: CaptureFailureKind;
  cases: CaptureFailureCase[];
};

/** Groups failed Case reasons by cause, in the order causes first appear. */
export function groupCaptureFailures(
  failures: Array<{ caseId: string; reason: string }>,
): CaptureFailureGroup[] {
  const groups = new Map<CaptureFailureKind, CaptureFailureGroup>();
  for (const failure of failures) {
    const kind = classifyCaptureFailure(failure.reason);
    const group =
      groups.get(kind) ?? { kind, ...FAILURE_COPY[kind], cases: [] };
    const fragment = failedFragmentOf(failure.reason);
    group.cases.push({
      caseId: failure.caseId,
      label: caseDisplayLabel(failure.caseId),
      ...(fragment ? { fragment } : {}),
      technicalDetail:
        kind === "invalid-identity"
          ? readableSchemaMessage(failure.reason)
          : failure.reason,
    });
    groups.set(kind, group);
  }
  return [...groups.values()];
}

/** Splits a Job journal `case-finished` detail into Case and reason. */
export function parseFailedCaseDetail(
  detail: string,
): { caseId: string; reason: string } | null {
  const marker = ":failed:";
  const index = detail.indexOf(marker);
  if (index < 0) return null;
  return {
    caseId: detail.slice(0, index),
    reason: detail.slice(index + marker.length),
  };
}

export function formatCaptureError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  const raw =
    error instanceof Error ? error.message : "证据采集操作失败。";
  if (code === "capacity-exceeded") {
    const counts = capacityCounts(error, raw);
    return `采集上限不够：需要 ${counts.selected} 项，当前上限 ${counts.maxCases}。`;
  }
  const readable = readableSchemaMessage(raw);
  if (
    code === "invalid-schema" ||
    code === "command-failed" ||
    readable !== raw
  ) {
    return readable.startsWith("采集无法开始")
      ? readable
      : `采集无法开始。${readable}`;
  }
  return readable;
}

function capacityCounts(error: unknown, message: string) {
  const details =
    error && typeof error === "object" && "details" in error
      ? (error as { details?: unknown }).details
      : undefined;
  const record =
    details && typeof details === "object"
      ? (details as Record<string, unknown>)
      : undefined;
  const fromMessage = /expands to (\d+) Cases; the configured maximum is (\d+)/.exec(
    message,
  );
  return {
    selected:
      typeof record?.selected === "number"
        ? record.selected
        : Number(fromMessage?.[1] ?? "?"),
    maxCases:
      typeof record?.maxCases === "number"
        ? record.maxCases
        : Number(fromMessage?.[2] ?? "?"),
  };
}

function readableSchemaMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed.startsWith("[")) return message;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return message;
    const lines = parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const issue = item as { path?: unknown; message?: unknown };
      if (typeof issue.message !== "string") return [];
      const path = Array.isArray(issue.path)
        ? issue.path.map(String).join(".")
        : "<root>";
      return [`${path}: ${issue.message}`];
    });
    return lines.length ? lines.join("; ") : message;
  } catch {
    return message;
  }
}

export function translateCaptureFailure(detail: string): CaptureFailureDisplay {
  const parsed = parseFailedCaseDetail(detail);
  const caseId = parsed?.caseId;
  const reason = parsed?.reason ?? detail;
  const kind = classifyCaptureFailure(reason);
  const copy = FAILURE_COPY[kind];
  const title =
    kind === "duplicate-identity" || kind === "unknown"
      ? `${caseLabel(caseId)}${copy.title}`
      : copy.title;
  return {
    ...(caseId ? { caseId } : {}),
    title,
    message: `${copy.message}${copy.action}`,
    technicalDetail:
      kind === "invalid-identity" ? readableSchemaMessage(reason) : detail,
  };
}

function failureDisplays(job: CaptureJob): CaptureFailureDisplay[] {
  const details = job.journal
    .filter(
      (entry) =>
        entry.event === "case-finished" && entry.detail?.includes(":failed:"),
    )
    .map((entry) => entry.detail!)
    .map(translateCaptureFailure);
  if (details.length) {
    const grouped = new Map<
      string,
      CaptureFailureDisplay & { affectedCount: number }
    >();
    for (const detail of details) {
      const key = `${detail.title}#${detail.message}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.affectedCount += 1;
        existing.technicalDetail += `\n${detail.technicalDetail}`;
      } else {
        grouped.set(key, { ...detail, affectedCount: 1 });
      }
    }
    return [...grouped.values()].map(({ affectedCount, ...detail }) => ({
      ...detail,
      message:
        affectedCount > 1
          ? `${detail.message}（影响 ${affectedCount} 个页面状态）`
          : detail.message,
    }));
  }
  if (job.status === "interrupted") {
    return [
      {
        title: "采集服务中途停止",
        message: "任务没有完整结束，可以按原范围重新采集。",
        technicalDetail:
          job.journal.at(-1)?.detail ?? "Capture Job interrupted.",
      },
    ];
  }
  return [
    {
      title: "采集任务未完成",
      message: "任务没有形成可检查的完整结果，可以按原范围重新采集。",
      technicalDetail: job.journal.at(-1)?.detail ?? job.status,
    },
  ];
}

export function formatCaptureTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameDay) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
  if (sameYear) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function buildCaptureTaskPresentations(
  state: CaptureConsoleState | null,
): CaptureTaskPresentation[] {
  if (!state) return [];
  return state.jobs.map((job) => {
    const prototypeId = prototypeIdOf(job);
    const prototypeLabel =
      loadPrototypes().find((prototype) => prototype.id === prototypeId)
        ?.label ?? prototypeId;
    const incomplete =
      job.status === "completed" ? incompleteCasesOf(state, job) : 0;
    const resolvedBy =
      job.status === "failed" ||
      job.status === "interrupted" ||
      incomplete > 0
        ? resolvingJob(state, job)
        : undefined;
    const snapshot =
      job.status === "completed"
        ? successfulSnapshot(state, job)
        : resolvedBy
          ? successfulSnapshot(state, resolvedBy)
          : undefined;
    const status: CaptureTaskDisplayStatus = RUNNING_STATUSES.has(job.status)
      ? "running"
      : resolvedBy
        ? "resolved"
        : job.status === "completed" && incomplete === 0
          ? "completed"
          : job.status === "cancelled"
            ? "cancelled"
            : "needs-attention";
    const statusLabel: Record<CaptureTaskDisplayStatus, string> = {
      running:
        job.status === "queued"
          ? "等待开始"
          : job.status === "writing"
            ? "正在保存"
            : "正在采集",
      "needs-attention":
        job.status === "interrupted"
          ? "采集中断"
          : incomplete > 0
            ? `部分失败 · ${incomplete} 项`
            : "采集失败",
      resolved: "已由后续采集解决",
      completed: "采集完成",
      cancelled: "已取消",
    };
    const completed = completedCount(job);
    return {
      job,
      prototypeId,
      prototypeLabel,
      scopeLabel: scopeLabelOf(job),
      status,
      statusLabel: statusLabel[status],
      acceptedAtLabel: formatCaptureTime(job.acceptedAt),
      viewCount: job.selection.cases.length,
      completedCases: completed,
      progress:
        job.selection.cases.length === 0
          ? 0
          : Math.min(100, (completed / job.selection.cases.length) * 100),
      ...(currentCaseLabelOf(job)
        ? { currentCaseLabel: currentCaseLabelOf(job)! }
        : {}),
      failures:
        status === "needs-attention" || status === "resolved"
          ? failureDisplays(job)
          : [],
      ...(resolvedBy ? { resolvedBy } : {}),
      ...(snapshot
        ? {
            resultPath: `/workbench/evidence/${
              resolvedBy?.bundleId ?? job.bundleId
            }/${snapshot.snapshotId}`,
          }
        : {}),
    };
  });
}
