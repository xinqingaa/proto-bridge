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
    const colorToken =
      props.tone === "neutral" ? "color.on-surface" : `color.${props.tone}`;
    for (const key of Object.keys(result)) {
      if (key === "background" || key === "color" || key === "indicator") {
        result[key] = colorToken;
      }
      if (key === "onBackground") {
        // Solid fills use light-on-fill; dedicated on-* tokens only for primary today.
        result[key] = "color.on-primary";
      }
    }
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
