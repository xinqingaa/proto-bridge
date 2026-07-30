import type { CaptureJob } from "@proto-bridge/core/v2";
import type { CaptureConsoleState } from "@proto-bridge/core/v2/service-contract";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";

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
  status: CaptureTaskDisplayStatus;
  statusLabel: string;
  acceptedAtLabel: string;
  viewCount: number;
  progress: number;
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
  const snapshot = state.bundles.find(
    (item) => item.bundle.bundleId === job.bundleId,
  )?.activeSnapshot;
  if (!snapshot) return undefined;
  const counts = snapshot.coverage.counts;
  const incomplete =
    counts.failed +
    counts.skipped +
    counts.unsupported +
    counts.cancelled +
    counts.interrupted +
    counts.missing;
  return incomplete === 0 ? snapshot : undefined;
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
        Boolean(successfulSnapshot(state, candidate)),
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

export function translateCaptureFailure(detail: string): CaptureFailureDisplay {
  const marker = ":failed:";
  const markerIndex = detail.indexOf(marker);
  const caseId = markerIndex >= 0 ? detail.slice(0, markerIndex) : undefined;
  const reason =
    markerIndex >= 0 ? detail.slice(markerIndex + marker.length) : detail;

  if (reason.includes("Duplicate semantic Fragment identity")) {
    return {
      ...(caseId ? { caseId } : {}),
      title: `${caseLabel(caseId)}存在重复采集标识`,
      message: "系统发现两个区域使用了相同标识，无法判断应记录哪一个。",
      technicalDetail: detail,
    };
  }
  if (reason.includes("Bundle does not exist")) {
    return {
      ...(caseId ? { caseId } : {}),
      title: "任务结果已经不可用",
      message: "这次失败没有形成可检查的采集结果，可以重新发起采集。",
      technicalDetail: detail,
    };
  }
  return {
    ...(caseId ? { caseId } : {}),
    title: `${caseLabel(caseId)}采集未完成`,
    message: "采集过程没有形成可信结果，请重新采集这一范围。",
    technicalDetail: detail,
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

export function buildCaptureTaskPresentations(
  state: CaptureConsoleState | null,
): CaptureTaskPresentation[] {
  if (!state) return [];
  return state.jobs.map((job) => {
    const prototypeId = prototypeIdOf(job);
    const prototypeLabel =
      loadPrototypes().find((prototype) => prototype.id === prototypeId)
        ?.label ?? prototypeId;
    const resolvedBy =
      job.status === "failed" || job.status === "interrupted"
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
        : job.status === "completed"
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
      "needs-attention": job.status === "interrupted" ? "采集中断" : "采集失败",
      resolved: "已由后续采集解决",
      completed: "采集完成",
      cancelled: "已取消",
    };
    const completed = completedCount(job);
    return {
      job,
      prototypeId,
      prototypeLabel,
      status,
      statusLabel: statusLabel[status],
      acceptedAtLabel: new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(job.acceptedAt)),
      viewCount: job.selection.cases.length,
      progress:
        job.selection.cases.length === 0
          ? 0
          : Math.min(100, (completed / job.selection.cases.length) * 100),
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
