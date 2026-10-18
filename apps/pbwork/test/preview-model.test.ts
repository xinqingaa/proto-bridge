import { describe, expect, it } from "vitest";
import {
  ThemePackSource,
  type ResolvedThemeTable,
} from "@proto-bridge/core/v2";
import { loadBaseThemeSources } from "@/design-system/theme/sources";
import {
  createRuntimeThemeRegistry,
  resolveRuntimeTheme,
  runtimeThemeSources,
} from "@/design-system/theme/runtime-theme";
import {
  fitPreviewScale,
  resolvePreviewDevice,
  previewContexts,
  defaultPreviewSelection,
  previewSelectionError,
  previewAlternatives,
  createPreviewDevice,
  deviceViewportCss,
  comparePreviewTables,
} from "@/workbench/preview/model";

describe("Workbench preview boundaries", () => {
  it("fits full logical devices within the measured stage and rejects invalid selections without fallback", () => {
    const single = fitPreviewScale(680, 640, 1, 390, 844);
    const double = fitPreviewScale(450, 640, 2, 390, 844);
    expect(single * 844 + 24).toBeLessThanOrEqual(640);
    expect(2 * (double * 390 + 24) + 16).toBeLessThanOrEqual(450);
    expect(double).toBeLessThan(single);
    expect(fitPreviewScale(2000, 2000, 1, 390, 844)).toBe(1);
    expect(fitPreviewScale(0, 0, 1, 390, 844)).toBe(0.72);
    const contexts = previewContexts(runtimeThemeSources.packs, []);
    const device = createPreviewDevice("A", {
      contextId: contexts[0]!.id,
      theme: "missing",
      mode: "light",
    });
    expect(
      resolvePreviewDevice(
        device,
        contexts,
        runtimeThemeSources.packs,
        resolveRuntimeTheme,
      ),
    ).toMatchObject({ table: undefined, error: "主题不存在：missing" });
  });
  it("derives multiple prototype bindings without inventing their packs or deduplicating owners", () => {
    const sources = loadBaseThemeSources();
    const custom = ThemePackSource.parse({
      manifest: {
        schemaVersion: 1,
        id: "fixture",
        scope: "prototype",
        extends: "pbwork-base",
        label: "Fixture",
        themes: [
          { id: "brand", label: "Brand" },
          { id: "alternate", label: "Alternate" },
        ],
        defaultTheme: "brand",
        modes: ["light", "dark"],
        defaultMode: "light",
      },
      ownerPrototypeId: "fixture",
      semantic: { values: { "radius.control": 18 } },
    });
    sources.packs.set("fixture", custom);
    const contexts = previewContexts(sources.packs, [
      { id: "first", label: "First", themePackId: "pbwork-base" },
      { id: "fixture", label: "Fixture", themePackId: "fixture" },
      { id: "broken", label: "Broken", themePackId: "missing" },
    ]);
    expect(contexts.map((c) => c.id)).toEqual([
      "foundation:pbwork-base",
      "prototype:first",
      "prototype:fixture",
      "prototype:broken",
    ]);
    const selection = defaultPreviewSelection(contexts[2]!, sources.packs);
    expect(selection).toEqual({
      contextId: "prototype:fixture",
      theme: "brand",
      mode: "light",
    });
    const table = createRuntimeThemeRegistry(sources).resolve(
      "fixture",
      selection.theme,
      selection.mode,
    );
    expect(table.values["radius.control"]).toBe(18);
    expect(
      previewAlternatives(contexts, sources.packs).filter(
        (s) => s.contextId === "prototype:fixture",
      ),
    ).toHaveLength(4);
    expect(
      previewSelectionError(
        { ...selection, theme: "missing" },
        contexts,
        sources.packs,
      ),
    ).toContain("主题不存在");
    expect(
      previewSelectionError(
        { ...selection, mode: "system" },
        contexts,
        sources.packs,
      ),
    ).toContain("模式不存在");
    expect(
      previewSelectionError(
        { ...selection, contextId: "prototype:broken" },
        contexts,
        sources.packs,
      ),
    ).toContain("主题包不存在");
    expect(
      previewSelectionError(
        { ...selection, contextId: "missing" },
        contexts,
        sources.packs,
      ),
    ).toContain("来源不存在");
  });

  it("offers no prototype controls without registered prototypes; samples are explicit", () => {
    const base = loadBaseThemeSources();
    expect(previewContexts(base.packs, [])).toHaveLength(1);
    expect(
      previewContexts(runtimeThemeSources.packs, []).find(
        (c) => c.kind === "sample",
      )?.label,
    ).toContain("仅演示");
  });

  it("copies the current demonstration while keeping theme, state and overlay ownership independent", () => {
    const first = createPreviewDevice("A", {
      contextId: "foundation:pbwork-base",
      theme: "default",
      mode: "light",
    });
    first.demo.open = true;
    first.demo.detent = "medium";
    const second = createPreviewDevice("B", first.selection, first.demo);
    expect(second.demo).toEqual(first.demo);
    second.selection.mode = "dark";
    second.demo.open = false;
    second.demo.detent = "expanded";
    expect(first.selection.mode).toBe("light");
    expect(first.demo).toMatchObject({ open: true, detent: "medium" });
  });

  it("adapts viewport CSS without mutating Core theme tables or source CSS", () => {
    const table = resolveRuntimeTheme("pbwork-base", "default", "light");
    const before = JSON.stringify(table);
    const css = {
      panel: "50dvh",
      wide: "calc(100vw - 2px)",
      shadow: "0 2px 4px #000",
    };
    expect(deviceViewportCss(css)).toEqual({
      panel: "50cqh",
      wide: "calc(100cqw - 2px)",
      shadow: css.shadow,
    });
    expect(css.panel).toBe("50dvh");
    expect(JSON.stringify(table)).toBe(before);
  });

  it("counts final differences by key and retains authored/inherited provenance separately", () => {
    const base = resolveRuntimeTheme("pbwork-base", "default", "light");
    const sample = resolveRuntimeTheme("pbwork-sample", "garden", "light");
    const rows = comparePreviewTables(sample, base);
    expect(rows).toHaveLength(Object.keys(sample.values).length);
    expect(rows.filter((r) => r.changed).length).toBeGreaterThan(0);
    const inherited = rows.find((r) => r.source?.inherited);
    expect(inherited?.source).toEqual(sample.provenance[inherited!.key]);
    const reordered: ResolvedThemeTable = {
      ...base,
      values: {
        ...base.values,
        "typography.title": Object.fromEntries(
          Object.entries(base.values["typography.title"] as object).reverse(),
        ) as ResolvedThemeTable["values"][string],
      },
    };
    expect(
      comparePreviewTables(reordered, base).filter((r) => r.changed),
    ).toHaveLength(0);
    expect(rows.some((r) => r.key.startsWith("layout."))).toBe(false);
  });
});
