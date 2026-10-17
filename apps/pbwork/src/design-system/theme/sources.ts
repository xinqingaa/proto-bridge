import {
  ThemeConstantTable,
  ThemeKeyCatalog,
  ThemePackSource,
} from "@proto-bridge/core/v2";
import { assembleThemeKeyCatalog } from "./key-catalog";
import constantsJson from "@/design-system/theme/constants.json";
import basePackJson from "@/design-system/theme-packs/base/pack.json";
import basePrimitivesJson from "@/design-system/theme-packs/base/primitives.json";
import baseSemanticJson from "@/design-system/theme-packs/base/semantic.json";
import baseComponentJson from "@/design-system/theme-packs/base/component.json";
import assetHashes from "virtual:pbwork-theme-assets";

const componentContracts = import.meta.glob(
  "/src/design-system/components/contracts/*.json",
  { eager: true, import: "default" },
) as Record<string, { id: string; componentTokens?: Record<string, unknown> }>;

export function loadThemeKeyCatalog(
  contracts = Object.values(componentContracts),
): ThemeKeyCatalog {
  return assembleThemeKeyCatalog(contracts);
}

export type BaseThemeSources = {
  keyCatalog: ThemeKeyCatalog;
  constants: ThemeConstantTable;
  packs: Map<string, ThemePackSource>;
};

/**
 * Synchronous assembly of the key catalog, constant table and base pack from
 * static JSON. This base-only source is also used by equivalence tests.
 */
export function loadBaseThemeSources(): BaseThemeSources {
  const basePack = {
    manifest: basePackJson,
    primitives: basePrimitivesJson,
    semantic: baseSemanticJson,
    component: baseComponentJson,
  };
  return {
    keyCatalog: loadThemeKeyCatalog(),
    constants: ThemeConstantTable.parse(constantsJson),
    packs: new Map<string, ThemePackSource>([
      [basePackJson.id, ThemePackSource.parse(basePack)],
    ]),
  };
}

const jsonModules = import.meta.glob(
  [
    "/src/design-system/theme-packs/*/{pack,primitives,semantic,component}.json",
    "/src/prototypes/*/theme/{pack,primitives,semantic,component}.json",
  ],
  { eager: true, import: "default" },
);
const assetModules = import.meta.glob(
  [
    "/src/design-system/theme-packs/*/assets/**/*",
    "/src/prototypes/*/theme/assets/**/*",
  ],
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const assetUrls = new Map<string, string>();

export function loadThemeSources(): BaseThemeSources {
  const sources = loadBaseThemeSources();
  sources.packs.clear();
  assetUrls.clear();
  for (const [path, manifest] of Object.entries(jsonModules)) {
    if (!path.endsWith("/pack.json")) continue;
    const dir = path.slice(0, -"pack.json".length);
    const files: Record<string, string> = {};
    for (const [assetPath, digest] of Object.entries(assetHashes)) {
      if (assetPath.startsWith(`${dir}assets/`))
        files[assetPath.slice(dir.length)] = digest;
    }
    const ownerPrototypeId = /^\/src\/prototypes\/([^/]+)\/theme\/$/.exec(
      dir,
    )?.[1];
    const source = ThemePackSource.parse({
      manifest,
      primitives: jsonModules[`${dir}primitives.json`],
      semantic: jsonModules[`${dir}semantic.json`],
      component: jsonModules[`${dir}component.json`],
      files,
      ...(ownerPrototypeId ? { ownerPrototypeId } : {}),
    });
    if (sources.packs.has(source.manifest.id))
      throw new Error(`DUPLICATE_THEME_PACK:${source.manifest.id}`);
    sources.packs.set(source.manifest.id, source);
    for (const file of Object.keys(files)) {
      const url = assetModules[`${dir}${file}`];
      if (!url)
        throw new Error(
          `THEME_ASSET_URL_MISSING:${source.manifest.id}/${file}`,
        );
      assetUrls.set(`${source.manifest.id}/${file}`, url);
    }
  }
  return sources;
}

export function themeAssetUrl(packId: string, file: string): string {
  const url = assetUrls.get(`${packId}/${file}`);
  if (!url) throw new Error(`THEME_ASSET_URL_MISSING:${packId}/${file}`);
  return url;
}
