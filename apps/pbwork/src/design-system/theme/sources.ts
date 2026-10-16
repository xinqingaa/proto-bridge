import type {
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
import baseAccentsJson from "@/design-system/theme-packs/base/accents.json";

export type BaseThemeSources = {
  keyCatalog: ThemeKeyCatalog;
  constants: ThemeConstantTable;
  packs: Map<string, ThemePackSource>;
};

/**
 * Synchronous assembly of the key catalog, constant table and base pack from
 * static JSON. Used by tests and later slices (S5/S6); not wired into the
 * runtime loaders yet.
 */
export function loadBaseThemeSources(): BaseThemeSources {
  const basePack = {
    manifest: basePackJson,
    primitives: basePrimitivesJson,
    semantic: baseSemanticJson,
    component: baseComponentJson,
    accents: baseAccentsJson,
  } as unknown as ThemePackSource;
  return {
    keyCatalog: keyCatalogJson as unknown as ThemeKeyCatalog,
    constants: constantsJson as unknown as ThemeConstantTable,
    packs: new Map<string, ThemePackSource>([[basePackJson.id, basePack]]),
  };
}
