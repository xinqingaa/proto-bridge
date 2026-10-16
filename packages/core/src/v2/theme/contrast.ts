/**
 * WCAG 2.x contrast helpers over theme color strings. Pure and browser-safe.
 */

export interface ThemeRgba {
  /** 0-255 */
  r: number;
  g: number;
  b: number;
  /** 0-1 */
  a: number;
}

export const CONTRAST_THRESHOLDS = { text: 4.5, ui: 3 } as const;

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_PATTERN = /^rgba?\(\s*([^)]*?)\s*\)$/i;
const NUMBER_OR_PERCENT = /^[+-]?(?:\d+\.?\d*|\.\d+)%?$/;

function parseComponent(token: string, percentScale: number): number | null {
  if (!NUMBER_OR_PERCENT.test(token)) return null;
  const isPercent = token.endsWith('%');
  const value = Number.parseFloat(isPercent ? token.slice(0, -1) : token);
  if (!Number.isFinite(value)) return null;
  return isPercent ? (value / 100) * percentScale : value;
}

/**
 * Parses `#rgb|#rgba|#rrggbb|#rrggbbaa`, `rgb()/rgba()` (comma or space
 * syntax, optional `/ alpha`) and `transparent`. Returns `null` for anything
 * else or for out-of-range channels.
 */
export function parseThemeColor(input: string): ThemeRgba | null {
  const text = input.trim();
  if (text.toLowerCase() === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const hex = HEX_PATTERN.exec(text);
  if (hex) {
    let digits = hex[1] as string;
    if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join('');
    const channel = (offset: number) => Number.parseInt(digits.slice(offset, offset + 2), 16);
    return {
      r: channel(0),
      g: channel(2),
      b: channel(4),
      a: digits.length === 8 ? channel(6) / 255 : 1,
    };
  }

  const functional = FUNCTIONAL_PATTERN.exec(text);
  if (!functional) return null;
  const body = functional[1] as string;
  let channelTokens: string[];
  let alphaToken: string | undefined;
  if (body.includes(',')) {
    if (body.includes('/')) return null;
    const parts = body.split(',').map((part) => part.trim());
    if (parts.length !== 3 && parts.length !== 4) return null;
    channelTokens = parts.slice(0, 3);
    alphaToken = parts[3];
  } else {
    const [channelPart, alphaPart, ...rest] = body.split('/');
    if (rest.length > 0) return null;
    channelTokens = (channelPart as string).trim().split(/\s+/);
    if (channelTokens.length !== 3) return null;
    alphaToken = alphaPart === undefined ? undefined : alphaPart.trim();
  }

  const channels = channelTokens.map((token) => parseComponent(token, 255));
  if (channels.some((value) => value === null || value < 0 || value > 255)) return null;
  let alpha = 1;
  if (alphaToken !== undefined) {
    const parsed = parseComponent(alphaToken, 1);
    if (parsed === null || parsed < 0 || parsed > 1) return null;
    alpha = parsed;
  }
  const [r, g, b] = channels as [number, number, number];
  return { r, g, b, a: alpha };
}

/** Composites `foreground` over `background` (source-over). */
export function compositeOver(foreground: ThemeRgba, background: ThemeRgba): ThemeRgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (front: number, back: number) =>
    (front * foreground.a + back * background.a * (1 - foreground.a)) / alpha;
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: alpha,
  };
}

function linearize(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of an opaque sRGB color (alpha ignored). */
export function relativeLuminance(color: Pick<ThemeRgba, 'r' | 'g' | 'b'>): number {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

const OPAQUE_WHITE: ThemeRgba = { r: 255, g: 255, b: 255, a: 1 };

/**
 * WCAG contrast ratio. When either side has alpha < 1 it is first composited
 * onto `backdrop` (itself composited onto opaque white when translucent;
 * opaque white when omitted): the background over the backdrop, then the
 * foreground over the resulting background.
 */
export function contrastRatio(foreground: ThemeRgba, background: ThemeRgba, backdrop?: ThemeRgba): number {
  let effectiveBackground = background;
  let effectiveForeground = foreground;
  if (foreground.a < 1 || background.a < 1) {
    const base = backdrop === undefined ? OPAQUE_WHITE : compositeOver(backdrop, OPAQUE_WHITE);
    effectiveBackground = background.a < 1 ? compositeOver(background, base) : background;
    effectiveForeground = foreground.a < 1 ? compositeOver(foreground, effectiveBackground) : foreground;
  }
  const first = relativeLuminance(effectiveForeground);
  const second = relativeLuminance(effectiveBackground);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
