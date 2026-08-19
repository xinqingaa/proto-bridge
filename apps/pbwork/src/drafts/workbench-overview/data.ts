import { componentRecords } from "@/design-system/components/registry";
import {
  loadPrototypeScreens,
  loadPrototypes,
  loadTokens,
} from "@/design-system/loaders";
import {
  LIFECYCLE_LABELS,
  type PrototypeLifecycle,
} from "@/design-system/types";

export { LIFECYCLE_LABELS };

const prototypes = loadPrototypes();
const screens = loadPrototypeScreens();

export function prototypeById(id: string) {
  return prototypes.find((prototype) => prototype.id === id);
}

export function prototypeStats(prototypeId: string) {
  const items = screens.filter((screen) => screen.prototypeId === prototypeId);
  return {
    screens: items.length,
    variants: items.reduce((sum, screen) => sum + screen.variants.length, 0),
  };
}

/** Draft previews point at the real Runtime route, not a mock thumbnail. */
export function runtimePath(prototypeId: string, screenSlug: string) {
  const screen = screens.find(
    (item) => item.prototypeId === prototypeId && item.screenSlug === screenSlug,
  );
  const theme = prototypeById(prototypeId)?.defaultThemeId ?? "light";
  if (!screen) return "";
  return `${screen.path}?variant=${screen.defaultVariantId}&theme=${theme}`;
}

export function screenLabel(prototypeId: string, screenSlug: string) {
  return (
    screens.find(
      (item) =>
        item.prototypeId === prototypeId && item.screenSlug === screenSlug,
    )?.label ?? screenSlug
  );
}

export const focusPrototypes = prototypes.slice(0, 2);

export const wallScreens = [
  { prototypeId: "hengdong", screenSlug: "today" },
  { prototypeId: "cold-chain-ops", screenSlug: "exception-queue" },
  { prototypeId: "hengdong", screenSlug: "plans" },
].map((item) => ({
  ...item,
  key: `${item.prototypeId}.${item.screenSlug}`,
  label: screenLabel(item.prototypeId, item.screenSlug),
  prototypeLabel: prototypeById(item.prototypeId)?.label ?? item.prototypeId,
  src: runtimePath(item.prototypeId, item.screenSlug),
  canvasPath: `/workbench/prototypes/${item.prototypeId}/screens/${item.screenSlug}`,
}));

export const stageScreen = wallScreens[0]!;

/** The hero copy must describe the prototype whose screen is on stage. */
export const focusPrototype =
  prototypeById(stageScreen.prototypeId) ?? prototypes[0]!;

export const lifecycleCards: Array<{
  id: "all" | PrototypeLifecycle;
  label: string;
  count: number;
}> = [
  { id: "all", label: "全部原型", count: prototypes.length },
  ...(["active", "review", "final", "archived"] as PrototypeLifecycle[]).map(
    (id) => ({
      id,
      label: LIFECYCLE_LABELS[id],
      count: id === "active" ? prototypes.length : 0,
    }),
  ),
];

export type CaseStatus = "captured" | "attention" | "pending";

export type CaseCell = {
  key: string;
  screenSlug: string;
  variantId: string;
  status: CaseStatus;
};

/** Deterministic sample coverage so the draft reads like a real Case matrix. */
function cellStatus(index: number): CaseStatus {
  if (index % 9 === 4) return "pending";
  if (index % 13 === 6) return "attention";
  return "captured";
}

let cellIndex = 0;

/** Cells are grouped per Screen so the matrix shows page boundaries, not a blob. */
export const caseRows = prototypes.map((prototype) => {
  const screenGroups = screens
    .filter((item) => item.prototypeId === prototype.id)
    .map((screen) => ({
      slug: screen.screenSlug,
      label: screen.label,
      cells: screen.variants.map<CaseCell>((variant) => ({
        key: `${screen.screenSlug}.${variant.id}`,
        screenSlug: screen.screenSlug,
        variantId: variant.id,
        status: cellStatus(cellIndex++),
      })),
    }));
  return {
    id: prototype.id,
    label: prototype.label,
    lifecycle: "active" as const,
    screens: screenGroups,
    caseCount: screenGroups.reduce((sum, group) => sum + group.cells.length, 0),
  };
});

const allCells = caseRows.flatMap((row) =>
  row.screens.flatMap((group) => group.cells),
);

export const coverage = {
  total: allCells.length,
  captured: allCells.filter((cell) => cell.status === "captured").length,
  attention: allCells.filter((cell) => cell.status === "attention").length,
  pending: allCells.filter((cell) => cell.status === "pending").length,
};

export const captureStats = { running: 1, attention: 1, results: 2 };

export const captureResults = [
  {
    id: "hengdong",
    label: "恒动 · 健身自律记录",
    detail: "8/8 成功 · 08/16 16:02",
  },
  {
    id: "cold-chain-ops",
    label: "冷链异常处置台",
    detail: "3/3 成功 · 08/16 18:40",
  },
];

export const comments = [
  { id: "1", label: "开始训练按钮", content: "主按钮和目标环抢焦点。" },
  { id: "2", label: "登录错误态", content: "失败后缺少下一步说明。" },
];

export const assetStats = [
  { label: "设计令牌", value: loadTokens().length },
  { label: "组件", value: componentRecords.length },
  { label: "页面", value: screens.length },
  {
    label: "状态",
    value: screens.reduce((sum, screen) => sum + screen.variants.length, 0),
  },
];
