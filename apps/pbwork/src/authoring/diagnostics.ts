import type { AuthoringDiagnostic, SemanticRole } from "@proto-bridge/core/v2";
import type { ElementSummary } from "@/runtime/bridge";

export function inspectElementDiagnostics(
  element: ElementSummary,
): AuthoringDiagnostic[] {
  const diagnostics: AuthoringDiagnostic[] = [];
  const classes = element.classes.join(" ");
  const occurrence = element.ref.pbId ?? element.ref.handle ?? element.domPath ?? element.tag;
  const warning = (code: string, message: string, expectedRole?: SemanticRole) => {
    diagnostics.push({
      diagnosticId: `${code}:${occurrence}`,
      code,
      severity: "warning",
      message,
      caseIds: [],
      source: {
        kind: "runtime",
        ...(element.domPath ? { locator: element.domPath } : {}),
        ...(element.ref.pbId ? { fragmentId: element.ref.pbId } : {}),
      },
      nextAction: expectedRole
        ? `Author data-pb-id and data-pb-role="${expectedRole}" together when this is an independent Evidence node.`
        : "Add the explicit semantic attribute required by the component contract.",
    });
  };

  if (/\blist\b/i.test(classes) && !element.pbRole) {
    warning("authoring.possible-list-marker", "看起来像列表，建议补上独立 Evidence 标记。", "list");
  }
  if (/\b(app-bar|navbar|toolbar)\b/i.test(classes) && element.pbRole !== "app-bar") {
    warning("authoring.possible-app-bar-role", "顶栏疑似缺少 app-bar 语义。", "app-bar");
  }
  if (/\b(section|card|panel)\b/i.test(classes) && !element.pbRole) {
    warning("authoring.possible-section-marker", "区块疑似缺少 section 语义。", "section");
  }
  if (/\bsheet\b/i.test(classes) && !element.pbShell) {
    warning("authoring.possible-overlay-shell", "弹层疑似缺少 data-pb-shell。", "sheet");
  }
  if (!element.ref.pbId) {
    warning("authoring.missing-stable-id", "该元素没有稳定 data-pb-id，不能作为独立 Evidence 节点。", element.pbRole as SemanticRole | undefined);
  }
  return diagnostics;
}

