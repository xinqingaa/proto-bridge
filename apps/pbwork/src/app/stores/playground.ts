import { defineStore } from "pinia";
import { loadComponentContract } from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import {
  componentScenarios,
  type ComponentScenario,
} from "@/design-system/components/scenarios";
import type {
  ComponentContract,
  ComponentRecord,
  ComponentStateContract,
} from "@/design-system/types";

export type PlaygroundThemeId = "light" | "dark";

/** Toolbar preset id: synthetic default or a contract state id. */
export type PlaygroundPresetId = "default" | (string & {});

function shallowEqualProp(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function mergeLayers(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const layer of layers) {
    if (!layer) continue;
    Object.assign(result, layer);
  }
  return result;
}

function propsMatchPreset(
  resolved: Record<string, unknown>,
  presetProps: Record<string, unknown>,
): boolean {
  return Object.entries(presetProps).every(([key, value]) =>
    shallowEqualProp(resolved[key], value),
  );
}

/**
 * Playground session:
 * resolvedProps = defaultProps ⊕ example ⊕ scenario ⊕ overrides
 *
 * Toolbar buttons are presets that write overrides. Highlight is derived:
 * a preset lights up only when resolved still matches its props.
 * Zero or multiple formal matches → no highlight.
 * Empty overrides → always highlight "default".
 */
export const usePlaygroundStore = defineStore("playground", {
  state: () => ({
    componentId: null as string | null,
    scenarioId: "" as string,
    themeId: "light" as PlaygroundThemeId,
    overrides: {} as Record<string, unknown>,
  }),
  getters: {
    record(): ComponentRecord | undefined {
      if (!this.componentId) return undefined;
      return componentRecords.find((item) => item.id === this.componentId);
    },
    contract(): ComponentContract | undefined {
      const record = this.record;
      return record ? loadComponentContract(record.contract) : undefined;
    },
    scenarios(): ComponentScenario[] {
      if (!this.componentId) return [];
      return componentScenarios(this.componentId);
    },
    selectedScenario(): ComponentScenario | undefined {
      return (
        this.scenarios.find((item) => item.id === this.scenarioId) ??
        this.scenarios[0]
      );
    },
    states(): ComponentStateContract[] {
      return this.contract?.states ?? [];
    },
    /** Scenario baseline without side overrides. */
    baselineProps(): Record<string, unknown> {
      return mergeLayers(
        this.contract?.defaultProps,
        this.record?.example,
        this.selectedScenario?.props,
      );
    },
    /** Sole source of truth for preview + side controls. */
    resolvedProps(): Record<string, unknown> {
      return mergeLayers(this.baselineProps, this.overrides);
    },
    /** Alias used by existing call sites. */
    props(): Record<string, unknown> {
      return this.resolvedProps;
    },
    /**
     * Derived toolbar highlight. null when none or multiple formal presets match.
     */
    highlightedPresetId(): PlaygroundPresetId | null {
      if (Object.keys(this.overrides).length === 0) return "default";

      const resolved = this.resolvedProps;
      const formalMatched = this.states.filter((state) =>
        propsMatchPreset(resolved, state.props ?? {}),
      );

      if (formalMatched.length === 1) return formalMatched[0]!.id;

      const matchesBaseline = Object.entries(this.overrides).every(
        ([key, value]) => shallowEqualProp(value, this.baselineProps[key]),
      );
      if (formalMatched.length === 0 && matchesBaseline) return "default";

      return null;
    },
  },
  actions: {
    open(componentId: string) {
      const record = componentRecords.find((item) => item.id === componentId);
      if (!record) return;
      const scenarios = componentScenarios(componentId);
      this.componentId = componentId;
      this.scenarioId = scenarios[0]?.id ?? "default";
      this.themeId = "light";
      this.overrides = {};
    },

    setScenario(scenarioId: string) {
      if (!this.scenarios.some((item) => item.id === scenarioId)) return;
      this.scenarioId = scenarioId;
      this.overrides = {};
    },

    /** Apply a toolbar preset (replaces overrides). */
    applyPreset(presetId: PlaygroundPresetId) {
      if (presetId === "default") {
        this.overrides = {};
        return;
      }
      const state = this.states.find((item) => item.id === presetId);
      if (!state) return;
      this.overrides = { ...(state.props ?? {}) };
    },

    /** @deprecated Prefer applyPreset. */
    setState(stateId: string) {
      this.applyPreset(stateId);
    },

    setTheme(themeId: PlaygroundThemeId) {
      this.themeId = themeId;
    },

    setOverride(key: string, value: unknown) {
      const next = { ...this.overrides };
      if (shallowEqualProp(this.baselineProps[key], value)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      this.overrides = next;
    },

    /** @deprecated Prefer setOverride. */
    setProp(key: string, value: unknown) {
      this.setOverride(key, value);
    },

    reset() {
      this.overrides = {};
    },
  },
});
