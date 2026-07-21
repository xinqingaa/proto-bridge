import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePlaygroundStore } from "@/app/stores/playground";

describe("playground session model", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("opens with first scenario, default highlight, no overrides", () => {
    const store = usePlaygroundStore();
    store.open("button");
    expect(store.scenarioId).toBeTruthy();
    expect(store.overrides).toEqual({});
    expect(store.highlightedPresetId).toBe("default");
    expect(store.resolvedProps.label).toBeTruthy();
  });

  it("applyPreset writes overrides and highlights that preset", () => {
    const store = usePlaygroundStore();
    store.open("button");
    const beforeLabel = store.resolvedProps.label;
    store.applyPreset("loading");
    expect(store.overrides).toEqual({ loading: true });
    expect(store.highlightedPresetId).toBe("loading");
    expect(store.resolvedProps.loading).toBe(true);
    expect(store.resolvedProps.label).toBe(beforeLabel);
  });

  it("keeps preset highlight when side edit does not break preset props", () => {
    const store = usePlaygroundStore();
    store.open("button");
    store.applyPreset("tonal");
    store.setOverride("label", "手动文案");
    expect(store.highlightedPresetId).toBe("tonal");
    expect(store.resolvedProps.variant).toBe("tonal");
    expect(store.resolvedProps.label).toBe("手动文案");
  });

  it("clears highlight when resolved matches no single preset", () => {
    const store = usePlaygroundStore();
    store.open("button");
    store.setOverride("label", "only-label");
    expect(store.highlightedPresetId).toBeNull();

    store.applyPreset("tonal");
    store.setOverride("loading", true);
    // tonal + loading both match → ambiguous
    expect(store.highlightedPresetId).toBeNull();
  });

  it("reset and default preset clear overrides", () => {
    const store = usePlaygroundStore();
    store.open("button");
    store.applyPreset("disabled");
    expect(store.highlightedPresetId).toBe("disabled");
    store.reset();
    expect(store.overrides).toEqual({});
    expect(store.highlightedPresetId).toBe("default");

    store.applyPreset("tonal");
    store.applyPreset("default");
    expect(store.overrides).toEqual({});
    expect(store.highlightedPresetId).toBe("default");
  });

  it("keeps scenario when applying a formal preset", () => {
    const store = usePlaygroundStore();
    store.open("button");
    const scenarios = store.scenarios;
    if (scenarios.length < 2) return;
    store.setScenario(scenarios[1]!.id);
    const scenarioLabel = store.resolvedProps.label;
    store.applyPreset("tonal");
    expect(store.scenarioId).toBe(scenarios[1]!.id);
    expect(store.resolvedProps.label).toBe(scenarioLabel);
    expect(store.resolvedProps.variant).toBe("tonal");
    expect(store.highlightedPresetId).toBe("tonal");
  });
});
