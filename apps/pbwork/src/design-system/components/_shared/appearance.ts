export type ComponentSize = "sm" | "md" | "lg";
export type ComponentRadius = "none" | "sm" | "md" | "lg" | "full";
export type ComponentElevation = "none" | "card" | "raised";

export function sizeToken(size: ComponentSize = "md"): string {
  return `sizing.control-${size}`;
}

/** Horizontal padding token paired with control size (sm→sm, md→md, lg→lg). */
export function controlPaddingToken(size: ComponentSize = "md"): string {
  if (size === "sm") return "spacing.sm";
  if (size === "lg") return "spacing.lg";
  return "spacing.md";
}

export function controlSizeStyle(
  size: ComponentSize = "md",
): Record<string, string> {
  const height = sizeToken(size).replace(".", "-");
  const paddingX = controlPaddingToken(size).replace(".", "-");
  return {
    "--pb-component-height": `var(--pb-${height})`,
    "--pb-component-padding-x": `var(--pb-${paddingX})`,
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
