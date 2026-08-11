/**
 * Bind tokens: the id pool that general component contracts may reference in
 * `tokenBindings`. All values still live in `tokens.json`; this file only
 * declares which ids are allowed for binding.
 *
 * Other tokens remain browsable in Foundations but must not appear in
 * component contracts (except special values `transparent` / `none`).
 */
export const BIND_TOKEN_IDS = [
  // Color — surfaces & text
  "color.background",
  "color.surface",
  "color.surface-variant",
  "color.surface-selected",
  "color.surface-raised",
  "color.on-background",
  "color.on-surface",
  "color.on-surface-muted",
  // Color — brand & feedback
  "color.primary",
  "color.navigation-active",
  "color.section-tab-active",
  "color.primary-soft",
  "color.on-primary",
  "color.action",
  "color.action-soft",
  "color.on-action",
  "color.secondary",
  "color.secondary-soft",
  "color.on-secondary",
  "color.error",
  "color.error-soft",
  "color.on-error",
  "color.success",
  "color.success-soft",
  "color.on-success",
  "color.warning",
  "color.warning-soft",
  "color.on-warning",
  "color.info",
  "color.on-info",
  // Color — lines & overlay
  "color.border",
  "color.outline",
  "color.divider",
  "color.disabled",
  "color.scrim",
  // Typography — component common
  "typography.title",
  "typography.subtitle",
  "typography.content",
  "typography.label",
  "typography.caption",
  "typography.caption-strong",
  // Spacing / sizing / radius
  "spacing.xs",
  "spacing.sm",
  "spacing.sm-plus",
  "spacing.md",
  "spacing.lg",
  "sizing.control-sm",
  "sizing.control-md",
  "sizing.control-lg",
  "sizing.icon-sm",
  "sizing.icon-md",
  "sizing.icon-lg",
  "sizing.avatar-md",
  "sizing.touch",
  "sizing.menu-item",
  "sizing.bottom-navigation",
  "radius.xs",
  "radius.sm",
  "radius.md",
  "radius.lg",
  "radius.xl",
  "radius.full",
  // Border / elevation / motion
  "border.hairline",
  "elevation.none",
  "elevation.level-1",
  "elevation.card",
  "elevation.raised",
  "elevation.level-3",
  "elevation.level-4",
  "elevation.level-5",
  "motion.duration-fast",
  "motion.duration-normal",
  "motion.duration-slow",
  "motion.easing-standard",
  // Opacity — shared interaction states
  "opacity.disabled",
] as const;

export type BindTokenId = (typeof BIND_TOKEN_IDS)[number];

/** Allowed in `tokenBindings` without being a registered token id. */
export const BIND_TOKEN_SPECIAL_VALUES = ["transparent", "none"] as const;

const bindSet = new Set<string>(BIND_TOKEN_IDS);
const specialSet = new Set<string>(BIND_TOKEN_SPECIAL_VALUES);

export function isBindTokenId(tokenId: string): boolean {
  return bindSet.has(tokenId);
}

/** True when a contract `tokenBindings` value is allowed. */
export function isAllowedTokenBindingValue(tokenId: string): boolean {
  return specialSet.has(tokenId) || bindSet.has(tokenId);
}
