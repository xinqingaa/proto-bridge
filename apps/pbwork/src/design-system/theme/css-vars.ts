import {
  buildThemeKeyIndex,
  type ResolvedThemeAsset,
  type ResolvedThemeBorder,
  type ResolvedThemeTable,
  type ResolvedThemeTypography,
  type ResolvedThemeValue,
  type ThemeConstantTable,
  type ThemeKeyCatalog,
} from "@proto-bridge/core/v2";

const length = (value: unknown) =>
  typeof value === "number" ? `${value}px` : String(value);
const family = (value: readonly string[]) =>
  value
    .map((name) => (/\s/.test(name) ? JSON.stringify(name) : name))
    .join(", ");

/** Generate CSS only from the declared value type; key prefixes never determine units. */
export function themeTableToCssVars(
  table: ResolvedThemeTable,
  catalog: ThemeKeyCatalog,
  constants: ThemeConstantTable,
  assetUrl?: (packId: string, file: string) => string,
): Record<string, string> {
  const result: Record<string, string> = {};
  const sources = new Map<string, string>();
  const put = (id: string, css: string) => {
    const variable = `--pb-${id.replaceAll(".", "-")}`;
    const previous = sources.get(variable);
    if (previous !== undefined)
      throw new Error(`CSS_VAR_COLLISION:${variable}:${previous}:${id}`);
    sources.set(variable, id);
    result[variable] = css;
  };
  const convert = (type: string, value: ResolvedThemeValue): string => {
    if (type === "length") return length(value);
    if (type === "duration") return `${value}ms`;
    if (type === "family-list") return family(value as string[]);
    if (type === "typography") {
      const typography = value as ResolvedThemeTypography;
      return `${typography.weight} ${length(typography.size)}/${typography.lineHeight} ${family(typography.family)}`;
    }
    if (type === "border") {
      const border = value as ResolvedThemeBorder;
      return `${length(border.width)} ${border.style} ${border.color}`;
    }
    if (type === "asset" && value !== "none") {
      const asset = value as ResolvedThemeAsset;
      if (!assetUrl)
        throw new Error(
          `THEME_ASSET_URL_MISSING:${asset.packId}/${asset.file}`,
        );
      return `url(${JSON.stringify(assetUrl(asset.packId, asset.file))})`;
    }
    return String(value);
  };
  const keys = buildThemeKeyIndex(catalog);
  for (const [id, value] of Object.entries(table.values)) {
    const key = keys.get(id);
    if (!key) throw new Error(`UNKNOWN_THEME_KEY:${id}`);
    put(id, convert(key.valueType, value));
    if (key.valueType === "typography") {
      const typography = value as ResolvedThemeTypography;
      put(
        `${id}-variant-numeric`,
        typography.features.includes("tnum") ? "tabular-nums" : "normal",
      );
    }
  }
  for (const constant of constants.constants) {
    const value = table.constants[constant.id];
    if (value === undefined)
      throw new Error(`THEME_CONSTANT_MISSING:${constant.id}`);
    put(constant.id, convert(constant.valueType, value));
  }
  return result;
}
