import { sha1Hex } from '../contracts/hash-sha1.js';
import {
  THEME_ID_PATTERN,
  THEME_DIGEST_PATTERN,
  THEME_MODE_PATTERN,
  THEME_PACK_ID_PATTERN,
  type ResolvedThemeValue,
  type ThemeIdentity,
  type ThemeKeyCatalog,
} from './schema.js';

/**
 * Stable JSON: object keys sorted (code-unit order), array order preserved,
 * `undefined` object members dropped. Used only for hashing.
 */
export function themeCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (value === undefined) return 'null';
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => themeCanonicalJson(item)).join(',')}]`;
  }
  const entries = Object.keys(value as Record<string, unknown>)
    .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
    .sort(compareStrings)
    .map((key) => `${JSON.stringify(key)}:${themeCanonicalJson((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(',')}}`;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * `"sha1:" + sha1(canonicalJson(catalog without label/description/source))`.
 * Keys are ordered by id and contrast pairs by (foreground, background, level).
 */
export function computeKeyCatalogDigest(catalog: ThemeKeyCatalog): string {
  const keys = catalog.keys
    .map((key) => {
      const { label: _label, description: _description, source: _source, ...rest } = key;
      return rest;
    })
    .sort((a, b) => compareStrings(a.id, b.id));
  const contrastPairs = [...catalog.contrastPairs].sort(
    (a, b) =>
      compareStrings(a.foreground, b.foreground) ||
      compareStrings(a.background, b.background) ||
      compareStrings(a.level, b.level),
  );
  return `sha1:${sha1Hex(themeCanonicalJson({ schemaVersion: catalog.schemaVersion, keys, contrastPairs }))}`;
}

export interface ThemePackDigestInput {
  packId: string;
  /** Ancestors of the pack, nearest first, ending at the base pack (excludes `packId`). */
  extendsChain: readonly string[];
  keyCatalogDigest: string;
  modes: readonly string[];
  defaultMode: string;
  themes: readonly string[];
  defaultTheme: string;
  /** theme -> mode -> resolved values (all themes x all modes). */
  resolved: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, ResolvedThemeValue>>>>>>;
  /** `packId/relativePath` -> sha1 for every file of every pack in the chain. */
  files: Readonly<Record<string, string>>;
}

/**
 * `"sha1:" + sha1(canonicalJson(digestInput))`. Labels, descriptions,
 * expression spelling and Primitive names are not part of the input, so
 * equivalent refactors keep the digest and any visible value change alters it.
 */
export function computeThemePackDigest(input: ThemePackDigestInput): string {
  const digestInput = {
    packId: input.packId,
    extendsChain: [...input.extendsChain],
    keyCatalogDigest: input.keyCatalogDigest,
    modes: [...input.modes].sort(compareStrings),
    defaultMode: input.defaultMode,
    themes: [...input.themes].sort(compareStrings),
    defaultTheme: input.defaultTheme,
    resolved: input.resolved,
    files: input.files,
  };
  return `sha1:${sha1Hex(themeCanonicalJson(digestInput))}`;
}

const IDENTITY_PATTERN = new RegExp(
  `^(${THEME_PACK_ID_PATTERN.source.slice(1, -1)})@(${THEME_DIGEST_PATTERN.source.slice(1, -1)})/(${THEME_MODE_PATTERN.source.slice(1, -1)})/(${THEME_ID_PATTERN.source.slice(1, -1)})$`,
);

/**
 * `packId@sha1:<hex>/theme/mode`. Throws `Error` when a component would not
 * survive `parseThemeIdentity` (so every formatted string round-trips).
 */
export function formatThemeIdentity(identity: ThemeIdentity): string {
  const text = `${identity.packId}@${identity.packDigest}/${identity.theme}/${identity.mode}`;
  if (!IDENTITY_PATTERN.test(text)) {
    throw new Error(`Invalid theme identity components: ${text}`);
  }
  return text;
}

/** Inverse of `formatThemeIdentity`. Returns `null` for any malformed string (never throws). */
export function parseThemeIdentity(text: string): ThemeIdentity | null {
  const match = IDENTITY_PATTERN.exec(text);
  if (!match) return null;
  return {
    packId: match[1] as string,
    packDigest: match[2] as string,
    theme: match[3] as string,
    mode: match[4] as string,
  };
}
