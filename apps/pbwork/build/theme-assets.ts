import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

function isThemeAsset(file: string): boolean {
  return (
    file.includes("/glyphs/") ||
    file.endsWith("/artwork.json") ||
    (file.includes("/assets/") &&
      (file.includes("/theme-packs/") || file.includes("/prototypes/")))
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
        entry.name === "artwork.json" &&
        /\/(?:theme|theme-packs\/[^/]+)\/artwork\.json$/.test(path)
      ) {
        onFile(path);
        const catalog = JSON.parse(readFileSync(path, "utf8"));
        for (const asset of catalog.assets) {
          if (!/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*\.svg$/.test(asset.sourceFile))
            throw new Error(`Invalid SVG source: ${asset.sourceFile}`);
          const source = resolve(
            root,
            "src/design-system/components/_shared/glyphs",
            asset.sourceFile,
          );
          onFile(source);
          const key = `/${relative(root, resolve(dir, asset.file)).replaceAll("\\", "/")}`;
          if (hashes[key]) throw new Error(`Duplicate theme asset: ${key}`);
          hashes[key] = createHash("sha1")
            .update(readFileSync(source))
            .digest("hex");
        }
      } else if (
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
