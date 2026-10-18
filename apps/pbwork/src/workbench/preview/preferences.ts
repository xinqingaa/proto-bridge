import { ref, watch } from "vue";
import { defineStore } from "pinia";
import {
  normalizePreviewSelection,
  type PreviewSelection,
  type PreviewContext,
} from "./model";
import type { ThemePackSource } from "@proto-bridge/core/v2";
const STORAGE_KEY = "pbwork:preview-preferences:v1";
type Preferences = {
  layout: "single" | "compare";
  sizeMode: "fit" | "actual" | "custom";
  scale: number;
  syncScroll: boolean;
  sourceMode: string;
  selections: Record<string, PreviewSelection>;
};
export const usePreviewPreferences = defineStore("preview-preferences", () => {
  const settings = ref<Preferences>({
    layout: "single",
    sizeMode: "fit",
    scale: 1,
    syncScroll: true,
    sourceMode: "light",
    selections: {},
  });
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved === "object") {
      if (
        typeof saved.sourceMode === "string" &&
        /^[a-z][a-z0-9-]*$/.test(saved.sourceMode)
      )
        settings.value.sourceMode = saved.sourceMode;
      if (typeof saved.syncScroll === "boolean")
        settings.value.syncScroll = saved.syncScroll;
      if (["single", "compare"].includes(saved.layout))
        settings.value.layout = saved.layout;
      if (["fit", "actual", "custom"].includes(saved.sizeMode))
        settings.value.sizeMode = saved.sizeMode;
      if (
        Number.isFinite(saved.scale) &&
        saved.scale >= 0.25 &&
        saved.scale <= 1.5
      )
        settings.value.scale = saved.scale;
      for (const id of ["A", "B"]) {
        const selection = saved.selections?.[id];
        if (
          selection &&
          [selection.contextId, selection.theme, selection.mode].every(
            (v) => typeof v === "string",
          )
        )
          settings.value.selections[id] = {
            contextId: selection.contextId,
            theme: selection.theme,
            mode: selection.mode,
          };
      }
    }
  } catch {
    /* Storage may be unavailable or contain an old invalid value. */
  }
  watch(
    settings,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* Keep the session usable without storage. */
      }
    },
    { deep: true, flush: "sync" },
  );
  function migrateSelections(
    aliases: readonly PreviewContext[],
    packs: ReadonlyMap<string, ThemePackSource>,
  ) {
    for (const [id, selection] of Object.entries(settings.value.selections)) {
      const normalized = normalizePreviewSelection(selection, aliases, packs);
      if (normalized.contextId !== selection.contextId)
        settings.value.selections[id] = normalized;
    }
  }
  return { settings, migrateSelections };
});
