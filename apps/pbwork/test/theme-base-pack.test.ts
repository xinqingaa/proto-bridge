import { describe, expect, it } from "vitest";
import {
  buildThemeKeyIndex,
  resolveAllThemeTables,
  resolveThemePack,
  validateThemePacks,
  type ThemePackSource,
} from "@proto-bridge/core/v2";
import { loadBaseThemeSources } from "@/design-system/theme/sources";

const BASE_ID = "pbwork-base";

// 设计稿 1.4：基础取值下真实使用的 6 个不达标配对。
const EXPECTED_WAIVED = [
  { fg: "color.on-warning", bg: "color.warning", mode: "light", ratio: "3.19" },
  { fg: "color.on-info", bg: "color.info", mode: "light", ratio: "4.40" },
  {
    fg: "color.primary",
    bg: "color.primary-soft",
    mode: "light",
    ratio: "4.13",
  },
  {
    fg: "color.secondary",
    bg: "color.secondary-soft",
    mode: "light",
    ratio: "4.49",
  },
  { fg: "color.error", bg: "color.error-soft", mode: "dark", ratio: "4.45" },
  { fg: "color.outline", bg: "color.surface", mode: "light", ratio: "2.09" },
] as const;

function childPack(overrides: Record<string, string>): ThemePackSource {
  return {
    manifest: {
      schemaVersion: 1,
      id: "probe-pack",
      label: "探针子包",
      extends: BASE_ID,
      scope: "prototype",
      modes: ["light", "dark"],
      defaultMode: "light",
      themes: [{ id: "default", label: "默认主题" }],
      defaultTheme: "default",
    },
    semantic: { values: overrides },
    ownerPrototypeId: "probe-pack",
  } as ThemePackSource;
}

function resolveWith(overrides: Record<string, string>) {
  const sources = loadBaseThemeSources();
  const packs = new Map(sources.packs);
  packs.set("probe-pack", childPack(overrides));
  const { table, diagnostics } = resolveThemePack({
    keyCatalog: sources.keyCatalog,
    constants: sources.constants,
    packs,
    packId: "probe-pack",
    mode: "light",
  });
  expect(diagnostics.filter((item) => item.severity === "block")).toEqual([]);
  expect(table).not.toBeNull();
  return table!.values;
}

describe("基础主题包（pbwork-base）", () => {
  const sources = loadBaseThemeSources();

  it("键目录规模：可绑定 153、不可绑定 6、派生部件 64", () => {
    const keys = sources.keyCatalog.keys;
    expect(keys.filter((key) => key.bindable)).toHaveLength(153);
    expect(keys.filter((key) => !key.bindable)).toHaveLength(6);
    expect(
      keys
        .filter((key) => !key.bindable)
        .map((key) => key.id)
        .sort(),
    ).toEqual([
      "app-bar.surface-treatment",
      "density",
      "motion.personality",
      "primary-tabs.selection-treatment",
      "surface.treatment",
      "tabbar.surface-treatment",
    ]);
    const index = buildThemeKeyIndex(sources.keyCatalog);
    expect([...index.values()].filter((info) => info.part)).toHaveLength(64);
    expect(keys.filter((key) => key.valueType === "typography")).toHaveLength(
      16,
    );
    expect(keys.filter((key) => key.id.startsWith("color."))).toHaveLength(39);
    expect(keys.filter((key) => key.id.startsWith("spacing."))).toHaveLength(8);
    expect(keys.filter((key) => key.id.startsWith("size."))).toHaveLength(22);
    expect(keys.filter((key) => key.id.startsWith("radius."))).toHaveLength(6);
    expect(keys.filter((key) => key.id.startsWith("elevation."))).toHaveLength(
      6,
    );
    expect(keys.filter((key) => key.id.startsWith("asset."))).toHaveLength(4);
    expect(sources.constants.constants).toHaveLength(37);
  });

  it("只声明包内主题，颜色键仍可按模式变化", () => {
    const pack = sources.packs.get(BASE_ID)!;
    expect(pack.manifest.themes).toEqual([
      { id: "default", label: "默认主题" },
    ]);
    expect(pack.manifest.defaultTheme).toBe("default");
    expect(
      sources.keyCatalog.keys.filter(
        (key) => key.id.startsWith("color.") && !key.modeVariant,
      ),
    ).toEqual([]);
  });

  it("Core 校验无 block，warning 恰为 6 条 theme.contrast-waived 且与设计稿 1.4 一致", () => {
    const diagnostics = validateThemePacks({
      keyCatalog: sources.keyCatalog,
      constants: sources.constants,
      packs: sources.packs,
    });
    expect(diagnostics.filter((item) => item.severity === "block")).toEqual([]);
    const warnings = diagnostics.filter((item) => item.severity === "warning");
    expect(warnings).toHaveLength(6);
    expect(
      warnings.every((item) => item.code === "theme.contrast-waived"),
    ).toBe(true);

    const actual = warnings
      .map((item) => {
        const [, fg, bg] =
          /^contrastPairs:(.+)\/(.+)$/.exec(item.path ?? "") ?? [];
        const [, ratio] = /is (\d+\.\d+):1/.exec(item.message) ?? [];
        return { fg, bg, mode: item.mode, ratio };
      })
      .sort((a, b) => `${a.fg}/${a.bg}`.localeCompare(`${b.fg}/${b.bg}`));
    const expected = [...EXPECTED_WAIVED].sort((a, b) =>
      `${a.fg}/${a.bg}`.localeCompare(`${b.fg}/${b.bg}`),
    );
    expect(actual).toEqual(expected);
    for (const item of warnings)
      expect(item.message).toContain("等价迁移保持零视觉差异");
  });

  it("每条豁免都写了非空中文理由，且没有未使用的豁免", () => {
    const pack = sources.packs.get(BASE_ID)!;
    const waivers = pack.manifest.contrastWaivers ?? [];
    expect(waivers).toHaveLength(6);
    for (const waiver of waivers) {
      expect(waiver.reason.trim().length).toBeGreaterThan(0);
      expect(waiver.reason).toMatch(/[\u4e00-\u9fff]/);
    }
    const diagnostics = validateThemePacks({
      keyCatalog: sources.keyCatalog,
      constants: sources.constants,
      packs: sources.packs,
    });
    expect(
      diagnostics.filter(
        (item) => item.code === "theme.contrast-waiver-unused",
      ),
    ).toEqual([]);
  });

  it("resolveAllThemeTables 产出 default × light/dark 两张表，digest 连续两次相等", () => {
    const input = {
      keyCatalog: sources.keyCatalog,
      constants: sources.constants,
      packs: sources.packs,
      packId: BASE_ID,
    };
    const first = resolveAllThemeTables(input);
    const second = resolveAllThemeTables(input);
    expect(
      first.diagnostics.filter((item) => item.severity === "block"),
    ).toEqual([]);
    expect(first.digest).toMatch(/^sha1:[0-9a-f]{40}$/);
    expect(second.digest).toBe(first.digest);
    expect(
      first.tables
        .map((table) => `${table.identity.mode}/${table.identity.theme}`)
        .sort(),
    ).toEqual(["dark/default", "light/default"]);
    for (const table of first.tables) {
      // 159 个目录键（含紧凑选择与数据强度）+ 64 个字体部件
      expect(Object.keys(table.values)).toHaveLength(159 + 64);
      expect(Object.keys(table.constants)).toHaveLength(37);
    }
  });

  it("density=compact / comfortable 时 spacing 刻度不变、size 取到对应档位", () => {
    const compact = resolveWith({ density: "compact" });
    expect(compact["spacing.md"]).toBe(16);
    expect(compact["spacing.sm"]).toBe(8);
    expect(compact["spacing.xxs"]).toBe(2);
    expect(compact["size.control"]).toBe(36);
    expect(compact["size.icon"]).toBe(20);

    const comfortable = resolveWith({ density: "comfortable" });
    expect(comfortable["spacing.md"]).toBe(16);
    expect(comfortable["spacing.lg"]).toBe(24);
    expect(comfortable["spacing.xxs"]).toBe(2);
    expect(comfortable["size.control"]).toBe(44);

    const regular = resolveWith({});
    expect(regular["spacing.md"]).toBe(16);
    expect(regular["size.control"]).toBe(40);
  });

  it("motion.personality=lively / calm 时 duration、press-scale 取到对应档位", () => {
    const lively = resolveWith({ "motion.personality": "lively" });
    expect(lively["motion.duration-short"]).toBe(100);
    expect(lively["motion.duration-medium"]).toBe(160);
    expect(lively["motion.duration-long"]).toBe(260);
    expect(lively["motion.press-scale"]).toBe(0.97);
    expect(lively["motion.press-scale-strong"]).toBe(0.94);

    const calm = resolveWith({ "motion.personality": "calm" });
    expect(calm["motion.duration-short"]).toBe(160);
    expect(calm["motion.duration-medium"]).toBe(260);
    expect(calm["motion.duration-long"]).toBe(400);
    expect(calm["motion.press-scale"]).toBe(0.99);

    const standard = resolveWith({});
    expect(standard["motion.duration-short"]).toBe(120);
    expect(standard["motion.easing-standard"]).toBe(
      lively["motion.easing-standard"],
    );
  });
});
