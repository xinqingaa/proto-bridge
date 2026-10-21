import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveAllThemeTables,
  type ResolvedThemeTable,
  type ThemeValueType,
} from "@proto-bridge/core/v2";
import {
  resolveThemeTokens,
  tokenValueToCssValue,
} from "./fixtures/legacy-theme";
import type {
  ThemeRecord,
  TokenRecord,
  TokenValue,
} from "@/design-system/types";
import tokensJson from "./fixtures/legacy-theme/tokens.json";
import lightThemeJson from "./fixtures/legacy-theme/light.json";
import darkThemeJson from "./fixtures/legacy-theme/dark.json";
import migrationJson from "@/design-system/theme/legacy-migration.json";
import { loadBaseThemeSources } from "@/design-system/theme/sources";

type Tier = "semantic" | "component" | "primitive" | "constant";
type MigrationEntry = { tier: Tier; targets: string[]; note?: string };

const MODES = ["light", "dark"] as const;
type Mode = (typeof MODES)[number];

const oldTokens = tokensJson as unknown as TokenRecord[];
const oldThemes = [lightThemeJson, darkThemeJson] as unknown as ThemeRecord[];
const migration = (
  migrationJson as unknown as { keys: Record<string, MigrationEntry> }
).keys;

const sources = loadBaseThemeSources();
const catalogTypes = new Map<string, ThemeValueType>(
  sources.keyCatalog.keys.map((key) => [key.id, key.valueType]),
);
const constantTypes = new Map<string, ThemeValueType>(
  sources.constants.constants.map((constant) => [
    constant.id,
    constant.valueType,
  ]),
);
const constantValues = new Map(
  sources.constants.constants.map((constant) => [constant.id, constant.value]),
);
const resolution = resolveAllThemeTables({
  keyCatalog: sources.keyCatalog,
  constants: sources.constants,
  packs: sources.packs,
  packId: "pbwork-base",
});
const tables = Object.fromEntries(
  resolution.tables.map((table) => [table.identity.mode, table]),
) as Record<Mode, ResolvedThemeTable>;
const basePack = sources.packs.get("pbwork-base")!;
const primitives = (basePack.primitives?.values ?? {}) as Record<
  string,
  unknown
>;

// 基础包字族固定为系统字体栈
const SYSTEM_STACK = [
  "system-ui",
  "-apple-system",
  "PingFang SC",
  "sans-serif",
];

/** 旧取值（resolveThemeTokens + tokenValueToCssValue），旧 border 里的 var() 替换为本模式旧解析值。 */
function oldCssFor(mode: Mode): Record<string, string> {
  const resolved = resolveThemeTokens(mode, oldTokens, oldThemes);
  const css: Record<string, string> = {};
  for (const token of oldTokens) {
    css[token.id] = tokenValueToCssValue(
      token.id,
      resolved[token.id] as TokenValue,
    );
  }
  for (const token of oldTokens) {
    css[token.id] = css[token.id]!.replace(
      /var\(--pb-([a-z0-9-]+?)-([a-z0-9-]+)\)/g,
      (_match, category: string, name: string) =>
        css[`${category}.${name}`] ?? _match,
    );
  }
  return css;
}
const oldCss: Record<Mode, Record<string, string>> = {
  light: oldCssFor("light"),
  dark: oldCssFor("dark"),
};

function lengthCss(value: unknown): string {
  return typeof value === "number" ? `${value}px` : String(value);
}

/** 新取值的 CSS 形式；单位只由 valueType 决定。 */
function toCss(valueType: ThemeValueType, value: unknown): string {
  switch (valueType) {
    case "length":
      return lengthCss(value);
    case "duration":
      return typeof value === "number" ? `${value}ms` : String(value);
    case "border": {
      const border = value as { width: unknown; style: string; color: string };
      return `${lengthCss(border.width)} ${border.style} ${border.color}`;
    }
    default:
      return String(value);
  }
}

function sameCss(actual: string, expected: string): boolean {
  return actual.toLowerCase() === expected.toLowerCase();
}

function parseOldTypography(value: TokenValue) {
  const match = /^(\d+) ([\d.]+(?:px|rem))\/([\d.]+) (.+)$/.exec(String(value));
  if (!match) throw new Error(`UNPARSEABLE_TYPOGRAPHY:${value}`);
  return {
    weight: Number(match[1]),
    size: match[2]!,
    lineHeight: Number(match[3]),
    family: match[4]!,
  };
}

function entriesOfTier(tier: Tier): Array<[string, MigrationEntry]> {
  return Object.entries(migration).filter(([, entry]) => entry.tier === tier);
}

describe("legacy-migration 覆盖性", () => {
  it("覆盖全部 154 个旧键，无重复、无遗漏、无多余", () => {
    expect(oldTokens).toHaveLength(154);
    const raw = readFileSync(
      resolve("src/design-system/theme/legacy-migration.json"),
      "utf8",
    );
    // 逐键出现次数：JSON.parse 会静默合并重复键，这里直接数原文
    const occurrences = [...raw.matchAll(/^ {4}"([a-z0-9.-]+)": \{/gm)].map(
      (m) => m[1]!,
    );
    expect(occurrences).toHaveLength(154);
    expect(new Set(occurrences).size).toBe(154);
    expect(new Set(Object.keys(migration))).toEqual(
      new Set(oldTokens.map((token) => token.id)),
    );
  });

  it("分层计数：语义 102、组件 11、Primitive 9、常量 32", () => {
    const counts = Object.values(migration).reduce<Record<string, number>>(
      (acc, entry) => {
        acc[entry.tier] = (acc[entry.tier] ?? 0) + 1;
        return acc;
      },
      {},
    );
    expect(counts).toEqual({
      semantic: 102,
      component: 11,
      primitive: 9,
      constant: 32,
    });
  });

  it("targets 非空；语义/常量/Primitive 目标全部存在", () => {
    for (const [oldId, entry] of Object.entries(migration)) {
      expect(entry.targets.length, oldId).toBeGreaterThan(0);
      for (const target of entry.targets) {
        if (entry.tier === "semantic")
          expect(catalogTypes.has(target), `${oldId} → ${target}`).toBe(true);
        if (entry.tier === "constant")
          expect(constantValues.has(target), `${oldId} → ${target}`).toBe(true);
        if (entry.tier === "primitive")
          expect(target in primitives, `${oldId} → ${target}`).toBe(true);
      }
    }
  });

  it("Primitive 名不与目录键或常量同名", () => {
    for (const name of Object.keys(primitives)) {
      expect(catalogTypes.has(name), name).toBe(false);
      expect(constantValues.has(name), name).toBe(false);
    }
  });

  it("目录中未被旧键映射到的键与明确新增的主题能力一致", () => {
    const targeted = new Set(
      [...entriesOfTier("semantic"), ...entriesOfTier("component")].flatMap(
        ([, entry]) => entry.targets,
      ),
    );
    const untouched = [...catalogTypes.keys()]
      .filter((id) => !targeted.has(id))
      .sort();
    expect(untouched).toEqual(
      [
        "button.glass-primary-tint",
        "opacity.data-low",
        "opacity.data-medium",
        "opacity.data-high",
        "icon-button.glass-primary-tint",
        "tabbar.selection-tint",
        "primary-tabs.selection-tint",
        "border.glass",
        "color.glass-clear",
        "color.glass-edge",
        "color.glass-tint",
        "elevation.glass",
        "size.action-min-inline",
        "effect.artwork-shadow",
        "tracking.caption",
        "tracking.display",
        "tracking.heading",
        "tracking.label",
        "size.brand",
        "size.plot",
        "size.ring",
        "app-bar.surface-treatment",
        "primary-tabs.selection-treatment",
        "tabbar.surface-treatment",
        "asset.brand-mark",
        "asset.brand-wordmark",
        "asset.empty-illustration",
        "asset.launch-image",
        "border.width-strong",
        "density",
        "motion.personality",
        "surface.treatment",
        "badge.label-size",
        "size.panel-medium",
        "size.panel-large",
        "typography.numeric-content",
        "typography.numeric-display",
        "typography.numeric-title",
      ].sort(),
    );
  });
});

describe.each(MODES)("新旧取值等价（%s）", (mode) => {
  const table = tables[mode];
  const old = oldCss[mode];

  it("语义层（非字阶）：每个旧键的每个 target 与旧 CSS 值相等", () => {
    const rows = entriesOfTier("semantic").filter(
      ([oldId]) => !oldId.startsWith("typography."),
    );
    expect(rows.length).toBe(102 - 13);
    for (const [oldId, entry] of rows) {
      for (const target of entry.targets) {
        const valueType = catalogTypes.get(target)!;
        const actual = toCss(valueType, table.values[target]);
        expect(
          sameCss(actual, old[oldId]!),
          `${oldId} → ${target}: ${actual} ≠ ${old[oldId]}`,
        ).toBe(true);
      }
    }
  });

  it("常量层：每个旧键的 target 与旧 CSS 值相等", () => {
    const rows = entriesOfTier("constant");
    expect(rows).toHaveLength(32);
    for (const [oldId, entry] of rows) {
      for (const target of entry.targets) {
        const valueType = constantTypes.get(target)!;
        const actual = toCss(valueType, constantValues.get(target));
        expect(
          sameCss(actual, old[oldId]!),
          `${oldId} → ${target}: ${actual} ≠ ${old[oldId]}`,
        ).toBe(true);
        expect(table.constants[target], target).toEqual(
          constantValues.get(target),
        );
      }
    }
  });

  it("字阶：字重、字号（含单位）、行高与旧值一致，字族为系统字体栈", () => {
    const rows = entriesOfTier("semantic").filter(([oldId]) =>
      oldId.startsWith("typography."),
    );
    expect(rows).toHaveLength(13);
    const typo = (id: string) =>
      table.values[id] as {
        family: string[];
        features: string[];
        weight: number;
        size: number | string;
        lineHeight: number;
      };
    for (const [oldId, entry] of rows) {
      const expected = parseOldTypography(
        oldTokens.find((token) => token.id === oldId)!.defaultValue,
      );
      const actual = typo(entry.targets[0]!);
      expect(actual.weight, oldId).toBe(expected.weight);
      expect(lengthCss(actual.size), oldId).toBe(expected.size);
      expect(actual.lineHeight, oldId).toBe(expected.lineHeight);
      expect(actual.family, oldId).toEqual(SYSTEM_STACK);
      expect(actual.features, oldId).toEqual([]);
    }
    // 新增数字字阶沿用 display / title / content 的度量，带 tnum
    for (const [numeric, source] of [
      ["typography.numeric-display", "typography.display"],
      ["typography.numeric-title", "typography.title"],
      ["typography.numeric-content", "typography.content"],
    ] as const) {
      expect(typo(numeric).weight).toBe(typo(source).weight);
      expect(typo(numeric).size).toBe(typo(source).size);
      expect(typo(numeric).lineHeight).toBe(typo(source).lineHeight);
      expect(typo(numeric).family).toEqual(SYSTEM_STACK);
      expect(typo(numeric).features).toEqual(["tnum"]);
    }
  });

  it("Primitive：基础包 Primitive 值与旧值相等（模式专属的分别比较）", () => {
    const rows = entriesOfTier("primitive");
    expect(rows).toHaveLength(9);
    for (const [oldId, entry] of rows) {
      const modeSpecific = entry.targets.length === 2;
      const target = modeSpecific
        ? entry.targets.find((name) => name.endsWith(`-${mode}`))!
        : entry.targets[0]!;
      expect(target, `${oldId} (${mode})`).toBeTruthy();
      const value = primitives[target];
      const actual =
        typeof value === "object" && value !== null
          ? toCss("border", value)
          : tokenValueToCssValue(oldId, value as TokenValue);
      expect(
        sameCss(actual, old[oldId]!),
        `${oldId} → ${target}: ${actual} ≠ ${old[oldId]}`,
      ).toBe(true);
    }
  });
});

describe("组件层（第 2 步组件迁移批次）", () => {
  const rows = entriesOfTier("component");

  it("11 个旧键均给出非空 targets", () => {
    expect(rows).toHaveLength(11);
    for (const [oldId, entry] of rows) {
      expect(entry.targets.length, oldId).toBeGreaterThan(0);
    }
  });

  for (const [oldId, entry] of rows) {
    it(`组件迁移：${oldId} → ${entry.targets.join(", ")} 的组件层取值等价`, () => {
      for (const mode of MODES)
        for (const target of entry.targets) {
          expect(
            sameCss(
              toCss(catalogTypes.get(target)!, tables[mode].values[target]),
              target === "toast.gap"
                ? "10px" // Approved compact Toast spacing supersedes the legacy 6px.
                : catalogTypes.get(target) === "number"
                  ? String(Number.parseFloat(oldCssFor(mode)[oldId]!))
                  : oldCssFor(mode)[oldId]!,
            ),
          ).toBe(true);
        }
    });
  }
});
