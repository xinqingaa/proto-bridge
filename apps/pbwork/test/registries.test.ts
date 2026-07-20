import { describe, expect, it } from "vitest";
import { validateRegistries } from "@/design-system/validateRegistries";
import { loadTokens, loadThemes } from "@/design-system/loaders";
import { resolveThemeTokens } from "@/design-system/resolveThemeTokens";
import { componentRecords } from "@/design-system/components/registry";
import {
  prototypes,
  prototypeScreens,
} from "@/prototypes/registry";

describe("registries", () => {
  it("accepts the shipped registries", () => {
    expect(validateRegistries()).toEqual([]);
  });

  it("rejects unknown theme token overrides", () => {
    const themes = loadThemes().map((theme) =>
      theme.id === "light"
        ? {
            ...theme,
            overrides: { ...theme.overrides, "color.missing": "#000" },
          }
        : theme,
    );
    const errors = validateRegistries({ themes });
    expect(
      errors.some(
        (error) =>
          error.resourceType === "theme" &&
          error.message.includes("unknown token"),
      ),
    ).toBe(true);
  });

  it("rejects duplicate screen ids and bad screenId formula", () => {
    const screens = [
      ...prototypeScreens,
      {
        ...prototypeScreens[0]!,
        screenId: "broken.id",
      },
    ];
    const errors = validateRegistries({
      screens: screens as typeof prototypeScreens,
    });
    expect(errors.some((error) => error.keyword === "const")).toBe(true);
  });

  it("resolves theme tokens with overrides", () => {
    const light = resolveThemeTokens("light");
    const dark = resolveThemeTokens("dark");
    expect(light["color.primary"]).toBe("#2563eb");
    expect(dark["color.primary"]).toBe("#7aa7ff");
    expect(Object.keys(light).length).toBe(loadTokens().length);
  });
});

describe("design contracts", () => {
  it("ships the fixed component sample set", () => {
    expect(componentRecords.filter((item) => item.category === "basic")).toHaveLength(
      5,
    );
    expect(
      componentRecords.filter((item) => item.category === "complex"),
    ).toHaveLength(4);
  });

  it("ships project collaboration screens and variants", () => {
    expect(prototypes[0]?.id).toBe("project");
    const list = prototypeScreens.find(
      (item) => item.screenId === "project.task-list",
    );
    const detail = prototypeScreens.find(
      (item) => item.screenId === "project.task-detail",
    );
    expect(list?.variants.map((item) => item.id)).toEqual([
      "default",
      "loading",
      "empty",
    ]);
    expect(detail?.variants.map((item) => item.id)).toEqual([
      "overview",
      "activity",
      "error",
      "sheet-open",
    ]);
  });
});

describe("resolveLiveTokenBindings", () => {
  it("updates radius, tone, and elevation from live props", async () => {
    const { resolveLiveTokenBindings } = await import(
      "@/design-system/resolveLiveTokenBindings"
    );
    const live = resolveLiveTokenBindings(
      {
        background: "color.primary",
        radius: "radius.md",
        elevation: "elevation.card",
        typography: "typography.content",
      },
      { tone: "error", radius: "lg", elevated: false },
    );
    expect(live.background).toBe("color.error");
    expect(live.radius).toBe("radius.lg");
    expect(live.elevation).toBe("none");
    expect(live.typography).toBe("typography.content");
  });

  it("keeps soft background tokens when tone changes", async () => {
    const { resolveLiveTokenBindings } = await import(
      "@/design-system/resolveLiveTokenBindings"
    );
    const live = resolveLiveTokenBindings(
      {
        background: "color.primary-soft",
        color: "color.primary",
        radius: "radius.full",
      },
      { tone: "success" },
    );
    expect(live.background).toBe("color.success-soft");
    expect(live.color).toBe("color.success");
  });
});
