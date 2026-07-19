import { describe, expect, it } from "vitest";
import { validateRegistries } from "@/design-system/validateRegistries";
import { loadTokens, loadThemes } from "@/design-system/loaders";
import { resolveThemeTokens } from "@/design-system/resolveThemeTokens";
import { componentRecords } from "@/design-system/components/registry";
import {
  prototypes,
  prototypeScreens,
} from "@/prototypes/registry";
import { buildCanonicalRuntimeUrl, resolveRuntimeRoute } from "@/runtime/url";

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

describe("runtime url", () => {
  it("builds canonical urls and resolves known routes", () => {
    const href = buildCanonicalRuntimeUrl({
      prototypeId: "project",
      screenSlug: "task-list",
      variantId: "empty",
      themeId: "dark",
    });
    expect(href).toBe(
      "/prototype/project/task-list?variant=empty&theme=dark",
    );

    const resolved = resolveRuntimeRoute({
      prototypeId: "project",
      screenSlug: "task-list",
      searchParams: new URLSearchParams("variant=empty&theme=dark"),
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.variant.id).toBe("empty");
      expect(resolved.theme.id).toBe("dark");
    }
  });

  it("rejects unknown screens", () => {
    const resolved = resolveRuntimeRoute({
      prototypeId: "project",
      screenSlug: "missing",
      searchParams: new URLSearchParams("theme=light"),
    });
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe("UNKNOWN_SCREEN");
  });
});
