/**
 * Core design tokens: the semantic set components should bind to.
 * Extended tokens (e.g. display typography, rare spacing) stay in tokens.json
 * for Foundations browsing but are not required for component contracts.
 */
export const CORE_TOKEN_IDS = [
  // Color — surfaces & text
  "color.background",
  "color.surface",
  "color.surface-variant",
  "color.surface-raised",
  "color.on-background",
  "color.on-surface",
  "color.on-surface-muted",
  // Color — brand & feedback
  "color.primary",
  "color.primary-soft",
  "color.on-primary",
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
  "elevation.card",
  "elevation.raised",
  "elevation.level-3",
  "elevation.level-4",
  "elevation.level-5",
  "motion.duration-fast",
  "motion.duration-normal",
  "motion.duration-slow",
  "motion.easing-standard",
] as const;

export type CoreTokenId = (typeof CORE_TOKEN_IDS)[number];

const coreSet = new Set<string>(CORE_TOKEN_IDS);

export function isCoreTokenId(tokenId: string): boolean {
  return coreSet.has(tokenId);
}
