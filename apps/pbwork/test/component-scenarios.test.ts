import { describe, expect, it } from "vitest";
import { componentRecords } from "@/design-system/components/registry";
import { componentScenarios } from "@/design-system/components/scenarios";

describe("component business scenarios", () => {
  it("provides at least two concrete scenarios for every component", () => {
    for (const component of componentRecords) {
      const scenarios = componentScenarios(component.id);
      expect(scenarios.length, component.id).toBeGreaterThanOrEqual(2);
      expect(
        scenarios.every((scenario) => scenario.description.length > 0),
      ).toBe(true);
    }
  });

  it("exposes the new interactive appearance controls", () => {
    const controlKeys = (id: string) =>
      componentRecords
        .find((item) => item.id === id)!
        .controls.map((item) => item.key);

    expect(controlKeys("button")).toEqual(
      expect.arrayContaining(["loading", "size", "radius", "elevation"]),
    );
    expect(controlKeys("icon-button")).toEqual(
      expect.arrayContaining(["loading", "variant", "radius", "elevation"]),
    );
    expect(controlKeys("tabs")).toEqual(
      expect.arrayContaining(["background", "activeStyle", "showIndicator"]),
    );
    expect(controlKeys("bottom-navigation")).toEqual(
      expect.arrayContaining(["display", "showIndicator"]),
    );
  });
});
