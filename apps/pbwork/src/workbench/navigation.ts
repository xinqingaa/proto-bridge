export type WorkbenchSectionId = "foundations" | "components" | "prototypes";

export type WorkbenchNavigationItem = {
  id: string;
  label: string;
  subtitle?: string;
  to: string;
};

export const primaryNavigation: Array<
  WorkbenchNavigationItem & { id: WorkbenchSectionId }
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
      subtitle: "颜色、字体、间距",
      to: "/workbench/foundations/tokens/colors",
    },
    {
      id: "themes",
      label: "主题",
      subtitle: "默认主题",
      to: "/workbench/foundations/themes/light",
    },
  ],
  components: [
    {
      id: "basic-components",
      label: "基础组件",
      subtitle: "通用控件",
      to: "/workbench/components/basic",
    },
    {
      id: "complex-components",
      label: "复杂组件",
      subtitle: "组合交互",
      to: "/workbench/components/complex",
    },
  ],
  prototypes: [
    {
      id: "all-prototypes",
      label: "全部原型",
      to: "/workbench/prototypes/all",
    },
    {
      id: "active-prototypes",
      label: "进行中",
      to: "/workbench/prototypes/active",
    },
    {
      id: "review-prototypes",
      label: "待确认",
      to: "/workbench/prototypes/review",
    },
    {
      id: "final-prototypes",
      label: "已定稿",
      to: "/workbench/prototypes/final",
    },
    {
      id: "archived-prototypes",
      label: "已归档",
      to: "/workbench/prototypes/archived",
    },
  ],
};

export const searchableNavigation = Object.values(secondaryNavigation).flat();

export function isWorkbenchSectionId(
  value: unknown,
): value is WorkbenchSectionId {
  return (
    value === "foundations" || value === "components" || value === "prototypes"
  );
}
