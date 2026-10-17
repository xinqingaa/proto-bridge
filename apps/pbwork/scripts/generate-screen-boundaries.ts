import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { URL, fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../src/prototypes/", import.meta.url));
export async function generateScreenBoundaries(directory = root) {
  const result: Record<string, unknown> = {};
  async function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name === "screen.ts") {
        const screen = (await import(pathToFileURL(file).href)).default;
        if (result[screen.screenId])
          throw new Error(`DUPLICATE_SCREEN:${screen.screenId}`);
        result[screen.screenId] = screen.variants.find(
          (variant: { id: string }) => variant.id === screen.defaultVariantId,
        ).requiredFragments;
      }
    }
  }
  await walk(directory);
  return JSON.stringify(result, null, 2) + "\n";
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(path.join(root, "generated"), { recursive: true });
  writeFileSync(
    path.join(root, "generated/default-boundaries.json"),
    await generateScreenBoundaries(),
  );
}
