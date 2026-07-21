export type ComponentSize = "sm" | "md" | "lg";
export type ComponentRadius = "none" | "sm" | "md" | "lg" | "full";
export type ComponentElevation = "none" | "card" | "raised";

export function sizeToken(size: ComponentSize = "md"): string {
  return `sizing.control-${size}`;
}

export function controlSizeStyle(
  size: ComponentSize = "md",
): Record<string, string> {
  return {
    "--pb-component-height": `var(--pb-${sizeToken(size).replace(".", "-")})`,
  };
}

export function elevationToken(elevation: ComponentElevation = "none"): string {
  if (elevation === "raised") return "elevation.raised";
  if (elevation === "card") return "elevation.card";
  return "elevation.none";
}

export function elevationStyle(
  elevation: ComponentElevation = "none",
): Record<string, string> {
  const token = elevationToken(elevation).replace(".", "-");
  return {
    "--pb-component-shadow": `var(--pb-${token}, none)`,
    boxShadow: `var(--pb-${token}, none)`,
  };
}
