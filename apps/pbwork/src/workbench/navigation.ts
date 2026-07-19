export type WorkbenchSectionId = "foundations" | "components" | "prototypes";

export type WorkbenchNavigationItem = {
  id: string;
  label: string;
  subtitle?: string;
  to: string;
  group: string;
};

export const primaryNavigation: Array<
  Omit<WorkbenchNavigationItem, "group"> & { id: WorkbenchSectionId }
> = [
  {
    id: "foundations",
    label: "设计基础",
    to: "/workbench/foundations/tokens/colors",
  },
  { id: "components", label: "组件", to: "/workbench/components/basic" },
  { id: "prototypes", label: "原型", to: "/workbench/prototypes/all" },
];

export const secondaryNavigation: Record<
  WorkbenchSectionId,
  WorkbenchNavigationItem[]
> = {
  foundations: [
    {
      id: "tokens",
      label: "设计令牌",
      group: "令牌",
      to: "/workbench/foundations/tokens/colors",
    },
    {
      id: "themes",
      label: "主题",
      group: "主题",
      to: "/workbench/foundations/themes/light",
    },
  ],
  components: [
    {
      id: "basic-components",
      label: "基础组件",
      group: "组件类型",
      to: "/workbench/components/basic",
    },
    {
      id: "complex-components",
      label: "复杂组件",
      group: "组件类型",
      to: "/workbench/components/complex",
    },
  ],
  prototypes: [
    {
      id: "all-prototypes",
      label: "全部原型",
      group: "生命周期",
      to: "/workbench/prototypes/all",
    },
    {
      id: "active-prototypes",
      label: "进行中",
      group: "生命周期",
      to: "/workbench/prototypes/active",
    },
    {
      id: "review-prototypes",
      label: "待确认",
      group: "生命周期",
      to: "/workbench/prototypes/review",
    },
    {
      id: "final-prototypes",
      label: "已定稿",
      group: "生命周期",
      to: "/workbench/prototypes/final",
    },
    {
      id: "archived-prototypes",
      label: "已归档",
      group: "生命周期",
      to: "/workbench/prototypes/archived",
    },
  ],
};

export const searchableNavigation = Object.values(secondaryNavigation).flat();

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
