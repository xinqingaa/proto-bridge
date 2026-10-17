import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

function isThemeAsset(file: string): boolean {
  return (
    file.includes("/assets/") &&
    (file.includes("/theme-packs/") || file.includes("/prototypes/"))
  );
}

/** Asset digests use original bytes, independent of Vite's emitted URL. */
export function themeAssetsPlugin(): Plugin {
  const root = fileURLToPath(new URL("..", import.meta.url));
  return {
    name: "pbwork-theme-assets",
    resolveId(id) {
      if (id === "virtual:pbwork-theme-assets") return "\0pbwork-theme-assets";
    },
    load(id) {
      if (id !== "\0pbwork-theme-assets") return;
      const hashes = collectThemeAssetHashes(root, (path) =>
        this.addWatchFile(path),
      );
      return `export default ${JSON.stringify(hashes)};`;
    },
    handleHotUpdate(ctx) {
      if (!isThemeAsset(ctx.file)) return;
      const modules = [...ctx.server.moduleGraph.idToModuleMap.values()].filter(
        (mod) => mod.id?.includes("pbwork-theme-assets") ?? false,
      );
      for (const mod of modules) ctx.server.moduleGraph.invalidateModule(mod);
      return [...ctx.modules, ...modules];
    },
  };
}

export function collectThemeAssetHashes(
  root: string,
  onFile: (path: string) => void = () => {},
): Record<string, string> {
  const hashes: Record<string, string> = {};
  const visit = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        /\/src\/(?:design-system\/theme-packs\/[^/]+|prototypes\/[^/]+\/theme)\/assets\//.test(
          path,
        )
      ) {
        onFile(path);
        hashes[`/${relative(root, path).replaceAll("\\", "/")}`] = createHash(
          "sha1",
        )
          .update(readFileSync(path))
          .digest("hex");
      }
    }
  };
  visit(resolve(root, "src/design-system/theme-packs"));
  visit(resolve(root, "src/prototypes"));
  return hashes;
}
