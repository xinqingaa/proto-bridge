export type TagTone = "neutral" | "primary" | "success" | "warning" | "error";
export function tagColors(tone: TagTone) {
  return tone === "neutral"
    ? {
        background: "color.surface-variant" as const,
        color: "color.on-surface" as const,
      }
    : {
        background: `color.${tone}-soft` as const,
        color: `color.${tone}` as const,
      };
}
