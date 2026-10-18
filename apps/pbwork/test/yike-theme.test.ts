import { describe, expect, it } from "vitest";
import { runtimeThemeSources, resolveRuntimeTheme } from "@/design-system/theme/runtime-theme";

describe("一刻主题矩阵", () => {
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
        expect(table.values["tabbar.active"]).toBe(
          table.values["color.on-surface"],
        );
        expect(table.values["secondary-tabs.indicator"]).toBe(
          table.values["color.primary"],
        );
      }
    }
  });
});
