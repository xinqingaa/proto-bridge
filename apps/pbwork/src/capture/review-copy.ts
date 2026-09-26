import type { AuthoringDiagnostic, Risk, RiskKind } from "@proto-bridge/core/v2";
import { loadPrototypeScreens } from "@/design-system/loaders";
import { caseDisplayLabel } from "@/capture/presentation";

export type ReviewCheck = {
  id: string;
  title: string;
  body: string;
  lines: string[];
  technical: string;
};

const RISK_COPY: Record<RiskKind, { title: string; body: string }> = {
  "partial-coverage": {
    title: "有的页面没有采全",
    body: "缺少成功的采集，或该留的截图没有留下。确认后，提示词会写明这些页面不能当成已验证。",
  },
  "stale-evidence": {
    title: "页面在采集之后又改过",
    body: "这些结果对应的是采集当时的页面。如果页面已经改了，需要重新定稿，确认不会让旧结果变新。",
  },
  "required-unknown": {
    title: "有些必填信息当时没读到",
    body: "页面上该确认的内容没有采到。确认后仍会标成「未能确认」，不会用猜测补上。",
  },
  "unresolved-conflict": {
    title: "同一处有互相矛盾的记录",
    body: "确认只表示你知道有矛盾。提示词会把矛盾带给后续开发，不会自动选一边。",
  },
  "evidence-level-limitation": {
    title: "这次对不上源码",
    body: "采集要求对照源码，但实际只有页面运行结果。确认后按页面结果交付，不假装核对过实现。",
  },
  "manual-promotion": {
    title: "这次结果是人工指定的",
    body: "它不是一轮自动采集的产物。确认表示你接受这个来源。",
  },
  "interaction-coverage": {
    title: "规定要走的操作没有采到",
    body: "这些交互没有留下证据。确认后，提示词不会把它们写成已经验证。",
  },
  "reconstruction-readiness": {
    title: "还不能按高保真还原页面结构",
    body: "常见原因是页面没有声明稳定外壳，或截图缺少尺寸。确认后，后续开发要按截图判断，不能当成结构已经核对过。",
  },
};

function screenLabel(screenId: string) {
  return (
    loadPrototypeScreens().find((screen) => screen.screenId === screenId)?.label ??
    screenId
  );
}

function revisionIn(message: string) {
  return message.match(/revision-[a-z0-9-]+/i)?.[0];
}

export function presentWarning(
  warning: {
    warningId: string;
    message: string;
    caseIds?: string[];
    code?: string;
    source?: AuthoringDiagnostic["source"];
  },
): ReviewCheck {
  const screenId = warning.source?.screenId;
  const shell = /^Strict Screen (\S+) must declare shellFragments/.exec(warning.message);
  const subject = screenLabel(shell?.[1] ?? screenId ?? "");
  if (warning.code === "reconstruction.shell-contract-missing" || shell) {
    return {
      id: warning.warningId,
      title: subject ? `${subject}还没声明稳定外壳` : "有的页面还没声明稳定外壳",
      body: "这是严格采集的页面，但没有说明哪些区域属于页面外壳，也没有把每个状态标成替换外壳。确认后，这次交付会写明：外壳要按截图判断。",
      lines: [],
      technical: warning.message,
    };
  }
  const missing = /^Required interaction Scenarios are not selected: (.+)\.$/.exec(
    warning.message,
  );
  if (warning.code === "capture.interaction-coverage" || missing) {
    const names = (missing?.[1] ?? warning.caseIds?.join(", ") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return {
      id: warning.warningId,
      title: "有些必须演示的操作没有列入采集",
      body: "这些交互不会出现在结果里。确认表示你接受本次不覆盖它们。",
      lines: names,
      technical: warning.message,
    };
  }
  if (
    warning.code === "capture.source-unavailable" ||
    warning.message.startsWith("Source Evidence was requested")
  ) {
    return {
      id: warning.warningId,
      title: "这次还不能对照源码采集",
      body: "结果只会记录页面上实际看到的内容。确认表示你接受本次不核对实现源码。",
      lines: [],
      technical: warning.message,
    };
  }
  return {
    id: warning.warningId,
    title: "需要你确认的提醒",
    body: "确认后采集会继续，这一点会保留在结果里。",
    lines: [],
    technical: warning.message,
  };
}

function riskLine(risk: Risk, revisionLabel: (revisionId: string) => string): string {
  const revision = revisionIn(risk.message);
  const where = revision ? revisionLabel(revision) : "";
  const count = risk.message.match(/^(\d+) facts/)?.[1];
  if (risk.kind === "required-unknown" && where) {
    return `${where}：${count ?? "若干"} 项必填信息没读到`;
  }
  if (risk.kind === "unresolved-conflict" && where) {
    return `${where}：${count ?? "若干"} 处记录互相矛盾`;
  }
  if (risk.kind === "stale-evidence" && where) return `${where}的结果已过时`;
  if (risk.kind === "evidence-level-limitation" && where) {
    return `${where}只有页面运行结果，没有源码对照`;
  }
  if (risk.kind === "partial-coverage" && where) return `${where}缺少截图或成功采集`;
  if (risk.kind === "reconstruction-readiness" && where) {
    return risk.message.includes("renderability")
      ? `${where}的截图缺少尺寸信息`
      : `${where}的页面结构约定不完整`;
  }
  if (risk.kind === "interaction-coverage") {
    const count = risk.refs.length || Number(risk.message.match(/^(\d+)/)?.[1] ?? 0);
    return count
      ? `${count} 个必须演示的操作没有证据`
      : "必须演示的操作没有证据";
  }
  if (risk.kind === "partial-coverage" && risk.message.includes("successful relevant Attempt")) {
    const places = risk.refs.map((ref) => {
      const caseId = ref.split("/")[0] ?? ref;
      return caseDisplayLabel(caseId);
    });
    return places.length ? places.join("、") : "至少有一个页面状态没有成功采集";
  }
  return where || "见技术原文";
}

export function presentRiskChecklist(
  risks: Risk[],
  revisionLabel: (revisionId: string) => string = () => "一个页面状态",
): Array<ReviewCheck & { id: RiskKind }> {
  const groups = new Map<RiskKind, Risk[]>();
  for (const risk of risks) {
    const current = groups.get(risk.kind) ?? [];
    current.push(risk);
    groups.set(risk.kind, current);
  }
  return [...groups].map(([kind, items]) => {
    const copy = RISK_COPY[kind];
    const lines = [...new Set(items.map((risk) => riskLine(risk, revisionLabel)))];
    return {
      id: kind,
      title: copy.title,
      body: copy.body,
      lines,
      technical: items.map((risk) => risk.message).join("\n"),
    };
  });
}

export function speakEvidenceMessage(message: string): string {
  const unknown = /^(\d+) 个事实仍为 unknown。$/.exec(message);
  if (unknown) {
    return `${unknown[1]} 处必填信息当时没采到。结果会标明「未能确认」，不会编造。`;
  }
  const conflict = /^(\d+) 个事实存在未解决冲突。$/.exec(message);
  if (conflict) return `${conflict[1]} 处记录互相矛盾，需要核对页面后再采。`;
  if (message.includes("可继续创建 Handoff")) return "这次页面事实都已读出。";
  if (message.startsWith("部分选择没有成功")) {
    return "有些页面状态没有采成功，先看上面的失败项。";
  }
  if (message.includes("没有可证明的完整语义覆盖")) {
    return "至少有一个页面的结构没有被完整标出。已保留实际看到的内容，没有把缺失的部分补成事实。";
  }
  return message;
}
