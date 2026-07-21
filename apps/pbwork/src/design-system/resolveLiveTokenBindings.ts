/**
 * Resolve contract tokenBindings against live playground props
 * so the inspector reflects the current radius / tone / elevation.
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
      if (key === "background" || key === "color" || key === "indicator") {
        const current = result[key] ?? "";
        const wantsSoft = current.endsWith("-soft");
        if (tone === "neutral") {
          result[key] = "color.on-surface";
        } else if (wantsSoft) {
          result[key] = `color.${tone}-soft`;
        } else {
          result[key] = `color.${tone}`;
        }
      }
      if (key === "onBackground") {
        // Solid fills use light-on-fill; dedicated on-* tokens only for primary today.
        result[key] = "color.on-primary";
      }
    }
  }

  if (typeof props.variant === "string" && "background" in result) {
    const tone = typeof props.tone === "string" ? props.tone : "primary";
    if (props.variant === "tonal") result.background = `color.${tone}-soft`;
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
    }
  }

  if (typeof props.elevation === "string" && "elevation" in result) {
    result.elevation = `elevation.${props.elevation}`;
  }

  if (typeof props.background === "string" && "surface" in result) {
    result.surface =
      props.background === "transparent"
        ? "transparent"
        : `color.${props.background}`;
  }

  if (typeof props.activeStyle === "string" && "activeBackground" in result) {
    const tone = typeof props.tone === "string" ? props.tone : "primary";
    result.activeBackground =
      props.activeStyle === "tonal" ? `color.${tone}-soft` : "transparent";
  }

  if (typeof props.showDivider === "boolean" && "border" in result) {
    result.border = props.showDivider ? "color.divider" : "transparent";
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
