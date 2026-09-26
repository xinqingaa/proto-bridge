import type { EvidenceSemanticRegionReadModel } from "@proto-bridge/core/v2/evidence-read-model";

export type StructureRow = {
  regionId: string;
  depth: number;
  role: string;
  name?: string;
  component?: string;
  childCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  page: "页面",
  "app-bar": "顶部栏",
  "bottom-bar": "底部栏",
  navigation: "导航",
  section: "分区",
  summary: "摘要",
  card: "卡片",
  list: "列表",
  "scroll-list": "滚动列表",
  "list-item": "列表项",
  filter: "筛选",
  search: "搜索",
  form: "表单",
  field: "输入项",
  "tab-bar": "标签栏",
  tab: "标签",
  "tab-panel": "标签内容",
  "tab-viewport": "标签视图",
  chart: "图表",
  "empty-state": "空状态",
  "loading-state": "加载状态",
  "error-state": "错误状态",
  sheet: "底部面板",
  dialog: "对话框",
  drawer: "抽屉",
  toast: "轻提示",
  button: "按钮",
  chip: "标签按钮",
  badge: "徽标",
  status: "状态",
  icon: "图标",
  image: "图片",
  text: "文字",
  unknown: "未分类",
};

const NAME_LIMIT = 28;

export function roleLabel(role: string | undefined): string {
  if (!role) return "区域";
  return ROLE_LABELS[role] ?? role;
}

function fragmentKey(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const ref = value as Record<string, unknown>;
  if (typeof ref.pbId !== "string") return "";
  return `${String(ref.screenId ?? "")}:${ref.pbId}:${String(ref.pbKey ?? "")}`;
}

function sameBox(
  a: EvidenceSemanticRegionReadModel["bbox"],
  b: EvidenceSemanticRegionReadModel["bbox"],
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) <= 1 &&
    Math.abs(a.y - b.y) <= 1 &&
    Math.abs(a.width - b.width) <= 1 &&
    Math.abs(a.height - b.height) <= 1
  );
}

function shortName(text: string | undefined): string | undefined {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  return clean.length > NAME_LIMIT ? `${clean.slice(0, NAME_LIMIT)}…` : clean;
}

/**
 * Nest regions by their recorded semantic parent. A wrapper whose only child
 * occupies the same box collapses into that child, so the reviewer sees one row.
 */
export function structureOutline(
  regions: readonly EvidenceSemanticRegionReadModel[],
): StructureRow[] {
  const ordered = [...regions].sort(
    (a, b) =>
      (a.documentOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.documentOrder ?? Number.MAX_SAFE_INTEGER) ||
      a.firstSourceIndex - b.firstSourceIndex,
  );
  const byKey = new Map<string, EvidenceSemanticRegionReadModel>();
  for (const region of ordered) {
    const key = fragmentKey(region.identity);
    if (key) byKey.set(key, region);
  }
  const children = new Map<string, EvidenceSemanticRegionReadModel[]>();
  const roots: EvidenceSemanticRegionReadModel[] = [];
  for (const region of ordered) {
    const parent = byKey.get(fragmentKey(region.semanticParent));
    if (!parent || parent === region) {
      roots.push(region);
      continue;
    }
    const list = children.get(parent.regionId) ?? [];
    list.push(region);
    children.set(parent.regionId, list);
  }

  const rows: StructureRow[] = [];
  const visit = (region: EvidenceSemanticRegionReadModel, depth: number) => {
    const kids = children.get(region.regionId) ?? [];
    if (kids.length === 1 && sameBox(region.bbox, kids[0]!.bbox)) {
      visit(kids[0]!, depth);
      return;
    }
    const name = kids.length === 0 ? shortName(region.text) : undefined;
    rows.push({
      regionId: region.regionId,
      depth,
      role: roleLabel(region.role),
      ...(name ? { name } : {}),
      ...(region.componentId && region.componentId !== region.role
        ? { component: region.componentId }
        : {}),
      childCount: kids.length,
    });
    for (const kid of kids) visit(kid, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return rows;
}
