import { componentRecords } from "@/design-system/components/registry";
import { loadPrototypes, loadPrototypeScreens, loadThemes } from "@/design-system/loaders";
import {
  LIFECYCLE_LABELS,
  TOKEN_CATEGORIES,
  type PrototypeLifecycle,
  type TokenCategory,
} from "@/design-system/types";

export type WorkbenchSectionId = "foundations" | "components" | "prototypes";

export type WorkbenchNavigationItem = {
  id: string;
  label: string;
  subtitle?: string;
  to: string;
  group: string;
};

export type PrototypeTreeNode = {
  id: string;
  label: string;
  to: string;
  children?: PrototypeTreeNode[];
};

export const primaryNavigation: Array<
  Omit<WorkbenchNavigationItem, "group"> & { id: WorkbenchSectionId }
> = [
  {
    id: "foundations",
    label: "设计基础",
    to: "/workbench/foundations/tokens/color",
  },
  {
    id: "components",
    label: "组件",
    to: `/workbench/components/${componentRecords.find((item) => item.category === "basic")?.id ?? "button"}`,
  },
  { id: "prototypes", label: "原型", to: "/workbench/prototypes/all" },
];

const tokenCategoryLabels: Record<TokenCategory, string> = {
  color: "颜色",
  typography: "字体",
  spacing: "间距",
  radius: "圆角",
  elevation: "阴影",
};

export function buildFoundationsNavigation(): WorkbenchNavigationItem[] {
  const tokenItems = TOKEN_CATEGORIES.map((category) => ({
    id: `token-${category}`,
    label: tokenCategoryLabels[category],
    group: "令牌",
    to: `/workbench/foundations/tokens/${category}`,
  }));
  const themeItems = loadThemes().map((theme) => ({
    id: `theme-${theme.id}`,
    label: theme.label,
    group: "主题",
    to: `/workbench/foundations/themes/${theme.id}`,
  }));
  return [...tokenItems, ...themeItems];
}

export function buildComponentsNavigation(): WorkbenchNavigationItem[] {
  return componentRecords.map((record) => ({
    id: record.id,
    label: record.label,
    group: record.category === "basic" ? "基础组件" : "复杂组件",
    to: `/workbench/components/${record.id}`,
  }));
}

export function buildPrototypeLifecycleNavigation(): WorkbenchNavigationItem[] {
  const lifecycles: Array<"all" | PrototypeLifecycle> = [
    "all",
    "active",
    "review",
    "final",
    "archived",
  ];
  return lifecycles.map((lifecycle) => ({
    id: `lifecycle-${lifecycle}`,
    label: lifecycle === "all" ? "全部原型" : LIFECYCLE_LABELS[lifecycle],
    group: "生命周期",
    to: `/workbench/prototypes/${lifecycle}`,
  }));
}

export function buildPrototypeTree(
  lifecycle: "all" | PrototypeLifecycle,
): PrototypeTreeNode[] {
  const prototypes = loadPrototypes().filter(
    (item) => lifecycle === "all" || item.lifecycle === lifecycle,
  );
  return prototypes.map((prototype) => ({
    id: prototype.id,
    label: prototype.label,
    to: `/workbench/prototypes/${prototype.id}`,
    children: loadPrototypeScreens()
      .filter((screen) => screen.prototypeId === prototype.id)
      .map((screen) => ({
        id: screen.screenId,
        label: screen.label,
        to: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`,
        children: screen.variants.map((variant) => ({
          id: `${screen.screenId}.${variant.id}`,
          label: variant.label,
          to: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}?variant=${variant.id}&theme=${prototype.defaultThemeId}`,
        })),
      })),
  }));
}

export function getSecondaryNavigation(
  sectionId: WorkbenchSectionId,
): WorkbenchNavigationItem[] {
  if (sectionId === "foundations") return buildFoundationsNavigation();
  if (sectionId === "components") return buildComponentsNavigation();
  return buildPrototypeLifecycleNavigation();
}

export const searchableNavigation = [
  ...buildFoundationsNavigation(),
  ...buildComponentsNavigation(),
  ...buildPrototypeLifecycleNavigation(),
  ...loadPrototypes().map((prototype) => ({
    id: prototype.id,
    label: prototype.label,
    group: "原型",
    to: `/workbench/prototypes/${prototype.id}`,
  })),
];

export function groupSecondaryNavigation(
  items: WorkbenchNavigationItem[],
): Array<{ group: string; items: WorkbenchNavigationItem[] }> {
  const groups: Array<{ group: string; items: WorkbenchNavigationItem[] }> = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last?.group === item.group) {
      last.items.push(item);
      continue;
    }
    groups.push({ group: item.group, items: [item] });
  }
  return groups;
}

export function isWorkbenchSectionId(
  value: unknown,
): value is WorkbenchSectionId {
  return (
    value === "foundations" || value === "components" || value === "prototypes"
  );
}

export function parsePrototypeLifecycle(
  value: string,
): "all" | PrototypeLifecycle | null {
  if (value === "all") return "all";
  if (
    value === "active" ||
    value === "review" ||
    value === "final" ||
    value === "archived"
  ) {
    return value;
  }
  return null;
}
