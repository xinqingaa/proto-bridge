import { loadPrototypes } from "@/design-system/loaders";
import {
  runtimeThemeSources,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { themePackCssValues } from "@/design-system/theme/presentation";

export type Mode = "light" | "dark";
export const sources = [
  ...[...runtimeThemeSources.packs.values()]
    .filter((p) => p.manifest.scope !== "prototype")
    .map((p) => ({
      id: p.manifest.id,
      packId: p.manifest.id,
      label: p.manifest.scope === "base" ? "基础 DS" : "样例主题包",
      kind: p.manifest.scope === "base" ? "基础" : "演示",
      note:
        p.manifest.scope === "base"
          ? "所有原型的共同起点"
          : "验证换肤，不绑定正式原型",
    })),
  ...loadPrototypes().map((p) => ({
    id: p.id,
    packId: p.themePackId,
    label: p.label,
    kind: "原型",
    note:
      p.themePackId === "pbwork-base"
        ? "直接使用基础包，无自有覆盖"
        : "原型自己的品牌与主题",
  })),
];
export function pack(id: string) {
  return runtimeThemeSources.packs.get(id)!.manifest;
}
export function sourceById(id: string) {
  return sources.find((s) => s.id === id) ?? sources[0]!;
}
export function valueDiffers(
  packId: string,
  theme: string,
  mode: Mode,
  key: string,
) {
  return (
    JSON.stringify(resolveRuntimeTheme(packId, theme, mode).values[key]) !==
    JSON.stringify(
      resolveRuntimeTheme("pbwork-base", "default", mode).values[key],
    )
  );
}
export function differences(packId: string, theme: string, mode: Mode) {
  return runtimeThemeSources.keyCatalog.keys.filter((k) =>
    valueDiffers(packId, theme, mode, k.id),
  );
}
export function origin(packId: string, theme: string, mode: Mode, key: string) {
  const table = resolveRuntimeTheme(packId, theme, mode);
  if (packId === "pbwork-base") return "基础定义";
  if (table.provenance[key]?.inherited)
    return valueDiffers(packId, theme, mode, key)
      ? "继承规则后重算"
      : "沿用基础值";
  return "当前包定义";
}
export function cssValue(
  packId: string,
  theme: string,
  mode: Mode,
  key: string,
) {
  return themePackCssValues(packId, theme, mode)[key] ?? "—";
}
export const modeItems = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];
