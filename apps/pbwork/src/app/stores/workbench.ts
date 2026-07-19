import { defineStore } from "pinia";

export type WorkbenchTheme = "pbworkLight" | "pbworkDark";

const themeKey = "pbwork.workbench.theme.v1";
const layoutKey = "pbwork.workbench.layout.v1";

export const COLLAPSED_PANEL_WIDTH = 56;
export const DEFAULT_RESOURCE_WIDTH = 264;
export const DEFAULT_INSPECTOR_WIDTH = 360;
export const MIN_INSPECTOR_WIDTH = 280;
export const MAX_INSPECTOR_WIDTH = 520;

type LayoutPrefs = {
  resourcePanelOpen?: boolean;
  inspectorOpen?: boolean;
  inspectorWidth?: number;
};

function readTheme(): WorkbenchTheme {
  if (typeof window === "undefined") return "pbworkLight";
  return window.localStorage.getItem(themeKey) === "pbworkDark"
    ? "pbworkDark"
    : "pbworkLight";
}

function clampInspectorWidth(width: number): number {
  return Math.min(MAX_INSPECTOR_WIDTH, Math.max(MIN_INSPECTOR_WIDTH, width));
}

function readLayout(): Required<LayoutPrefs> {
  const fallback = {
    resourcePanelOpen: true,
    inspectorOpen: true,
    inspectorWidth: DEFAULT_INSPECTOR_WIDTH,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(layoutKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as LayoutPrefs;
    return {
      resourcePanelOpen: parsed.resourcePanelOpen ?? fallback.resourcePanelOpen,
      inspectorOpen: parsed.inspectorOpen ?? fallback.inspectorOpen,
      inspectorWidth: clampInspectorWidth(
        typeof parsed.inspectorWidth === "number"
          ? parsed.inspectorWidth
          : fallback.inspectorWidth,
      ),
    };
  } catch {
    return fallback;
  }
}

export const useWorkbenchStore = defineStore("workbench", {
  state: () => {
    const layout = readLayout();
    return {
      theme: readTheme() as WorkbenchTheme,
      resourcePanelOpen: layout.resourcePanelOpen,
      inspectorOpen: layout.inspectorOpen,
      inspectorWidth: layout.inspectorWidth,
    };
  },
  getters: {
    resourcePanelWidth(): number {
      return this.resourcePanelOpen
        ? DEFAULT_RESOURCE_WIDTH
        : COLLAPSED_PANEL_WIDTH;
    },
    inspectorPanelWidth(): number {
      return this.inspectorOpen ? this.inspectorWidth : COLLAPSED_PANEL_WIDTH;
    },
  },
  actions: {
    persistLayout() {
      if (typeof window === "undefined") return;
      const payload: Required<LayoutPrefs> = {
        resourcePanelOpen: this.resourcePanelOpen,
        inspectorOpen: this.inspectorOpen,
        inspectorWidth: this.inspectorWidth,
      };
      window.localStorage.setItem(layoutKey, JSON.stringify(payload));
    },
    toggleResourcePanel() {
      this.resourcePanelOpen = !this.resourcePanelOpen;
      this.persistLayout();
    },
    toggleInspector() {
      this.inspectorOpen = !this.inspectorOpen;
      this.persistLayout();
    },
    setInspectorWidth(width: number) {
      this.inspectorWidth = clampInspectorWidth(width);
      this.persistLayout();
    },
    toggleTheme() {
      this.theme = this.theme === "pbworkLight" ? "pbworkDark" : "pbworkLight";
      window.localStorage.setItem(themeKey, this.theme);
    },
  },
});
