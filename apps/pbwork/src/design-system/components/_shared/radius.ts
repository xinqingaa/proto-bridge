export type RadiusSize = "none" | "sm" | "md" | "lg" | "full" | "xs" | "xl";

export function radiusVar(size: RadiusSize = "md"): string {
  return size === "none"
    ? "var(--pb-layout-zero)"
    : `var(--pb-${radiusToken(size).replaceAll(".", "-")})`;
}

export function radiusStyle(size: RadiusSize = "md"): Record<string, string> {
  return {
    "--pb-component-radius": radiusVar(size),
    borderRadius: radiusVar(size),
  };
}

export function radiusToken(size: RadiusSize = "md") {
  return {
    none: "none",
    xs: "radius.mark",
    sm: "radius.control-compact",
    md: "radius.control",
    lg: "radius.surface",
    xl: "radius.overlay",
    full: "radius.pill",
  }[size];
}
