import type { TokenCategory } from "@/design-system/types";

export type TokenCategoryMeta = {
  label: string;
  description: string;
};

/** Per-category copy for Foundations token pages (mirrors component record descriptions). */
export const TOKEN_CATEGORY_META: Record<TokenCategory, TokenCategoryMeta> = {
  color: {
    label: "颜色",
    description:
      "表面、品牌与反馈语义色。组件契约应优先绑定 Core 色；扩展色供浏览与实验。",
  },
  typography: {
    label: "字体",
    description:
      "标题到说明的字重与字号组合。Core 覆盖组件常见层级，其余为展示或稀有样式。",
  },
  spacing: {
    label: "间距",
    description: "布局与组件内边距阶梯。Core 间距是契约绑定的常用刻度。",
  },
  sizing: {
    label: "尺寸",
    description: "控件高度、图标与触控目标等固定尺寸，保证交互区域一致。",
  },
  radius: {
    label: "圆角",
    description: "从微圆到全圆的圆角阶梯，用于卡片、输入与按钮等表面。",
  },
  border: {
    label: "边框",
    description: "描边宽度等结构线令牌，配合颜色令牌表达分隔与轮廓。",
  },
  elevation: {
    label: "阴影",
    description: "表面抬升层级，用阴影表达卡片、浮层与强调块的深度。",
  },
  opacity: {
    label: "透明度",
    description: "遮罩与禁用等场景的透明度阶梯，避免硬编码 alpha。",
  },
  motion: {
    label: "动效",
    description: "时长与缓动曲线，统一组件过渡节奏。",
  },
};

export function tokenCategoryLabel(category: TokenCategory): string {
  return TOKEN_CATEGORY_META[category].label;
}

export function tokenCategoryDescription(category: TokenCategory): string {
  return TOKEN_CATEGORY_META[category].description;
}
