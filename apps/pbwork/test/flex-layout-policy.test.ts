import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { parse as parseSfc } from "vue/compiler-sfc";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const designSystemDirectory = resolve("src/design-system");
const prototypesDirectory = resolve("src/prototypes");
const historicPrototypeDirectory = resolve("src/prototypes/cold-chain-ops");
const styleFilePattern = /\.(?:vue|css|scss|sass|less)$/;

type StyleSource = {
  content: string;
  lineOffset: number;
};

async function findStyleFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) {
        return target === historicPrototypeDirectory ? [] : findStyleFiles(target);
      }
      return entry.isFile() && styleFilePattern.test(entry.name) ? [target] : [];
    }),
  );
  return nested.flat();
}

async function readStyleSources(file: string): Promise<StyleSource[]> {
  const source = await readFile(file, "utf8");
  if (extname(file) !== ".vue") return [{ content: source, lineOffset: 0 }];

  const parsed = parseSfc(source, { filename: file });
  if (parsed.errors.length > 0) {
    throw new Error(`${relative(resolve("."), file)} cannot be parsed as an SFC`);
  }
  return parsed.descriptor.styles.map((style) => ({
    content: style.content,
    lineOffset: style.loc.start.line - 1,
  }));
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

function sourceLocation(file: string, line: number): string {
  return `${relative(resolve("."), file)}:${line}`;
}

function literalTokenFallbackOffsets(value: string): number[] {
  const offsets: number[] = [];
  for (let start = value.indexOf("var("); start >= 0; start = value.indexOf("var(", start + 4)) {
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

function hasLiteralTokenFallback(value: string): boolean {
  return literalTokenFallbackOffsets(value).length > 0;
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

function hasBareDesignLiteral(property: string, value: string): boolean {
  const remaining = stripTokenVars(value);
  if (/(?:#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\bcolor-mix\(|\b(?:linear|radial)-gradient\()/i.test(remaining)) {
    return true;
  }
  if (/[+-]?(?:\d*\.\d+|\d+)(?:px|rem|em|%|vh|vw|vmin|vmax|ms|s|deg)(?=$|[^a-z])/i.test(remaining)) {
    return true;
  }
  if (
    ["opacity", "z-index", "font-weight", "line-height", "letter-spacing"].includes(property) &&
    /[+-]?(?:\d*\.\d+|\d+)\b/.test(remaining)
  ) {
    return true;
  }
  if (
    (property === "transition" || property === "transition-timing-function") &&
    /\b(?:ease|ease-in|ease-out|ease-in-out|linear)\b/.test(remaining)
  ) {
    return true;
  }
  return false;
}

async function findPolicyViolations(files: string[]) {
  const violations: string[] = [];

  for (const file of files) {
    const allSource = await readFile(file, "utf8");
    if (extname(file) === ".vue") {
      const parsed = parseSfc(allSource, { filename: file });
      for (const block of [parsed.descriptor.script, parsed.descriptor.scriptSetup]) {
        if (!block) continue;
        for (const offset of literalTokenFallbackOffsets(block.content)) {
          violations.push(
            `${sourceLocation(file, block.loc.start.line + lineAt(block.content, offset) - 1)} (literal Token fallback)`,
          );
        }
      }
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
        if (hasLiteralTokenFallback(value)) {
          violations.push(`${location} (literal Token fallback)`);
        }
        if (hasBareDesignLiteral(property, value)) {
          violations.push(`${location} (${property} contains a bare design value)`);
        }
      });
    }
  }

  return violations;
}

describe("Flex-only and Token-only style policy", () => {
  it("keeps the design system free of CSS Grid and bare design values", async () => {
    expect(
      await findPolicyViolations(await findStyleFiles(designSystemDirectory)),
    ).toEqual([]);
  });

  it("keeps active prototypes free of CSS Grid and bare design values", async () => {
    expect(
      await findPolicyViolations(await findStyleFiles(prototypesDirectory)),
    ).toEqual([]);
  });
});
