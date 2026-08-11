import type { VuetifyThemeBindings } from "@/design-system/types";

/** Maps Vuetify semantic colors to design-system Token IDs (values live in tokens). */
export const vuetifyThemeBindings = {
  background: "color.background",
  surface: "color.surface",
  primary: "color.primary",
  "primary-soft": "color.primary-soft",
  secondary: "color.secondary",
  error: "color.error",
  info: "color.info",
  success: "color.success",
  warning: "color.warning",
  "on-background": "color.on-background",
  "on-surface": "color.on-surface",
  "surface-variant": "color.surface-variant",
  "on-surface-variant": "color.on-surface",
  "on-primary": "color.on-primary",
  action: "color.action",
  "on-action": "color.on-action",
  "on-secondary": "color.on-secondary",
  "on-error": "color.on-error",
  "on-success": "color.on-success",
  "on-warning": "color.on-warning",
  "on-info": "color.on-info",
  tooltip: "color.action",
  "on-tooltip": "color.on-action",
} as const satisfies VuetifyThemeBindings;
