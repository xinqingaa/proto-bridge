import { loadTokens } from "@/design-system/loaders";
import { tokenValueToCssValue } from "@/design-system/resolveThemeTokens";

const tokenById = new Map(loadTokens().map((token) => [token.id, token]));

/**
 * Reads a Foundation default for platform APIs that require a concrete value
 * instead of a CSS variable (for example Vuetify's numeric duration prop).
 */
export function tokenDefaultCssValue(tokenId: string): string {
  const token = tokenById.get(tokenId);
  if (!token) throw new Error(`UNKNOWN_TOKEN:${tokenId}`);
  return tokenValueToCssValue(token.id, token.defaultValue);
}

export function tokenDefaultNumber(tokenId: string): number {
  const value = Number.parseFloat(tokenDefaultCssValue(tokenId));
  if (!Number.isFinite(value))
    throw new Error(`TOKEN_IS_NOT_NUMERIC:${tokenId}`);
  return value;
}
