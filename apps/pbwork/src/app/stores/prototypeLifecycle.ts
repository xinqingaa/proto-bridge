import { defineStore } from "pinia";
import type { PrototypeLifecycle, PrototypeRecord } from "@/design-system/types";

const STORAGE_KEY = "pbwork.prototype-lifecycle.v1";

export const lifecycleTransitions: Record<PrototypeLifecycle, PrototypeLifecycle[]> = {
  active: ["review"],
  review: ["active", "final"],
  final: ["review", "archived"],
  archived: ["active"],
};

export type LifecycleHistoryEntry = {
  id: string;
  prototypeId: string;
  from: PrototypeLifecycle;
  to: PrototypeLifecycle;
  note: string;
  changedAt: string;
};

type LifecycleState = {
  overrides: Record<string, PrototypeLifecycle>;
  history: LifecycleHistoryEntry[];
};

function isLifecycle(value: unknown): value is PrototypeLifecycle {
  return value === "active" || value === "review" || value === "final" || value === "archived";
}

function loadState(): LifecycleState {
  if (typeof window === "undefined") return { overrides: {}, history: [] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (!parsed || typeof parsed !== "object") return { overrides: {}, history: [] };
    const candidate = parsed as Partial<LifecycleState>;
    const overrides = Object.fromEntries(
      Object.entries(candidate.overrides ?? {}).filter(([, value]) => isLifecycle(value)),
    ) as Record<string, PrototypeLifecycle>;
    const history = Array.isArray(candidate.history)
      ? candidate.history.filter((entry): entry is LifecycleHistoryEntry => {
          if (!entry || typeof entry !== "object") return false;
          const item = entry as Partial<LifecycleHistoryEntry>;
          return typeof item.id === "string" && typeof item.prototypeId === "string" &&
            isLifecycle(item.from) && isLifecycle(item.to) && typeof item.note === "string" &&
            typeof item.changedAt === "string";
        })
      : [];
    return { overrides, history };
  } catch {
    return { overrides: {}, history: [] };
  }
}

export const usePrototypeLifecycleStore = defineStore("prototypeLifecycle", {
  state: loadState,
  getters: {
    effectiveLifecycle: (state) => (prototype: PrototypeRecord): PrototypeLifecycle =>
      state.overrides[prototype.id] ?? prototype.lifecycle,
    hasOverride: (state) => (prototypeId: string): boolean =>
      Object.hasOwn(state.overrides, prototypeId),
    historyFor: (state) => (prototypeId: string): LifecycleHistoryEntry[] =>
      state.history.filter((entry) => entry.prototypeId === prototypeId),
  },
  actions: {
    persist() {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        overrides: this.overrides,
        history: this.history,
      }));
    },
    transition(prototype: PrototypeRecord, to: PrototypeLifecycle, note = "") {
      const from = this.effectiveLifecycle(prototype);
      if (!lifecycleTransitions[from].includes(to)) {
        throw new Error(`不允许从 ${from} 流转到 ${to}`);
      }
      this.overrides = { ...this.overrides, [prototype.id]: to };
      this.history = [{
        id: `${prototype.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prototypeId: prototype.id,
        from,
        to,
        note: note.trim(),
        changedAt: new Date().toISOString(),
      }, ...this.history].slice(0, 500);
      this.persist();
    },
    reset(prototype: PrototypeRecord) {
      if (!this.hasOverride(prototype.id)) return;
      const overrides = { ...this.overrides };
      delete overrides[prototype.id];
      this.overrides = overrides;
      this.persist();
    },
  },
});
