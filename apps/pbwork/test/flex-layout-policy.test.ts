import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const designSystemDirectory = resolve("src/design-system");
const prototypesDirectory = resolve("src/prototypes");
const legacyPrototypeDirectory = resolve("src/prototypes/cold-chain-ops");
const styleFilePattern = /\.(?:vue|css|scss|sass|less)$/;

const forbiddenDeclarations = [
  {
    label: "display: grid",
    pattern: /^\s*display\s*:\s*(?:inline-)?grid\b/i,
  },
  {
    label: "grid layout property",
    pattern: /^\s*grid(?:-[a-z-]+)?\s*:/i,
  },
  {
    label: "place-* layout shorthand",
    pattern: /^\s*place-(?:items|content|self)\s*:/i,
  },
];

async function findStyleFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) {
        return target === legacyPrototypeDirectory ? [] : findStyleFiles(target);
      }
      return entry.isFile() && styleFilePattern.test(entry.name) ? [target] : [];
    }),
  );
  return nested.flat();
}

async function findForbiddenLayoutDeclarations(files: string[]) {
  const offenders = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, "utf8");
      return source
        .split("\n")
        .flatMap((line, index) => {
          const match = forbiddenDeclarations.find(({ pattern }) =>
            pattern.test(line),
          );
          return match
            ? [`${relative(resolve("."), file)}:${index + 1} (${match.label})`]
            : [];
        });
    }),
  );
  return offenders.flat();
}

describe("Flex-only layout policy", () => {
  it("keeps the design system free of CSS Grid layout declarations", async () => {
    const offenders = await findForbiddenLayoutDeclarations(
      await findStyleFiles(designSystemDirectory),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps future prototypes free of CSS Grid without changing cold-chain-ops", async () => {
    const offenders = await findForbiddenLayoutDeclarations(
      await findStyleFiles(prototypesDirectory),
    );
    expect(offenders).toEqual([]);
  });
});
