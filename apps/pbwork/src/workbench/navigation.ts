import { componentRecords } from "@/design-system/components/registry";
import {
  loadPrototypes,
  loadPrototypeScreens,
  loadThemes,
} from "@/design-system/loaders";
import {
  LIFECYCLE_LABELS,
  TOKEN_CATEGORIES,
  type PrototypeLifecycle,
  type TokenCategory,
} from "@/design-system/types";

export type WorkbenchSectionId =
  | "overview"
  | "foundations"
  | "components"
  | "prototypes"
  | "capture";

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
  count?: number;
  children?: PrototypeTreeNode[];
};

export type WorkbenchNavigationTreeNode = {
  id: string;
  label: string;
  kind:
    | "section"
    | "group"
    | "item"
    | "lifecycle"
    | "prototype"
    | "screen"
    | "variant";
  to?: string;
  count?: number;
  children?: WorkbenchNavigationTreeNode[];
};

export const primaryNavigation: Array<
  Omit<WorkbenchNavigationItem, "group"> & { id: WorkbenchSectionId }
> = [
  {
    id: "overview",
    label: "概览",
    to: "/workbench/overview",
  },
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
  { id: "capture", label: "采集证据", to: "/workbench/capture" },
];

const tokenCategoryLabels: Record<TokenCategory, string> = {
  color: "颜色",
  typography: "字体",
  spacing: "间距",
  sizing: "尺寸",
  radius: "圆角",
  border: "边框",
  elevation: "阴影",
  opacity: "透明度",
  motion: "动效",
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

export function buildCaptureNavigation(): WorkbenchNavigationItem[] {
  return [
    {
      id: "capture-console",
      label: "任务中心",
      group: "采集",
      to: "/workbench/capture",
    },
  ];
}

export function buildPrototypeTree(
  lifecycle: "all" | PrototypeLifecycle,
  effectiveLifecycle: (
    prototypeId: string,
    registered: PrototypeLifecycle,
  ) => PrototypeLifecycle = (_, registered) => registered,
): PrototypeTreeNode[] {
  const prototypes = loadPrototypes().filter(
    (item) =>
      lifecycle === "all" ||
      effectiveLifecycle(item.id, item.lifecycle) === lifecycle,
  );
  return prototypes.map((prototype) => ({
    id: prototype.id,
    label: prototype.label,
    to: `/workbench/prototypes/${prototype.id}`,
    count: loadPrototypeScreens().filter(
      (screen) => screen.prototypeId === prototype.id,
    ).length,
    children: loadPrototypeScreens()
      .filter((screen) => screen.prototypeId === prototype.id)
      .map((screen) => ({
        id: screen.screenId,
        label: screen.label,
        to: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`,
        count: screen.variants.length,
        children: screen.variants.map((variant) => ({
          id: `${screen.screenId}.${variant.id}`,
          label: variant.label,
          to: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}?variant=${variant.id}&theme=${prototype.defaultThemeId}`,
        })),
      })),
  }));
}

export function countPrototypesForLifecycle(
  lifecycle: "all" | PrototypeLifecycle,
  effectiveLifecycle: (
    prototypeId: string,
    registered: PrototypeLifecycle,
  ) => PrototypeLifecycle = (_, registered) => registered,
): number {
  return loadPrototypes().filter(
    (prototype) =>
      lifecycle === "all" ||
      effectiveLifecycle(prototype.id, prototype.lifecycle) === lifecycle,
  ).length;
}

export function buildWorkbenchNavigationTree(
  effectiveLifecycle: (
    prototypeId: string,
    registered: PrototypeLifecycle,
  ) => PrototypeLifecycle = (_, registered) => registered,
  lifecycleFilter: "all" | PrototypeLifecycle = "all",
): WorkbenchNavigationTreeNode[] {
  const prototypes = loadPrototypes().filter(
    (prototype) =>
      lifecycleFilter === "all" ||
      effectiveLifecycle(prototype.id, prototype.lifecycle) === lifecycleFilter,
  );
  const screens = loadPrototypeScreens();

  const prototypeItems: WorkbenchNavigationTreeNode[] = prototypes.map(
    (prototype) => {
      const prototypeScreens = screens.filter(
        (screen) => screen.prototypeId === prototype.id,
      );
      return {
        id: `prototype-${prototype.id}`,
        label: prototype.label,
        kind: "prototype" as const,
        to: `/workbench/prototypes/${prototype.id}`,
        count: prototypeScreens.length,
        children: prototypeScreens.map((screen) => ({
          id: `screen-${screen.screenId}`,
          label: screen.label,
          kind: "screen" as const,
          to: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`,
          count: screen.variants.length,
          children: screen.variants.map((variant) => ({
            id: `variant-${screen.screenId}.${variant.id}`,
            label: variant.label,
            kind: "variant" as const,
            to: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}?variant=${variant.id}&theme=${prototype.defaultThemeId}`,
          })),
        })),
      };
    },
  );

  const foundationGroups = groupSecondaryNavigation(
    buildFoundationsNavigation(),
  ).map((group) => ({
    id: `foundation-group-${group.group}`,
    label: group.group,
    kind: "group" as const,
    count: group.items.length,
    children: group.items.map((item) => ({
      id: item.id,
      label: item.label,
      kind: "item" as const,
      to: item.to,
    })),
  }));
  const componentGroups = groupSecondaryNavigation(
    buildComponentsNavigation(),
  ).map((group) => ({
    id: `component-group-${group.group}`,
    label: group.group,
    kind: "group" as const,
    count: group.items.length,
    children: group.items.map((item) => ({
      id: item.id,
      label: item.label,
      kind: "item" as const,
      to: item.to,
    })),
  }));

  return [
    {
      id: "overview",
      label: "概览",
      kind: "section",
      to: "/workbench/overview",
    },
    {
      id: "foundations",
      label: "设计基础",
      kind: "section",
      to: "/workbench/foundations/tokens/color",
      children: foundationGroups,
    },
    {
      id: "components",
      label: "组件",
      kind: "section",
      to:
        primaryNavigation.find((item) => item.id === "components")?.to ??
        "/workbench/components/button",
      count: componentRecords.length,
      children: componentGroups,
    },
    {
      id: "prototypes",
      label: "原型",
      kind: "section",
      to: "/workbench/prototypes/all",
      count: prototypes.length,
      children: prototypeItems,
    },
    {
      id: "capture",
      label: "采集证据",
      kind: "section",
      to: "/workbench/capture",
      children: buildCaptureNavigation().map((item) => ({
        id: item.id,
        label: item.label,
        kind: "item" as const,
        to: item.to,
      })),
    },
  ];
}

export function getSecondaryNavigation(
  sectionId: WorkbenchSectionId,
): WorkbenchNavigationItem[] {
  if (sectionId === "overview") return [];
  if (sectionId === "foundations") return buildFoundationsNavigation();
  if (sectionId === "components") return buildComponentsNavigation();
  if (sectionId === "capture") return buildCaptureNavigation();
  return buildPrototypeLifecycleNavigation();
}

export const searchableNavigation = [
  {
    id: "overview",
    label: "概览",
    group: "工作台",
    to: "/workbench/overview",
  },
  ...buildFoundationsNavigation(),
  ...buildComponentsNavigation(),
  ...buildPrototypeLifecycleNavigation(),
  ...loadPrototypes().map((prototype) => ({
    id: prototype.id,
    label: prototype.label,
    group: "原型",
    to: `/workbench/prototypes/${prototype.id}`,
  })),
  ...buildCaptureNavigation(),
];

export function groupSecondaryNavigation(
  items: WorkbenchNavigationItem[],
): Array<{ group: string; items: WorkbenchNavigationItem[] }> {
  const groups = new Map<string, WorkbenchNavigationItem[]>();
  for (const item of items) {
    const group = groups.get(item.group) ?? [];
    group.push(item);
    groups.set(item.group, group);
  }
  return [...groups].map(([group, groupItems]) => ({
    group,
    items: groupItems,
  }));
}

export function isWorkbenchSectionId(
  value: unknown,
): value is WorkbenchSectionId {
  return (
    value === "overview" ||
    value === "foundations" ||
    value === "components" ||
    value === "prototypes" ||
    value === "capture"
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
