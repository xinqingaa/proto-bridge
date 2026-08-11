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

  // Button / control Token-ref color slots (preferred over legacy tone×variant).
  if (typeof props.bgColor === "string" && props.bgColor.length > 0) {
    if ("background" in result) result.background = props.bgColor;
  }
  if (typeof props.borderColor === "string" && props.borderColor.length > 0) {
    if ("border" in result) result.border = props.borderColor;
  }
  if (typeof props.textColor === "string" && props.textColor.length > 0) {
    if ("onBackground" in result) result.onBackground = props.textColor;
    if ("text" in result) result.text = props.textColor;
  }
  if (
    typeof props.selectedColor === "string" &&
    props.selectedColor.length > 0
  ) {
    if ("selected" in result) result.selected = props.selectedColor;
  }
  if (
    typeof props.uncheckedBorderColor === "string" &&
    props.uncheckedBorderColor.length > 0
  ) {
    if ("uncheckedBorder" in result) {
      result.uncheckedBorder = props.uncheckedBorderColor;
    }
  }
  if (typeof props.color === "string" && props.color.length > 0) {
    if ("selected" in result) result.selected = props.color;
    if ("active" in result) result.active = props.color;
    if ("color" in result) result.color = props.color;
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

  const tabVariant =
    typeof props.variant === "string"
      ? props.variant
      : typeof props.selectionStyle === "string" &&
          props.selectionStyle !== "pill"
        ? props.selectionStyle === "text"
          ? "minimal"
          : props.selectionStyle
        : undefined;

  if (tabVariant === "underline" || tabVariant === "minimal") {
    if ("activeBackground" in result) {
      result.activeBackground = "transparent";
    }
    if ("radius" in result) {
      result.radius = "radius.md";
    }
  } else if (props.selectionStyle === "pill") {
    if ("activeBackground" in result) {
      result.activeBackground =
        staticBindings.activeBackground ?? "color.primary-soft";
    }
    if ("radius" in result) {
      result.radius = "radius.full";
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
