export type ComponentSize = "sm" | "md" | "lg";
export type ComponentRadius = "none" | "sm" | "md" | "lg" | "full";
export type ComponentElevation = "none" | "card" | "raised";

export function sizeToken(size: ComponentSize = "md"): string {
  return {
    sm: "size.control-compact",
    md: "size.control",
    lg: "size.control-large",
  }[size];
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
  if (elevation === "card") return "elevation.surface";
  return "elevation.none";
}

export function elevationStyle(
  elevation: ComponentElevation = "none",
): Record<string, string> {
  const token = elevationToken(elevation).replace(".", "-");
  return {
    "--pb-component-shadow": `var(--pb-${token})`,
    boxShadow: `var(--pb-${token})`,
  };
}

export function iconSizeToken(size: ComponentSize = "md") {
  return { sm: "size.icon-inline", md: "size.icon", lg: "size.icon-prominent" }[
    size
  ];
}
export function avatarSizeToken(size: ComponentSize = "md") {
  return {
    sm: "size.avatar-compact",
    md: "size.avatar",
    lg: "size.avatar-large",
  }[size];
}
