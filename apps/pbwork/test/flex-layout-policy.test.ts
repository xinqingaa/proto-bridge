import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { parse as parseSfc } from "vue/compiler-sfc";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const designSystemImplementationDirectories = [
  resolve("src/design-system/components/_shared"),
  resolve("src/design-system/components/action"),
  resolve("src/design-system/components/input"),
  resolve("src/design-system/components/display"),
  resolve("src/design-system/components/navigation"),
  resolve("src/design-system/components/data"),
  resolve("src/design-system/components/feedback"),
];
const prototypesDirectory = resolve("src/prototypes");

const policyFilePattern = /\.(?:vue|ts|css|scss|sass|less)$/;
const visualTemplateAttributePattern =
  /(?:^|\s)(?::)?(?:size|width|height|min-width|min-height|max-width|max-height|offset|elevation|bg-opacity|opacity|timeout|stroke-width|rows)\s*=\s*(["'])[^"']*[+-]?(?:\d*\.\d+|\d+)[^"']*\1/gi;
const styleTemplateAttributePattern =
  /(?:^|\s)(?::)?style\s*=\s*(["'])[^"']*\1/gi;
const visualScriptAssignmentPattern =
  /\b(?:size|width|height|minWidth|minHeight|maxWidth|maxHeight|offset|elevation|opacity|timeout|strokeWidth|stroke)\s*:\s*[+-]?(?:\d*\.\d+|\d+)\b/g;
const fixedCssLiteralPattern =
  /(?:#[0-9a-f]{3,8}\b|[+-]?(?:\d*\.\d+|\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ms|s|deg)(?=$|[^a-z]))/gi;
const gridSourcePattern =
  /(?:display\s*:\s*["']?(?:inline-)?grid\b|\bgrid-(?:template|auto|column|row|gap|area)s?\s*:|\bplace-(?:items|content|self)\s*:)/gi;

type StyleSource = {
  content: string;
  lineOffset: number;
};

type ScriptSource = {
  content: string;
  lineOffset: number;
};

async function findPolicyFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) {
        return findPolicyFiles(target);
      }
      return entry.isFile() && policyFilePattern.test(entry.name)
        ? [target]
        : [];
    }),
  );
  return nested.flat();
}

async function readStyleSources(file: string): Promise<StyleSource[]> {
  const source = await readFile(file, "utf8");
  if (extname(file) === ".ts") return [];
  if (extname(file) !== ".vue") return [{ content: source, lineOffset: 0 }];

  const parsed = parseSfc(source, { filename: file });
  if (parsed.errors.length > 0) {
    throw new Error(
      `${relative(resolve("."), file)} cannot be parsed as an SFC`,
    );
  }
  return parsed.descriptor.styles.map((style) => ({
    content: style.content,
    lineOffset: style.loc.start.line - 1,
  }));
}

async function readScriptSources(file: string): Promise<ScriptSource[]> {
  const source = await readFile(file, "utf8");
  if (extname(file) === ".ts") return [{ content: source, lineOffset: 0 }];
  if (extname(file) !== ".vue") return [];

  const parsed = parseSfc(source, { filename: file });
  return [parsed.descriptor.script, parsed.descriptor.scriptSetup]
    .filter((block): block is NonNullable<typeof block> => Boolean(block))
    .map((block) => ({
      content: block.content,
      lineOffset: block.loc.start.line - 1,
    }));
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

function sourceLocation(file: string, line: number): string {
  return `${relative(resolve("."), file)}:${line}`;
}

function matchingOffsets(source: string, pattern: RegExp): number[] {
  const offsets: number[] = [];
  pattern.lastIndex = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    offsets.push(match.index);
  }
  return offsets;
}

function inlineStyleViolationOffsets(source: string): number[] {
  const offsets: number[] = [];
  styleTemplateAttributePattern.lastIndex = 0;
  for (
    let match = styleTemplateAttributePattern.exec(source);
    match;
    match = styleTemplateAttributePattern.exec(source)
  ) {
    const value = match[0];
    if (
      matchingOffsets(value, fixedCssLiteralPattern).length > 0 ||
      matchingOffsets(value, gridSourcePattern).length > 0 ||
      literalTokenFallbackOffsets(value).length > 0
    ) {
      offsets.push(match.index);
    }
  }
  return offsets;
}

function literalTokenFallbackOffsets(value: string): number[] {
  const offsets: number[] = [];
  for (
    let start = value.indexOf("var(");
    start >= 0;
    start = value.indexOf("var(", start + 4)
  ) {
    let cursor = start + 4;
    while (/\s/.test(value[cursor] ?? "")) cursor += 1;
    if (!value.startsWith("--pb-", cursor)) continue;

    let depth = 1;
    let comma = -1;
    let end = -1;
    for (let index = cursor; index < value.length; index += 1) {
      if (value[index] === "(") depth += 1;
      if (value[index] === ")") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
      if (depth === 1 && value[index] === "," && comma < 0) comma = index;
    }
    if (comma < 0 || end < 0) continue;
    const fallback = value.slice(comma + 1, end).trim();
    if (!fallback.startsWith("var(--pb-")) offsets.push(start);
  }
  return offsets;
}

function stripTokenVars(value: string): string {
  let stripped = value;
  let previous = "";
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripped.replace(/var\([^()]*\)/g, "");
  }
  return stripped;
}

function hasBareDesignLiteral(value: string): boolean {
  const remaining = stripTokenVars(value);
  if (
    /(?:#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\bcolor-mix\(|\b(?:linear|radial)-gradient\()/i.test(
      remaining,
    )
  ) {
    return true;
  }
  if (/[+-]?(?:\d*\.\d+|\d+)\b/.test(remaining)) return true;
  return false;
}

function pushOffsets(
  violations: string[],
  file: string,
  source: ScriptSource,
  offsets: number[],
  reason: string,
) {
  for (const offset of offsets) {
    violations.push(
      `${sourceLocation(file, source.lineOffset + lineAt(source.content, offset))} (${reason})`,
    );
  }
}

async function findPolicyViolations(files: string[]) {
  const violations: string[] = [];

  for (const file of files) {
    const allSource = await readFile(file, "utf8");
    if (extname(file) === ".vue") {
      const parsed = parseSfc(allSource, { filename: file });
      const template = parsed.descriptor.template;
      if (template) {
        const templateSource = {
          content: template.content,
          lineOffset: template.loc.start.line - 1,
        };
        pushOffsets(
          violations,
          file,
          templateSource,
          matchingOffsets(template.content, visualTemplateAttributePattern),
          "visual template prop contains a fixed number",
        );
        pushOffsets(
          violations,
          file,
          templateSource,
          inlineStyleViolationOffsets(template.content),
          "inline style bypasses Token-only or Flex-only policy",
        );
        pushOffsets(
          violations,
          file,
          templateSource,
          matchingOffsets(template.content, gridSourcePattern),
          "CSS Grid is forbidden in template styles",
        );
      }
    }

    for (const script of await readScriptSources(file)) {
      pushOffsets(
        violations,
        file,
        script,
        literalTokenFallbackOffsets(script.content),
        "literal Token fallback",
      );
      pushOffsets(
        violations,
        file,
        script,
        matchingOffsets(script.content, gridSourcePattern),
        "CSS Grid is forbidden in generated styles",
      );
      pushOffsets(
        violations,
        file,
        script,
        matchingOffsets(script.content, fixedCssLiteralPattern),
        "script contains a fixed CSS value",
      );
      pushOffsets(
        violations,
        file,
        script,
        matchingOffsets(script.content, visualScriptAssignmentPattern),
        "visual script prop contains a fixed number",
      );
    }

    for (const style of await readStyleSources(file)) {
      const root = postcss.parse(style.content, { from: file });
      root.walkDecls((declaration) => {
        const line = (declaration.source?.start?.line ?? 1) + style.lineOffset;
        const location = sourceLocation(file, line);
        const property = declaration.prop.toLowerCase();
        const value = declaration.value;

        if (
          property.startsWith("grid") ||
          ["place-items", "place-content", "place-self"].includes(property) ||
          (property === "display" && /(?:^|\s)(?:inline-)?grid\b/i.test(value))
        ) {
          violations.push(`${location} (CSS Grid is forbidden)`);
        }
        if (literalTokenFallbackOffsets(value).length > 0) {
          violations.push(`${location} (literal Token fallback)`);
        }
        if (hasBareDesignLiteral(value)) {
          violations.push(
            `${location} (${property} contains a bare design value)`,
          );
        }
      });
      root.walkAtRules((rule) => {
        if (!hasBareDesignLiteral(rule.params)) return;
        const line = (rule.source?.start?.line ?? 1) + style.lineOffset;
        violations.push(
          `${sourceLocation(file, line)} (@${rule.name} contains a bare design value)`,
        );
      });
    }
  }

  return violations;
}

describe("Flex-only and Token-only style policy", () => {
  it("recognizes style, template, script, fallback, and Grid violations", () => {
    expect(hasBareDesignLiteral("0")).toBe(true);
    expect(hasBareDesignLiteral("calc(var(--pb-spacing-sm) * 2)")).toBe(true);
    expect(hasBareDesignLiteral("var(--pb-spacing-sm)")).toBe(false);
    expect(
      literalTokenFallbackOffsets("var(--pb-color-surface, #fff)"),
    ).toHaveLength(1);
    expect(
      literalTokenFallbackOffsets(
        "var(--pb-color-surface, var(--pb-color-background))",
      ),
    ).toHaveLength(0);
    expect(
      matchingOffsets(
        ':size="Math.max(16, value)"',
        visualTemplateAttributePattern,
      ),
    ).toHaveLength(1);
    expect(
      matchingOffsets("width: 16", visualScriptAssignmentPattern),
    ).toHaveLength(1);
    expect(matchingOffsets('display: "grid"', gridSourcePattern)).toHaveLength(
      1,
    );
    expect(
      matchingOffsets('const gap = "8px"', fixedCssLiteralPattern),
    ).toHaveLength(1);
    expect(inlineStyleViolationOffsets(' style="width: 8px"')).toHaveLength(1);
  });

  it("keeps the design-system implementation free of CSS Grid and fixed design values", async () => {
    const files = (
      await Promise.all(
        designSystemImplementationDirectories.map(findPolicyFiles),
      )
    ).flat();
    expect(await findPolicyViolations(files)).toEqual([]);
  });

  it("keeps prototypes free of CSS Grid and fixed design values", async () => {
    expect(
      await findPolicyViolations(await findPolicyFiles(prototypesDirectory)),
    ).toEqual([]);
  });
});
