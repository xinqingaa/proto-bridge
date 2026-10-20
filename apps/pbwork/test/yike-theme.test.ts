import { describe, expect, it } from "vitest";
import { validateThemePacks } from "@proto-bridge/core/v2";
import {
  createRuntimeThemeRegistry,
  runtimeThemeSources,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";

import { themeAssetUrl } from "@/design-system/theme/sources";

describe("一刻主题矩阵", () => {
  it("通过Core真实资产与对比度门禁，而不只检查解析表存在", () => {
    expect(
      validateThemePacks({
        ...runtimeThemeSources,
        prototypeBindings: [{ prototypeId: "yike", packId: "yike" }],
      }).filter((item) => item.packId === "yike" && item.severity === "block"),
    ).toEqual([]);
  });
  it("解析三套主题的浅色与深色组合，并保留组件级语义映射", () => {
    const pack = runtimeThemeSources.packs.get("yike");
    expect(pack?.manifest.themes.map((item) => item.id)).toEqual([
      "mechanical",
      "water",
      "sundial",
    ]);
    for (const theme of ["mechanical", "water", "sundial"]) {
      for (const mode of ["light", "dark"]) {
        const table = resolveRuntimeTheme("yike", theme, mode);
        expect(table.values["color.background"]).toBeTruthy();
        expect(table.values["color.surface"]).toBeTruthy();
        expect(table.values["color.primary"]).toBeTruthy();
        // Background text must use the selected face's ink, including dark mode.
        expect(table.values["color.on-background"]).toBe(
          table.values["color.on-surface"],
        );
        for (const surface of ["surface-variant", "surface-selected"]) {
          expect(table.values[`color.${surface}`]).toBe(
            table.values["color.surface-recessed"],
          );
        }
        expect(table.values["color.surface-raised"]).toBe(
          table.values["color.surface"],
        );
        expect(table.values["color.action"]).toBe(
          table.values["color.on-surface"],
        );
        expect(table.values["color.on-action"]).toBe(
          table.values["color.surface"],
        );
        expect(table.values["color.secondary"]).toBe(
          table.values["color.on-surface"],
        );
        expect(table.values["color.secondary-soft"]).toBe(
          table.values["color.surface-recessed"],
        );
        expect(table.values["color.on-secondary"]).toBe(
          table.values["color.surface"],
        );
        expect(table.values["tabbar.active"]).toBe(
          table.values["color.primary"],
        );
        expect(table.values["secondary-tabs.indicator"]).toBe(
          table.values["color.primary"],
        );
      }
    }
  });

  it("六组合明确使用玻璃导航，浅深染色独立且三主题保持差异", () => {
    const light = ["mechanical", "water", "sundial"].map(
      (theme) => resolveRuntimeTheme("yike", theme, "light").values,
    );
    expect(
      new Set(light.map((values) => values["color.glass-tint"])).size,
    ).toBe(3);
    for (const theme of ["mechanical", "water", "sundial"]) {
      const day = resolveRuntimeTheme("yike", theme, "light").values;
      const night = resolveRuntimeTheme("yike", theme, "dark").values;
      expect(day["surface.treatment"]).toBe("glass");
      expect(day["tabbar.surface-treatment"]).toBe("glass");
      expect(night["color.glass-tint"]).not.toBe(day["color.glass-tint"]);
      expect(day["surface.glass-backdrop"]).toContain("blur(");
    }
  });

  it.each([
    ["mechanical", 18, 12, 32, 700, 54, 700, 312],
    ["water", 22, 14, 32, 300, 76, 200, 228],
    ["sundial", 6, 4, 32, 400, 58, 400, 278],
  ] as const)(
    "保留 %s 的形状、标题与数字比例且浅深模式等价",
    (
      theme,
      radius,
      compactRadius,
      titleSize,
      titleWeight,
      digitSize,
      digitWeight,
      plot,
    ) => {
      for (const mode of ["light", "dark"]) {
        const values = resolveRuntimeTheme("yike", theme, mode).values;
        expect(values["radius.surface"]).toBe(radius);
        expect(values["radius.control-compact"]).toBe(compactRadius);
        expect(values["typography.headline"]).toMatchObject({
          size: titleSize,
          weight: titleWeight,
        });
        expect(values["typography.numeric-display"]).toMatchObject({
          size: digitSize,
          weight: digitWeight,
        });
        expect(values["size.plot"]).toBe(plot);
        expect(values["typography.numeric-display.family"]).toEqual(
          resolveRuntimeTheme("pbwork-base", "default", mode).values[
            "typography.numeric-display.family"
          ],
        );
      }
    },
  );
});

// Guard against unresolved CSS variables that a parse-only theme test cannot see.
it("签名资源消费的主题变量在六组合中均有真实值", () => {
  const sources = import.meta.glob("../src/prototypes/yike/components/*.vue", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const registry = createRuntimeThemeRegistry(
    runtimeThemeSources,
    themeAssetUrl,
  );
  for (const theme of ["mechanical", "water", "sundial"]) {
    for (const mode of ["light", "dark"]) {
      const css = registry.cssVars(registry.resolve("yike", theme, mode));
      for (const [file, source] of Object.entries(sources)) {
        for (const match of source.matchAll(/var\((--pb-[a-z0-9-]+)/g)) {
          expect(
            css[match[1]!],
            `${file}: ${theme}/${mode} ${match[1]}`,
          ).toBeDefined();
        }
      }
    }
  }
});

it("布局节奏与禁用透明度继承基础包，动效按 calm 性格取值", () => {
  for (const theme of ["mechanical", "water", "sundial"]) {
    for (const mode of ["light", "dark"]) {
      const base = resolveRuntimeTheme("pbwork-base", "default", mode).values;
      const own = resolveRuntimeTheme("yike", theme, mode).values;
      const inherited = Object.keys(base).filter(
        (key) =>
          /^(spacing\.|opacity\.)/.test(key) &&
          !key.startsWith("opacity.data-"),
      );
      expect(inherited.length).toBeGreaterThan(10);
      for (const key of inherited)
        expect(own[key], `${theme}/${mode}: ${key}`).toEqual(base[key]);
      // 一刻是安静克制的物件，动效使用 calm 档位（160 / 260 / 400）。
      expect(own["motion.personality"]).toBe("calm");
      expect(own["motion.duration-short"]).toBe(160);
      expect(own["motion.duration-medium"]).toBe(260);
      expect(own["motion.duration-long"]).toBe(400);
      expect(own["motion.press-scale"]).toBe(0.99);
    }
  }
});
