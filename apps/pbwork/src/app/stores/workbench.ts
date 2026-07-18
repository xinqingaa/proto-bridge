import { defineStore } from "pinia";

export type WorkbenchTheme = "pbworkLight" | "pbworkDark";

const storageKey = "pbwork.workbench.theme.v1";

function readTheme(): WorkbenchTheme {
  if (typeof window === "undefined") return "pbworkLight";
  return window.localStorage.getItem(storageKey) === "pbworkDark"
    ? "pbworkDark"
    : "pbworkLight";
}

export const useWorkbenchStore = defineStore("workbench", {
  state: () => ({
    theme: readTheme() as WorkbenchTheme,
    resourcePanelOpen: true,
    inspectorOpen: true,
  }),
  actions: {
    toggleResourcePanel() {
      this.resourcePanelOpen = !this.resourcePanelOpen;
    },
    toggleInspector() {
      this.inspectorOpen = !this.inspectorOpen;
    },
    toggleTheme() {
      this.theme = this.theme === "pbworkLight" ? "pbworkDark" : "pbworkLight";
      window.localStorage.setItem(storageKey, this.theme);
    },
  },
});
