import {
  ThemeConstantTable,
  ThemeKeyCatalog,
  ThemePackSource,
} from "@proto-bridge/core/v2";
import keyCatalogJson from "@/design-system/theme/key-catalog.json";
import constantsJson from "@/design-system/theme/constants.json";
import basePackJson from "@/design-system/theme-packs/base/pack.json";
import basePrimitivesJson from "@/design-system/theme-packs/base/primitives.json";
import baseSemanticJson from "@/design-system/theme-packs/base/semantic.json";
import baseComponentJson from "@/design-system/theme-packs/base/component.json";

export type BaseThemeSources = {
  keyCatalog: ThemeKeyCatalog;
  constants: ThemeConstantTable;
  packs: Map<string, ThemePackSource>;
};

/**
 * Synchronous assembly of the key catalog, constant table and base pack from
 * static JSON. Used by theme preparation tests; not wired into the
 * runtime loaders yet.
 */
export function loadBaseThemeSources(): BaseThemeSources {
  const basePack = {
    manifest: basePackJson,
    primitives: basePrimitivesJson,
    semantic: baseSemanticJson,
    component: baseComponentJson,
  };
  return {
    keyCatalog: ThemeKeyCatalog.parse(keyCatalogJson),
    constants: ThemeConstantTable.parse(constantsJson),
    packs: new Map<string, ThemePackSource>([
      [basePackJson.id, ThemePackSource.parse(basePack)],
    ]),
  };
}
