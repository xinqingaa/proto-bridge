import { describe, expect, it } from "vitest";
import { componentRecords } from "@/design-system/components/registry";
import { componentScenarios } from "@/design-system/components/scenarios";

/** Playground must not expose free appearance knobs (radius / elevation level). */
const forbiddenControlKeys = new Set(["radius", "elevation"]);

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

  it("exposes content, type, and behavior controls without token knobs", () => {
    const controlKeys = (id: string) =>
      componentRecords
        .find((item) => item.id === id)!
        .controls.map((item) => item.key);

    for (const component of componentRecords) {
      for (const key of controlKeys(component.id)) {
        expect(
          forbiddenControlKeys.has(key),
          `${component.id} must not expose control "${key}"`,
        ).toBe(false);
      }
    }

    expect(controlKeys("button")).toEqual(
      expect.arrayContaining(["loading", "size", "variant", "tone"]),
    );
    expect(controlKeys("icon-button")).toEqual(
      expect.arrayContaining(["loading", "variant", "tone", "size"]),
    );
    expect(controlKeys("tabs")).toEqual(
      expect.arrayContaining([
        "size",
        "showDivider",
        "grow",
        "mouseSwipe",
      ]),
    );
    expect(controlKeys("tabs")).not.toEqual(
      expect.arrayContaining([
        "selectionStyle",
        "variant",
        "background",
        "activeColor",
        "inactiveColor",
        "activeBackground",
        "typography",
      ]),
    );
    expect(controlKeys("underline-tabs")).toEqual(
      expect.arrayContaining([
        "variant",
        "showIndicator",
        "showDivider",
        "grow",
        "mouseSwipe",
      ]),
    );
    expect(controlKeys("underline-tabs")).not.toEqual(
      expect.arrayContaining([
        "selectionStyle",
        "background",
        "activeColor",
        "inactiveColor",
        "activeBackground",
        "typography",
      ]),
    );
    expect(controlKeys("bottom-navigation")).toEqual(
      expect.arrayContaining(["display", "showIndicator"]),
    );
    expect(controlKeys("bottom-navigation")).not.toEqual(
      expect.arrayContaining(["showView", "mouseSwipe", "viewHeight"]),
    );
    expect(controlKeys("scrollable-data-list")).toEqual(
      expect.arrayContaining(["pullRefresh", "loadMore", "hasMore"]),
    );
    expect(controlKeys("bottom-navigation")).not.toContain("viewHeight");
    expect(controlKeys("card")).not.toContain("radius");
    expect(controlKeys("select")).not.toContain("radius");
  });
});
