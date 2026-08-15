import { TOKEN_BINDING_LITERALS } from "@proto-bridge/core/v2";

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
  "color.surface-recessed",
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
  "color.toast",
  "color.on-toast",
  // Typography — component common
  "typography.title",
  "typography.subtitle",
  "typography.content",
  "typography.label",
  "typography.caption",
  "typography.caption-strong",
  "typography.micro",
  // Spacing / sizing / radius
  "spacing.none",
  "spacing.xxs",
  "spacing.xs",
  "spacing.xs-plus",
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
  "sizing.icon-compact",
  "sizing.avatar-md",
  "sizing.avatar-lg",
  "sizing.touch",
  "sizing.menu-item",
  "sizing.bottom-navigation",
  "sizing.indicator-thickness",
  "sizing.caret",
  "sizing.step-dot",
  "sizing.refresh-action-min-width",
  "sizing.refresh-action-height",
  "sizing.progress-stroke",
  "sizing.progress-track",
  "sizing.textarea-rows",
  "radius.none",
  "radius.xs",
  "radius.sm",
  "radius.md",
  "radius.lg",
  "radius.xl",
  "radius.full",
  // Border / elevation / motion
  "border.hairline",
  "border.default",
  "border.focus",
  "border.width-hairline",
  "border.accent-width",
  "elevation.none",
  "elevation.level-1",
  "elevation.card",
  "elevation.raised",
  "elevation.glass",
  "elevation.level-3",
  "elevation.level-4",
  "elevation.level-5",
  "motion.duration-fast",
  "motion.duration-normal",
  "motion.duration-slow",
  "motion.duration-sheet",
  "motion.duration-tab-viewport",
  "motion.duration-toast",
  "motion.duration-instant",
  "motion.easing-standard",
  "motion.easing-gentle",
  "motion.scale-pressed",
  "motion.scale-pressed-strong",
  "motion.rotate-half-turn",
  // Opacity — shared interaction states
  "opacity.disabled",
  "opacity.glass",
  "opacity.hidden",
  "opacity.visible",
  // Layout / layer / effects
  "layout.fill",
  "layout.half",
  "layout.half-negative",
  "layout.translate-full-negative",
  "layout.focus-inset",
  "layout.sheet-max-height",
  "layout.load-more-root-margin",
  "layout.menu-max-height",
  "layout.dialog-max-width",
  "layout.form-max-width",
  "layout.pull-refresh-threshold",
  "layout.pull-refresh-max-distance",
  "layout.inset-xs-negative",
  "layout.inset-sm-negative",
  "layout.flex-fill",
  "layout.flex-grow",
  "layer.base",
  "layer.content",
  "effect.glass-backdrop",
] as const;

export type BindTokenId = (typeof BIND_TOKEN_IDS)[number];

/** Allowed in `tokenBindings` without being a registered token id. */
export const BIND_TOKEN_SPECIAL_VALUES = TOKEN_BINDING_LITERALS;

const bindSet = new Set<string>(BIND_TOKEN_IDS);
const specialSet = new Set<string>(BIND_TOKEN_SPECIAL_VALUES);

export function isBindTokenId(tokenId: string): boolean {
  return bindSet.has(tokenId);
}

/** True when a contract `tokenBindings` value is allowed. */
export function isAllowedTokenBindingValue(tokenId: string): boolean {
  return specialSet.has(tokenId) || bindSet.has(tokenId);
}
