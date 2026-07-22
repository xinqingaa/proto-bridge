import type { ThemeDefinition } from "vuetify";

/**
 * PBWork's authoring shell is deliberately independent from prototype tokens.
 * Product themes can now evolve without recoloring navigation and inspector UI.
 *
 * Accent candidates kept for visual review (2026-07-22):
 * A / selected: clear cool blue #2F73D2
 * B: cool blue-violet #4964D1
 * C: bright system blue #1672E8
 */
export const workbenchThemes: Record<string, ThemeDefinition> = {
  workbenchLight: {
    dark: false,
    colors: {
      background: "#f6f7f8",
      surface: "#ffffff",
      "surface-variant": "#f0f2f4",
      "on-surface-variant": "#34373c",
      primary: "#2f73d2",
      secondary: "#666b73",
      error: "#b44a42",
      info: "#397bc1",
      success: "#39715a",
      warning: "#87651c",
      "on-background": "#1d1f23",
      "on-surface": "#1d1f23",
      "on-primary": "#ffffff",
      "on-secondary": "#ffffff",
      "on-error": "#ffffff",
      "on-success": "#ffffff",
      "on-warning": "#ffffff",
      "on-info": "#ffffff",
      action: "#202124",
      "on-action": "#ffffff",
      tooltip: "#303236",
      "on-tooltip": "#ffffff",
    },
  },
  workbenchDark: {
    dark: true,
    colors: {
      background: "#141517",
      surface: "#1c1e21",
      "surface-variant": "#24272b",
      "on-surface-variant": "#d7dbe0",
      primary: "#83b2f2",
      secondary: "#a9afb7",
      error: "#d47a73",
      info: "#79aee0",
      success: "#7fb197",
      warning: "#d0ad62",
      "on-background": "#f2f3f5",
      "on-surface": "#f2f3f5",
      "on-primary": "#17181a",
      "on-secondary": "#17181a",
      "on-error": "#17181a",
      "on-success": "#17181a",
      "on-warning": "#17181a",
      "on-info": "#17181a",
      action: "#f1f3f4",
      "on-action": "#17181a",
      tooltip: "#eef0f2",
      "on-tooltip": "#202124",
    },
  },
};
