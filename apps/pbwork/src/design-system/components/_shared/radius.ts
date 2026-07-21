export type RadiusSize = "none" | "sm" | "md" | "lg" | "full" | "xs" | "xl";

export function radiusVar(size: RadiusSize = "md"): string {
  return `var(--pb-radius-${size})`;
}

export function radiusStyle(size: RadiusSize = "md"): Record<string, string> {
  return { borderRadius: radiusVar(size) };
}
