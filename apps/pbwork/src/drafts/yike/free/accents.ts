export type FreeAccent = "tomato" | "pine" | "indigo" | "amber";
export type FreeAppearance = "light" | "dark" | "system";

type Tone = { solid: string; soft: string; on: string };

export const FREE_ACCENTS: Record<
  FreeAccent,
  { label: string; light: Tone; dark: Tone }
> = {
  tomato: {
    label: "番茄红",
    light: { solid: "#e4432a", soft: "#f7d3cb", on: "#ffffff" },
    dark: { solid: "#ff5c40", soft: "#4a2119", on: "#140705" },
  },
  pine: {
    label: "墨绿",
    light: { solid: "#246a52", soft: "#cfe3da", on: "#ffffff" },
    dark: { solid: "#5fc29b", soft: "#183a2e", on: "#06140f" },
  },
  indigo: {
    label: "靛蓝",
    light: { solid: "#3c49bd", soft: "#d6d9f4", on: "#ffffff" },
    dark: { solid: "#8e98ff", soft: "#252a52", on: "#0a0c1f" },
  },
  amber: {
    label: "琥珀",
    light: { solid: "#b87407", soft: "#f2e0bf", on: "#ffffff" },
    dark: { solid: "#f2b23f", soft: "#40300f", on: "#1a1203" },
  },
};
