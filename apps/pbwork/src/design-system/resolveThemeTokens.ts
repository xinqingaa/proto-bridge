import type {
  ThemeRecord,
  TokenRecord,
  TokenValue,
} from "@/design-system/types";
import { loadThemes, loadTokens } from "@/design-system/loaders";

export function normalizeTokenCssVarName(tokenId: string): string {
  return `--pb-${tokenId.replaceAll(".", "-")}`;
}

export function tokenValueToCssValue(
  tokenId: string,
  value: TokenValue,
): string {
  if (typeof value !== "number") return String(value);
  return /^(spacing|sizing|radius)\./.test(tokenId)
    ? `${value}px`
    : String(value);
}

export function resolveThemeTokens(
  themeId: string,
  tokens: TokenRecord[] = loadTokens(),
  themes: ThemeRecord[] = loadThemes(),
): Record<string, TokenValue> {
  const theme = themes.find((item) => item.id === themeId);
  if (!theme) {
    throw new Error(`UNKNOWN_THEME:${themeId}`);
  }

  const resolved: Record<string, TokenValue> = {};
  for (const token of tokens) {
    resolved[token.id] =
      theme.overrides[token.id] !== undefined
        ? theme.overrides[token.id]!
        : token.defaultValue;
  }
  return resolved;
}

export function tokensToCssVars(
  resolved: Record<string, TokenValue>,
): Record<string, string> {
  const vars: Record<string, string> = {};
  const seen = new Map<string, string>();

  for (const [tokenId, value] of Object.entries(resolved)) {
    const cssVar = normalizeTokenCssVarName(tokenId);
    const previous = seen.get(cssVar);
    if (previous && previous !== tokenId) {
      throw new Error(`CSS_VAR_COLLISION:${cssVar}:${previous}:${tokenId}`);
    }
    seen.set(cssVar, tokenId);
    vars[cssVar] = tokenValueToCssValue(tokenId, value);
  }

  return vars;
}
