import { z } from 'zod';

/**
 * Theme Pack module schemas. Browser-safe: no Node API, no I/O.
 *
 * Core only receives the Key Catalog, the constant table and the Theme Pack
 * sources as input. File bytes are hashed by the caller and passed in as
 * `ThemePackSource.files` (relative path -> sha1 hex).
 */

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Catalog key / constant id. Multi-segment (`color.primary`) or single segment (`density`). */
export const THEME_KEY_ID_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)*$/;
/** Primitive name; always at least two segments (`blue.600`). */
export const THEME_PRIMITIVE_NAME_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
/** Whole-string reference `{key}`; no interpolation. */
export const THEME_REFERENCE_PATTERN = /^\{([a-z0-9][a-z0-9.-]*)\}$/;
/** Mode and Accent names. */
export const THEME_MODE_PATTERN = /^[a-z][a-z0-9-]*$/;
export const THEME_ACCENT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
/** Pack ids must not contain `@` or `/` because they appear in the identity string. */
export const THEME_PACK_ID_PATTERN = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;
export const THEME_DIGEST_PATTERN = /^sha1:[0-9a-f]{40}$/;

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

export const THEME_VALUE_TYPES = [
  'color',
  'length',
  'number',
  'duration',
  'easing',
  'shadow',
  'border',
  'font',
  'filter',
  'enum',
  'asset',
  'typography',
] as const;
export const ThemeValueType = z.enum(THEME_VALUE_TYPES);
export type ThemeValueType = z.infer<typeof ThemeValueType>;

/** Value types whose keys may never vary by mode (geometry must stay stable). */
export const THEME_MODE_INVARIANT_VALUE_TYPES: readonly ThemeValueType[] = [
  'length',
  'font',
  'enum',
  'typography',
];

export const THEME_BORDER_STYLES = ['solid', 'dashed', 'dotted', 'none'] as const;

/** Derived part fields of a typography role key. */
export const THEME_TYPOGRAPHY_PART_FIELDS = ['family', 'weight', 'size', 'line-height'] as const;
export type ThemeTypographyPartField = (typeof THEME_TYPOGRAPHY_PART_FIELDS)[number];

export function themeTypographyPartId(roleId: string, field: ThemeTypographyPartField): string {
  return `${roleId}.${field}`;
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export type ThemeSwitchExpression = {
  $switch: string;
  cases: Record<string, ThemeExpression>;
};
export type ThemeTypographyExpression = {
  family: ThemeExpression;
  weight: ThemeExpression;
  size: ThemeExpression;
  lineHeight: ThemeExpression;
};
export type ThemeFontExpression = {
  family: string[];
  features?: string[] | undefined;
};
export type ThemeBorderExpression = {
  width: ThemeExpression;
  style: ThemeExpression;
  color: ThemeExpression;
};
export type ThemeAssetExpression = {
  file: string;
  mediaType: string;
  alt: string;
};

/**
 * A theme expression:
 * 1. literal string / number (including `none`, `transparent`);
 * 2. whole-string reference `"{key}"`;
 * 3. `{ $switch, cases }`;
 * 4. composite object (typography / font / border / asset);
 * plus a bare `string[]` font-family list, which is only valid where a font
 * family is expected (`font.family` through `typography.family`, or a switch
 * over such lists). The resolver rejects it elsewhere with `theme.value-type`.
 */
export type ThemeExpression =
  | string
  | number
  | string[]
  | ThemeSwitchExpression
  | ThemeTypographyExpression
  | ThemeFontExpression
  | ThemeBorderExpression
  | ThemeAssetExpression;

const FamilyList = z.array(z.string().min(1)).min(1);

export const ThemeExpression: z.ZodType<ThemeExpression> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    FamilyList,
    z.object({ $switch: z.string().min(1), cases: z.record(z.string(), ThemeExpression) }).strict(),
    z
      .object({
        family: ThemeExpression,
        weight: ThemeExpression,
        size: ThemeExpression,
        lineHeight: ThemeExpression,
      })
      .strict(),
    z.object({ family: FamilyList, features: z.array(z.string().min(1)).optional() }).strict(),
    z.object({ width: ThemeExpression, style: ThemeExpression, color: ThemeExpression }).strict(),
    z.object({ file: z.string().min(1), mediaType: z.string().min(1), alt: z.string() }).strict(),
  ]),
);

// ---------------------------------------------------------------------------
// Key catalog
// ---------------------------------------------------------------------------

export const ThemeKeyTier = z.enum(['semantic', 'component']);
export type ThemeKeyTier = z.infer<typeof ThemeKeyTier>;

export const ThemeKeyDefinition = z
  .object({
    id: z.string().regex(THEME_KEY_ID_PATTERN, 'key id must match ^[a-z][a-z0-9-]*(\\.[a-z0-9-]+)*$'),
    tier: ThemeKeyTier,
    valueType: ThemeValueType,
    bindable: z.boolean(),
    modeVariant: z.boolean(),
    accentable: z.boolean(),
    enumValues: z.array(z.string().min(1)).optional(),
    /** Lowest-priority value; component tier only. Resolved in the base pack context. */
    default: ThemeExpression.optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    source: z.string().optional(),
  })
  .strict()
  .superRefine((key, ctx) => {
    if (key.valueType === 'enum') {
      if (!key.enumValues || key.enumValues.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['enumValues'], message: 'enum keys require non-empty enumValues' });
      } else if (new Set(key.enumValues).size !== key.enumValues.length) {
        ctx.addIssue({ code: 'custom', path: ['enumValues'], message: 'enumValues must be unique' });
      }
    } else if (key.enumValues !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['enumValues'], message: 'enumValues is only allowed for enum keys' });
    }
    if (key.default !== undefined && key.tier !== 'component') {
      ctx.addIssue({ code: 'custom', path: ['default'], message: 'default is only allowed for component-tier keys' });
    }
    if (key.accentable && key.valueType !== 'color') {
      ctx.addIssue({ code: 'custom', path: ['accentable'], message: 'only color keys may be accentable' });
    }
    if (key.modeVariant && THEME_MODE_INVARIANT_VALUE_TYPES.includes(key.valueType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['modeVariant'],
        message: `${key.valueType} keys must not be modeVariant`,
      });
    }
  });
export type ThemeKeyDefinition = z.infer<typeof ThemeKeyDefinition>;

export const ThemeContrastLevel = z.enum(['text', 'ui']);
export type ThemeContrastLevel = z.infer<typeof ThemeContrastLevel>;

export const ThemeContrastPair = z
  .object({
    foreground: z.string().min(1),
    background: z.string().min(1),
    level: ThemeContrastLevel,
    backdrop: z.string().min(1).optional(),
  })
  .strict();
export type ThemeContrastPair = z.infer<typeof ThemeContrastPair>;

export const ThemeKeyCatalog = z
  .object({
    schemaVersion: z.literal(1),
    keys: z.array(ThemeKeyDefinition),
    contrastPairs: z.array(ThemeContrastPair),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const ids = new Set<string>();
    catalog.keys.forEach((key, index) => {
      if (ids.has(key.id)) {
        ctx.addIssue({ code: 'custom', path: ['keys', index, 'id'], message: `duplicate key id "${key.id}"` });
      }
      ids.add(key.id);
    });
    catalog.keys.forEach((key, index) => {
      if (key.valueType !== 'typography') return;
      for (const field of THEME_TYPOGRAPHY_PART_FIELDS) {
        const partId = themeTypographyPartId(key.id, field);
        if (ids.has(partId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['keys', index, 'id'],
            message: `typography part "${partId}" is derived and must not be declared explicitly`,
          });
        }
      }
    });
    catalog.contrastPairs.forEach((pair, index) => {
      for (const field of ['foreground', 'background', 'backdrop'] as const) {
        const ref = pair[field];
        if (ref !== undefined && !ids.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            path: ['contrastPairs', index, field],
            message: `contrast pair ${field} "${ref}" is not a catalog key`,
          });
        }
      }
    });
  });
export type ThemeKeyCatalog = z.infer<typeof ThemeKeyCatalog>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ThemeConstantDefinition = z
  .object({
    id: z.string().regex(THEME_KEY_ID_PATTERN, 'constant id must match the key id pattern'),
    valueType: ThemeValueType,
    value: z.union([z.string(), z.number().finite()]),
    label: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();
export type ThemeConstantDefinition = z.infer<typeof ThemeConstantDefinition>;

export const ThemeConstantTable = z
  .object({
    schemaVersion: z.literal(1),
    constants: z.array(ThemeConstantDefinition),
  })
  .strict()
  .superRefine((table, ctx) => {
    const ids = new Set<string>();
    table.constants.forEach((constant, index) => {
      if (ids.has(constant.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['constants', index, 'id'],
          message: `duplicate constant id "${constant.id}"`,
        });
      }
      ids.add(constant.id);
    });
  });
export type ThemeConstantTable = z.infer<typeof ThemeConstantTable>;

// ---------------------------------------------------------------------------
// Pack files
// ---------------------------------------------------------------------------

export const ThemePackScope = z.enum(['base', 'prototype', 'playground']);
export type ThemePackScope = z.infer<typeof ThemePackScope>;

export const ThemeFontDeclaration = z
  .object({
    family: z.string().min(1),
    files: z.array(z.string().min(1)).min(1),
    weights: z.array(z.number().int().positive()).min(1),
    style: z.enum(['normal', 'italic']),
    /** Empty values are reported as `theme.font-license-missing`, not as a schema error. */
    license: z.string(),
    licenseFile: z.string(),
  })
  .strict();
export type ThemeFontDeclaration = z.infer<typeof ThemeFontDeclaration>;

export const ThemeContrastWaiver = z
  .object({
    pair: z.tuple([z.string().min(1), z.string().min(1)]),
    modes: z.array(z.string().min(1)).optional(),
    accents: z.array(z.string().min(1)).optional(),
    reason: z.string().refine((value) => value.trim().length > 0, 'waiver reason must not be empty'),
  })
  .strict();
export type ThemeContrastWaiver = z.infer<typeof ThemeContrastWaiver>;

export const ThemePackManifest = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(THEME_PACK_ID_PATTERN, 'pack id must be lowercase words joined by - or _'),
    label: z.string().min(1),
    extends: z.string().regex(THEME_PACK_ID_PATTERN).optional(),
    scope: ThemePackScope,
    modes: z
      .array(z.string().regex(THEME_MODE_PATTERN, 'mode must match ^[a-z][a-z0-9-]*$'))
      .min(1)
      .refine((modes) => new Set(modes).size === modes.length, 'modes must be unique'),
    defaultMode: z.string().regex(THEME_MODE_PATTERN),
    accentKeys: z.array(z.string().min(1)).optional(),
    defaultAccent: z.string().regex(THEME_ACCENT_ID_PATTERN).optional(),
    fonts: z.array(ThemeFontDeclaration).optional(),
    contrastWaivers: z.array(ThemeContrastWaiver).optional(),
  })
  .strict();
export type ThemePackManifest = z.infer<typeof ThemePackManifest>;

const ExpressionMap = z.record(z.string(), ThemeExpression);

export const ThemePackLayer = z
  .object({
    values: ExpressionMap.optional(),
    modes: z.record(z.string(), ExpressionMap).optional(),
  })
  .strict();
export type ThemePackLayer = z.infer<typeof ThemePackLayer>;

export const ThemeAccentFile = z
  .object({
    accents: z.record(
      z.string().regex(THEME_ACCENT_ID_PATTERN, 'accent id must match ^[a-z][a-z0-9-]*$'),
      z
        .object({
          label: z.string().min(1),
          values: ExpressionMap.optional(),
          modes: z.record(z.string(), ExpressionMap).optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type ThemeAccentFile = z.infer<typeof ThemeAccentFile>;

export const ThemePrimitiveTable = z
  .object({
    values: z.record(
      z.string().regex(THEME_PRIMITIVE_NAME_PATTERN, 'primitive name must match ^[a-z0-9]+(\\.[a-z0-9-]+)+$'),
      ThemeExpression,
    ),
  })
  .strict();
export type ThemePrimitiveTable = z.infer<typeof ThemePrimitiveTable>;

export const ThemePackSource = z
  .object({
    manifest: ThemePackManifest,
    primitives: ThemePrimitiveTable.optional(),
    semantic: ThemePackLayer.optional(),
    component: ThemePackLayer.optional(),
    accents: ThemeAccentFile.optional(),
    /** Relative path -> sha1 hex of the file bytes; supplied by the caller. */
    files: z.record(z.string(), z.string()).optional(),
    /** Prototype that owns a `scope: prototype` pack; annotated by the caller. */
    ownerPrototypeId: z.string().min(1).optional(),
  })
  .strict();
export type ThemePackSource = z.infer<typeof ThemePackSource>;

// ---------------------------------------------------------------------------
// Identity and resolved table
// ---------------------------------------------------------------------------

export const ThemeIdentity = z
  .object({
    packId: z.string().regex(THEME_PACK_ID_PATTERN),
    packDigest: z.string().regex(THEME_DIGEST_PATTERN),
    mode: z.string().regex(THEME_MODE_PATTERN),
    accent: z.string().regex(THEME_ACCENT_ID_PATTERN),
  })
  .strict();
export type ThemeIdentity = z.infer<typeof ThemeIdentity>;

const ResolvedLength = z.union([z.number(), z.string()]);

export const ResolvedThemeFont = z
  .object({ family: z.array(z.string()), features: z.array(z.string()) })
  .strict();
export type ResolvedThemeFont = z.infer<typeof ResolvedThemeFont>;

export const ResolvedThemeTypography = z
  .object({
    family: z.array(z.string()),
    features: z.array(z.string()),
    weight: z.number(),
    size: ResolvedLength,
    lineHeight: z.number(),
  })
  .strict();
export type ResolvedThemeTypography = z.infer<typeof ResolvedThemeTypography>;

export const ResolvedThemeBorder = z
  .object({
    width: ResolvedLength,
    style: z.enum(THEME_BORDER_STYLES),
    color: z.string(),
  })
  .strict();
export type ResolvedThemeBorder = z.infer<typeof ResolvedThemeBorder>;

/** `packId` is the pack whose `files` table contains `file`. */
export const ResolvedThemeAsset = z
  .object({
    file: z.string(),
    mediaType: z.string(),
    alt: z.string(),
    packId: z.string(),
  })
  .strict();
export type ResolvedThemeAsset = z.infer<typeof ResolvedThemeAsset>;

/**
 * Resolved value by `valueType`: color/easing/shadow/filter/enum/`none` asset
 * -> string; length -> number (px) or unit string; number/duration/weight/
 * line-height -> number; font -> `ResolvedThemeFont`; typography ->
 * `ResolvedThemeTypography`; typography `.family` part -> `string[]`.
 */
export const ResolvedThemeValue = z.union([
  z.string(),
  z.number(),
  z.array(z.string()),
  ResolvedThemeFont,
  ResolvedThemeTypography,
  ResolvedThemeBorder,
  ResolvedThemeAsset,
]);
export type ResolvedThemeValue = z.infer<typeof ResolvedThemeValue>;

export const ResolvedThemeProvenance = z
  .object({
    sourcePackId: z.string(),
    chain: z.array(z.string()),
    inherited: z.boolean(),
  })
  .strict();
export type ResolvedThemeProvenance = z.infer<typeof ResolvedThemeProvenance>;

export const ResolvedThemeTable = z
  .object({
    identity: ThemeIdentity,
    values: z.record(z.string(), ResolvedThemeValue),
    provenance: z.record(z.string(), ResolvedThemeProvenance),
    constants: z.record(z.string(), z.union([z.string(), z.number()])),
  })
  .strict();
export type ResolvedThemeTable = z.infer<typeof ResolvedThemeTable>;

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export const THEME_DIAGNOSTIC_SEVERITY = {
  'theme.schema': 'block',
  'theme.unknown-key': 'block',
  'theme.tier-violation': 'block',
  'theme.unresolved-reference': 'block',
  'theme.reference-cycle': 'block',
  'theme.extends-cycle': 'block',
  'theme.value-type': 'block',
  'theme.mode-variant-forbidden': 'block',
  'theme.accent-out-of-scope': 'block',
  'theme.mode-undeclared': 'block',
  'theme.base-incomplete': 'block',
  'theme.font-license-missing': 'block',
  'theme.font-file-missing': 'block',
  'theme.asset-missing': 'block',
  'theme.contrast-insufficient': 'block',
  'theme.contrast-waived': 'warning',
  'theme.contrast-waiver-unused': 'warning',
  'theme.scope-violation': 'block',
  'theme.inherited': 'info',
} as const;

export type ThemeDiagnosticCode = keyof typeof THEME_DIAGNOSTIC_SEVERITY;
export const THEME_DIAGNOSTIC_CODES = Object.keys(THEME_DIAGNOSTIC_SEVERITY) as ThemeDiagnosticCode[];
export const ThemeDiagnosticSeverity = z.enum(['block', 'warning', 'info']);
export type ThemeDiagnosticSeverity = z.infer<typeof ThemeDiagnosticSeverity>;

export const ThemeDiagnostic = z
  .object({
    code: z.enum(THEME_DIAGNOSTIC_CODES as [ThemeDiagnosticCode, ...ThemeDiagnosticCode[]]),
    severity: ThemeDiagnosticSeverity,
    packId: z.string(),
    key: z.string().optional(),
    mode: z.string().optional(),
    accent: z.string().optional(),
    message: z.string(),
    path: z.string().optional(),
  })
  .strict();
export type ThemeDiagnostic = {
  code: ThemeDiagnosticCode;
  severity: ThemeDiagnosticSeverity;
  packId: string;
  key?: string | undefined;
  mode?: string | undefined;
  accent?: string | undefined;
  message: string;
  path?: string | undefined;
};

export function createThemeDiagnostic(
  code: ThemeDiagnosticCode,
  packId: string,
  message: string,
  extra: { key?: string | undefined; mode?: string | undefined; accent?: string | undefined; path?: string | undefined } = {},
): ThemeDiagnostic {
  const diagnostic: ThemeDiagnostic = {
    code,
    severity: THEME_DIAGNOSTIC_SEVERITY[code],
    packId,
    message,
  };
  if (extra.key !== undefined) diagnostic.key = extra.key;
  if (extra.mode !== undefined) diagnostic.mode = extra.mode;
  if (extra.accent !== undefined) diagnostic.accent = extra.accent;
  if (extra.path !== undefined) diagnostic.path = extra.path;
  return diagnostic;
}

export function hasThemeBlock(diagnostics: readonly ThemeDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'block');
}
