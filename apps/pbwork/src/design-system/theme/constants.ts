import { ThemeConstantTable } from "@proto-bridge/core/v2";
import constantsJson from "./constants.json";
const constants = new Map(
  ThemeConstantTable.parse(constantsJson).constants.map((entry) => [
    entry.id,
    entry,
  ]),
);
export function themeConstantCss(id: string): string {
  const entry = constants.get(id);
  if (!entry) throw new Error(`UNKNOWN_THEME_CONSTANT:${id}`);
  if (typeof entry.value !== "number") return entry.value;
  return `${entry.value}${entry.valueType === "length" ? "px" : entry.valueType === "duration" ? "ms" : ""}`;
}
export function themeConstantNumber(id: string): number {
  const css = themeConstantCss(id);
  if (!/^-?\d+(?:\.\d+)?(?:px|ms)?$/.test(css))
    throw new Error(`THEME_CONSTANT_NOT_NUMBER:${id}`);
  return Number.parseFloat(css);
}
