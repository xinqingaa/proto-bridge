import { describe, expect, it } from "vitest";
import { resolveThemePack, type ThemeKeyCatalog } from "@proto-bridge/core/v2";
import { themeTableToCssVars } from "@/design-system/theme/css-vars";
import { loadBaseThemeSources } from "@/design-system/theme/sources";

const sources = loadBaseThemeSources();
const table = resolveThemePack({
  ...sources,
  packId: "pbwork-base",
  mode: "light",
}).table!;

describe("theme CSS generation", () => {
  it("formats registered types, typography parts, numeric roles and constants", () => {
    const css = themeTableToCssVars(
      table,
      sources.keyCatalog,
      sources.constants,
    );
    expect(css["--pb-size-control"]).toBe("40px");
    expect(css["--pb-spacing-lg-plus"]).toBe("40px");
    expect(css["--pb-motion-duration-short"]).toBe("120ms");
    expect(css["--pb-opacity-disabled"]).toBe("0.38");
    expect(css["--pb-typography-title-weight"]).toBe("650");
    expect(css["--pb-typography-title"]).toBe(
      '650 20px/1.3 system-ui, -apple-system, "PingFang SC", sans-serif',
    );
    expect(css["--pb-typography-numeric-title-variant-numeric"]).toBe(
      "tabular-nums",
    );
    expect(css["--pb-typography-title-variant-numeric"]).toBe("normal");
    expect(css["--pb-border-default"]).toBe("1px solid #dde1e6");
    expect(css["--pb-layout-fill"]).toBe("100%");
    expect(css["--pb-asset-brand-mark"]).toBe("none");
  });

  it("assigns units by valueType even when the key has no length prefix", () => {
    const catalog: ThemeKeyCatalog = {
      schemaVersion: 1,
      contrastPairs: [],
      keys: [
        {
          id: "sample",
          tier: "semantic",
          valueType: "length",
          bindable: true,
          modeVariant: false,
        },
      ],
    };
    const custom = {
      ...table,
      values: { sample: 18 },
      provenance: {},
      constants: {},
    };
    expect(
      themeTableToCssVars(custom, catalog, { schemaVersion: 1, constants: [] })[
        "--pb-sample"
      ],
    ).toBe("18px");
  });

  it("requires asset URLs to come from the owning pack loader", () => {
    const asset = {
      file: "assets/mark.svg",
      mediaType: "image/svg+xml",
      alt: "Mark",
      packId: "sample",
    };
    const custom = {
      ...table,
      values: { ...table.values, "asset.brand-mark": asset },
    };
    expect(() =>
      themeTableToCssVars(custom, sources.keyCatalog, sources.constants),
    ).toThrow("THEME_ASSET_URL_MISSING");
    const css = themeTableToCssVars(
      custom,
      sources.keyCatalog,
      sources.constants,
      (pack, file) => `/${pack}/${file}`,
    );
    expect(css["--pb-asset-brand-mark"]).toBe('url("/sample/assets/mark.svg")');
  });

  it("rejects ambiguous CSS variable names", () => {
    const key = {
      tier: "semantic",
      valueType: "number",
      bindable: true,
      modeVariant: false,
    } as const;
    const catalog: ThemeKeyCatalog = {
      schemaVersion: 1,
      contrastPairs: [],
      keys: [
        { id: "sample.key", ...key },
        { id: "sample-key", ...key },
      ],
    };
    const custom = {
      ...table,
      values: { "sample.key": 1, "sample-key": 2 },
      provenance: {},
      constants: {},
    };
    expect(() =>
      themeTableToCssVars(custom, catalog, { schemaVersion: 1, constants: [] }),
    ).toThrow("CSS_VAR_COLLISION");
  });
});
