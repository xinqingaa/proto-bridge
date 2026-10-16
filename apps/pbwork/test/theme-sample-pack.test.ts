import { validateThemePacks } from "@proto-bridge/core/v2";
import { describe, expect, it } from "vitest";
import { resolveRuntimeTheme } from "@/design-system/theme/runtime-theme";
import { loadThemeSources } from "@/design-system/theme/sources";

describe("样例主题包（pbwork-sample）", () => {
  const sources = loadThemeSources();

  it("只在 Playground 范围，含两套主题与浅色/深色，并继承基础包", () => {
    const pack = sources.packs.get("pbwork-sample");
    expect(pack?.manifest).toMatchObject({
      id: "pbwork-sample",
      extends: "pbwork-base",
      scope: "playground",
      defaultTheme: "garden",
      defaultMode: "light",
      modes: ["light", "dark"],
    });
    expect(pack?.manifest.themes.map((theme) => theme.id)).toEqual([
      "garden",
      "citrus",
    ]);
    expect(pack?.files?.["assets/brand-mark.svg"]).toMatch(/^[0-9a-f]{40}$/);
  });

  it("校验无阻断，且品牌、圆角、密度、表面、动效和标记都不同于基础包", () => {
    const diagnostics = validateThemePacks({
      ...sources,
      prototypeBindings: [{ prototypeId: "cold-chain-ops", packId: "pbwork-base" }],
    }).filter((item) => item.packId === "pbwork-sample");
    expect(diagnostics.filter((item) => item.severity === "block")).toEqual([]);

    const sample = resolveRuntimeTheme("pbwork-sample", "garden", "light");
    const base = resolveRuntimeTheme("pbwork-base", "default", "light");
    expect(sample.values["color.primary"]).not.toBe(base.values["color.primary"]);
    expect(sample.values["color.action"]).not.toBe(base.values["color.action"]);
    expect(sample.values["radius.control"]).not.toBe(base.values["radius.control"]);
    expect(sample.values["radius.surface"]).not.toBe(base.values["radius.surface"]);
    expect(sample.values.density).toBe("compact");
    expect(sample.values["surface.treatment"]).toBe("glass");
    expect(sample.values["motion.personality"]).toBe("lively");
    expect(sample.values["asset.brand-mark"]).toMatchObject({
      file: "assets/brand-mark.svg",
      packId: "pbwork-sample",
    });

    const citrus = resolveRuntimeTheme("pbwork-sample", "citrus", "dark");
    expect(citrus.values["color.primary"]).not.toBe(sample.values["color.primary"]);
    expect(citrus.identity.mode).toBe("dark");
  });

  it("不能绑定到正式原型", () => {
    const blocked = validateThemePacks({
      ...sources,
      prototypeBindings: [{ prototypeId: "cold-chain-ops", packId: "pbwork-sample" }],
    });
    expect(blocked.some((item) => item.severity === "block" && item.packId === "pbwork-sample")).toBe(true);
  });
});
