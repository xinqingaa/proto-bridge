import type { ComponentRecord } from "@/design-system/types";

const radiusOptions = [
  { label: "SM (radius.sm)", value: "sm" },
  { label: "MD (radius.md)", value: "md" },
  { label: "LG (radius.lg)", value: "lg" },
  { label: "Full (radius.full)", value: "full" },
];

const toneOptions = [
  { label: "Primary (color.primary)", value: "primary" },
  { label: "Secondary (color.secondary)", value: "secondary" },
  { label: "Error (color.error)", value: "error" },
  { label: "Success (color.success)", value: "success" },
];

export const componentRecords = [
  {
    id: "button",
    label: "按钮",
    category: "basic",
    view: "basic/Button.vue",
    contract: "contracts/button.json",
    example: {},
    controls: [
      { key: "label", label: "文案", control: "text" },
      {
        key: "variant",
        label: "样式",
        control: "select",
        options: [
          { label: "Flat", value: "flat" },
          { label: "Tonal", value: "tonal" },
          { label: "Outlined", value: "outlined" },
          { label: "Text", value: "text" },
        ],
      },
      { key: "tone", label: "语义色", control: "select", options: toneOptions },
      {
        key: "radius",
        label: "圆角",
        control: "select",
        options: radiusOptions,
      },
      { key: "elevated", label: "阴影 (elevation.card)", control: "boolean" },
      { key: "disabled", label: "禁用", control: "boolean" },
    ],
  },
  {
    id: "icon-button",
    label: "图标按钮",
    category: "basic",
    view: "basic/IconButton.vue",
    contract: "contracts/icon-button.json",
    example: {},
    controls: [
      { key: "ariaLabel", label: "无障碍名称", control: "text" },
      {
        key: "icon",
        label: "图标",
        control: "select",
        options: [
          { label: "More", value: "more" },
          { label: "Plus", value: "plus" },
          { label: "Search", value: "search" },
          { label: "Settings", value: "settings" },
        ],
      },
      {
        key: "size",
        label: "尺寸",
        control: "select",
        options: [
          { label: "SM", value: "sm" },
          { label: "MD", value: "md" },
        ],
      },
      {
        key: "tone",
        label: "语义色",
        control: "select",
        options: [
          { label: "Neutral (color.on-surface)", value: "neutral" },
          { label: "Primary (color.primary)", value: "primary" },
          { label: "Secondary (color.secondary)", value: "secondary" },
        ],
      },
      { key: "elevated", label: "阴影 (elevation.card)", control: "boolean" },
      { key: "disabled", label: "禁用", control: "boolean" },
    ],
  },
  {
    id: "text-field",
    label: "文本框",
    category: "basic",
    view: "basic/TextField.vue",
    contract: "contracts/text-field.json",
    example: {},
    controls: [
      { key: "label", label: "标签", control: "text" },
      { key: "modelValue", label: "值", control: "text" },
      {
        key: "radius",
        label: "圆角",
        control: "select",
        options: radiusOptions.filter((item) => item.value !== "full"),
      },
      { key: "disabled", label: "禁用", control: "boolean" },
    ],
  },
  {
    id: "chip",
    label: "Chip",
    category: "basic",
    view: "basic/Chip.vue",
    contract: "contracts/chip.json",
    example: {},
    controls: [
      { key: "label", label: "文案", control: "text" },
      {
        key: "tone",
        label: "语义色",
        control: "select",
        options: [
          ...toneOptions,
          { label: "Warning (color.warning)", value: "warning" },
        ],
      },
      {
        key: "radius",
        label: "圆角",
        control: "select",
        options: radiusOptions,
      },
      { key: "elevated", label: "阴影 (elevation.card)", control: "boolean" },
    ],
  },
  {
    id: "card",
    label: "Card",
    category: "basic",
    view: "basic/Card.vue",
    contract: "contracts/card.json",
    example: {},
    controls: [
      { key: "title", label: "标题", control: "text" },
      { key: "subtitle", label: "副标题", control: "text" },
      {
        key: "radius",
        label: "圆角",
        control: "select",
        options: radiusOptions.filter((item) => item.value !== "full"),
      },
      { key: "elevated", label: "阴影 (elevation.card)", control: "boolean" },
    ],
  },
  {
    id: "app-bar",
    label: "App Bar",
    category: "complex",
    view: "complex/AppBar.vue",
    contract: "contracts/app-bar.json",
    example: {},
    controls: [
      { key: "title", label: "标题", control: "text" },
      { key: "dense", label: "紧凑", control: "boolean" },
      { key: "elevated", label: "阴影 (elevation.card)", control: "boolean" },
    ],
  },
  {
    id: "tabs",
    label: "Tabs",
    category: "complex",
    view: "complex/Tabs.vue",
    contract: "contracts/tabs.json",
    example: {},
    controls: [{ key: "modelValue", label: "当前 Tab", control: "text" }],
  },
  {
    id: "data-list",
    label: "Data List",
    category: "complex",
    view: "complex/DataList.vue",
    contract: "contracts/data-list.json",
    example: {},
    controls: [
      { key: "loading", label: "加载中", control: "boolean" },
      { key: "emptyText", label: "空态文案", control: "text" },
      {
        key: "radius",
        label: "圆角",
        control: "select",
        options: radiusOptions.filter((item) => item.value !== "full"),
      },
      { key: "elevated", label: "阴影 (elevation.card)", control: "boolean" },
    ],
  },
  {
    id: "bottom-sheet",
    label: "Bottom Sheet",
    category: "complex",
    view: "complex/BottomSheet.vue",
    contract: "contracts/bottom-sheet.json",
    example: {},
    controls: [
      { key: "title", label: "标题", control: "text" },
      { key: "modelValue", label: "打开", control: "boolean" },
    ],
  },
] satisfies ComponentRecord[];
