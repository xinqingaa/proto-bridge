/**
 * Resolve contract tokenBindings against live playground props
 * so the inspector reflects the current size / tone / elevation / selection.
 */
export function resolveLiveTokenBindings(
  staticBindings: Record<string, string>,
  props: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = { ...staticBindings };

  if (typeof props.radius === "string" && props.radius.length > 0) {
    for (const [key, value] of Object.entries(result)) {
      if (key === "radius" || value.startsWith("radius.")) {
        result[key] = `radius.${props.radius}`;
      }
    }
  }

  if (typeof props.tone === "string" && props.tone.length > 0) {
    const tone = props.tone;
    for (const key of Object.keys(result)) {
      if (
        key === "background" ||
        key === "color" ||
        key === "indicator" ||
        key === "accent"
      ) {
        const current = result[key] ?? "";
        const wantsSoft = current.endsWith("-soft");
        result[key] = wantsSoft ? `color.${tone}-soft` : `color.${tone}`;
      }
      if (key === "onBackground" || key === "text") {
        result[key] = `color.on-${tone}`;
      }
    }
  }

  if (typeof props.variant === "string" && "background" in result) {
    const tone =
      typeof props.tone === "string"
        ? props.tone
        : (result.background?.match(/^color\.([a-z0-9]+)/)?.[1] ?? "primary");
    if (props.variant === "tonal") result.background = `color.${tone}-soft`;
    if (
      props.variant === "flat" ||
      props.variant === "outlined" ||
      props.variant === "text"
    ) {
      // Flat / outlined / text report the solid tone token for the color slot.
      if (result.background?.endsWith("-soft")) {
        result.background = `color.${tone}`;
      }
    }
  }

  if (typeof props.size === "string" && props.size.length > 0) {
    for (const [key, value] of Object.entries(result)) {
      if (
        key === "height" ||
        key === "size" ||
        value.startsWith("sizing.control-")
      ) {
        result[key] = `sizing.control-${props.size}`;
      }
      if (key === "paddingX") {
        result[key] =
          props.size === "sm"
            ? "spacing.sm"
            : props.size === "lg"
              ? "spacing.lg"
              : "spacing.md";
      }
    }
  }

  if (typeof props.elevation === "string" && "elevation" in result) {
    result.elevation = `elevation.${props.elevation}`;
  }

  if (typeof props.selectionStyle === "string") {
    if ("activeBackground" in result) {
      result.activeBackground =
        props.selectionStyle === "pill"
          ? (staticBindings.activeBackground ?? "color.primary-soft")
          : "transparent";
    }
    if ("radius" in result) {
      result.radius =
        props.selectionStyle === "pill" ? "radius.full" : "radius.md";
    }
  }

  if (typeof props.showDivider === "boolean" && "border" in result) {
    result.border = props.showDivider
      ? staticBindings.border?.startsWith("border.") ||
        staticBindings.border?.startsWith("color.")
        ? staticBindings.border!
        : "border.hairline"
      : "transparent";
  }

  if ("elevated" in props) {
    for (const [key, value] of Object.entries(result)) {
      if (
        key === "elevation" ||
        value.startsWith("elevation.") ||
        value === "none"
      ) {
        const elevatedToken =
          staticBindings[key]?.startsWith("elevation.") === true
            ? staticBindings[key]!
            : "elevation.card";
        result[key] = props.elevated ? elevatedToken : "none";
      }
    }
  }

  return result;
}
