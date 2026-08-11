import {
  BIND_TOKEN_IDS,
  BIND_TOKEN_SPECIAL_VALUES,
  isAllowedTokenBindingValue,
  type BindTokenId,
} from "@/design-system/bindTokens";

/** Color tokens from the Bind pool (plus special values for slots). */
export const BIND_COLOR_TOKEN_IDS = BIND_TOKEN_IDS.filter((id) =>
  id.startsWith("color."),
) as BindTokenId[];

export type ColorTokenRef =
  (typeof BIND_COLOR_TOKEN_IDS)[number] | "transparent";

const ON_PAIR: Record<string, string> = {
  "color.action": "color.on-action",
  "color.primary": "color.on-primary",
  "color.secondary": "color.on-secondary",
  "color.error": "color.on-error",
  "color.success": "color.on-success",
  "color.warning": "color.on-warning",
  "color.info": "color.on-info",
  "color.background": "color.on-background",
  "color.surface": "color.on-surface",
  "color.surface-variant": "color.on-surface",
  "color.surface-selected": "color.on-surface",
  "color.surface-raised": "color.on-surface",
};

const SOFT_TO_SOLID: Record<string, string> = {
  "color.action-soft": "color.action",
  "color.primary-soft": "color.primary",
  "color.secondary-soft": "color.secondary",
  "color.error-soft": "color.error",
  "color.success-soft": "color.success",
  "color.warning-soft": "color.warning",
};

export function isColorTokenRef(value: string): value is ColorTokenRef {
  return (
    value === "transparent" ||
    (BIND_COLOR_TOKEN_IDS as readonly string[]).includes(value)
  );
}

export function assertColorTokenRef(
  value: string | undefined,
  fallback: ColorTokenRef,
): ColorTokenRef {
  if (!value) return fallback;
  if (isColorTokenRef(value) && isAllowedTokenBindingValue(value)) return value;
  return fallback;
}

/** `color.action` → `var(--pb-color-action)`; `transparent` → `transparent`. */
export function colorTokenCss(tokenId: ColorTokenRef | string): string {
  if (
    tokenId === "transparent" ||
    BIND_TOKEN_SPECIAL_VALUES.includes(tokenId as never)
  ) {
    return "transparent";
  }
  return `var(--pb-${tokenId.replace(/\./g, "-")})`;
}

/**
 * Default text color for a fill token:
 * - solid brand/feedback → paired `on-*`
 * - `*-soft` → solid counterpart
 * - transparent → fallback
 */
export function defaultTextColorForBg(
  bgColor: ColorTokenRef,
  fallback: ColorTokenRef = "color.on-action",
): ColorTokenRef {
  if (bgColor === "transparent") return fallback;
  if (SOFT_TO_SOLID[bgColor]) {
    return SOFT_TO_SOLID[bgColor] as ColorTokenRef;
  }
  if (ON_PAIR[bgColor]) {
    return ON_PAIR[bgColor] as ColorTokenRef;
  }
  return fallback;
}

export function resolveButtonColors(input: {
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}): {
  bgColor: ColorTokenRef;
  borderColor: ColorTokenRef;
  textColor: ColorTokenRef;
} {
  const bgColor = assertColorTokenRef(input.bgColor, "color.action");
  const borderColor = assertColorTokenRef(input.borderColor, bgColor);
  const textFallback =
    bgColor === "transparent"
      ? borderColor === "transparent"
        ? "color.action"
        : borderColor
      : defaultTextColorForBg(bgColor, "color.on-action");
  const textColor = assertColorTokenRef(input.textColor, textFallback);
  return { bgColor, borderColor, textColor };
}

export const COLOR_TOKEN_SELECT_OPTIONS = [
  { label: "transparent", value: "transparent" },
  ...BIND_COLOR_TOKEN_IDS.map((id) => ({ label: id, value: id })),
];
