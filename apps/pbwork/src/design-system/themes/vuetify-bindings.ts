import type { VuetifyThemeBindings } from "@/design-system/types";

/** Maps Vuetify semantic colors to design-system Token IDs (values live in tokens). */
export const vuetifyThemeBindings = {
  background: "color.background",
  surface: "color.surface",
  primary: "color.primary",
  secondary: "color.secondary",
  error: "color.error",
  info: "color.info",
  success: "color.success",
  warning: "color.warning",
} as const satisfies VuetifyThemeBindings;
