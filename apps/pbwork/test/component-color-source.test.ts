import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const designSystemDirectory = resolve("src/design-system");
const forbiddenColorSyntax =
  /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|color-mix\(|linear-gradient\(|radial-gradient\(/i;

async function findVueFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = join(directory, entry.name);
      if (entry.isDirectory()) return findVueFiles(target);
      return entry.isFile() && /\.(?:vue|ts|json)$/.test(entry.name)
        ? [target]
        : [];
    }),
  );
  return nested.flat();
}

describe("design-system color sources", () => {
  it("keeps colors token-driven outside token and theme definitions", async () => {
    const files = (await findVueFiles(designSystemDirectory)).filter((file) => {
      const path = relative(designSystemDirectory, file);
      return !path.startsWith("themes/") && !path.startsWith("tokens/");
    });
    const offenders = (
      await Promise.all(
        files.map(async (file) => {
          const source = await readFile(file, "utf8");
          return forbiddenColorSyntax.test(source) ? file : null;
        }),
      )
    ).filter(Boolean);

    expect(offenders).toEqual([]);
  });
});
