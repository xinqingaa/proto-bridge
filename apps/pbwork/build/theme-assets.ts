import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import type { Plugin } from "vite";

/** Asset digests use original bytes, independent of Vite's emitted URL. */
export function themeAssetsPlugin(): Plugin {
  let root = "";
  return {
    name: "pbwork-theme-assets",
    configResolved(config) {
      root = config.root;
    },
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
      if (
        ctx.file.includes("/assets/") &&
        (ctx.file.includes("/theme-packs/") ||
          ctx.file.includes("/prototypes/"))
      ) {
        const module = ctx.server.moduleGraph.getModuleById(
          "\0pbwork-theme-assets",
        );
        if (module) {
          ctx.server.moduleGraph.invalidateModule(module);
          return [...ctx.modules, module];
        }
      }
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
