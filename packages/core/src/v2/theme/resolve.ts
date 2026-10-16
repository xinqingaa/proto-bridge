import { parseThemeColor } from './contrast.js';
import { computeKeyCatalogDigest, computeThemePackDigest } from './digest.js';
import {
  buildThemeDependencyGraph,
  collectThemeReferences,
  findThemeReferenceCycles,
  formatThemeCyclePath,
  isThemeSwitchExpression,
  parseThemeReference,
} from './expression.js';
import {
  THEME_BORDER_STYLES,
  THEME_SYSTEM_FONT_FAMILY,
  THEME_TYPOGRAPHY_PART_FIELDS,
  createThemeDiagnostic,
  hasThemeBlock,
  themeTypographyPartId,
  type ResolvedThemeProvenance,
  type ResolvedThemeTable,
  type ResolvedThemeValue,
  type ThemeConstantDefinition,
  type ThemeConstantTable,
  type ThemeDiagnostic,
  type ThemeDiagnosticCode,
  type ThemeExpression,
  type ThemeKeyCatalog,
  type ThemeKeyTier,
  type ThemePackSource,
  type ThemeTypographyPartField,
  type ThemeValueType,
} from './schema.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ThemeResolveCommonInput {
  keyCatalog: ThemeKeyCatalog;
  constants: ThemeConstantTable;
  packs: ReadonlyMap<string, ThemePackSource>;
}

export interface ResolveThemePackInput extends ThemeResolveCommonInput {
  packId: string;
  mode: string;
  /** Defaults to the pack's effective `defaultTheme`. */
  theme?: string | undefined;
}

export interface ResolveAllThemeTablesInput extends ThemeResolveCommonInput {
  packId: string;
}

export interface ResolveThemePackResult {
  /** `null` when any block diagnostic exists anywhere in the pack (all modes x themes). */
  table: ResolvedThemeTable | null;
  diagnostics: ThemeDiagnostic[];
}

export interface ResolveAllThemeTablesResult {
  /** `null` when any block diagnostic exists. */
  digest: string | null;
  /** All declared modes x all Themes; empty when `digest` is `null`. */
  tables: ResolvedThemeTable[];
  diagnostics: ThemeDiagnostic[];
}

export interface ThemePackChainResult {
  /** `[target, parent, ..., base]`; partial when diagnostics are present. */
  chain: string[];
  diagnostics: ThemeDiagnostic[];
}

// ---------------------------------------------------------------------------
// Key index (catalog keys + derived typography parts)
// ---------------------------------------------------------------------------

/** Internal evaluation type. Parts of a typography role use `family-list`/number/length. */
type EvalType = ThemeValueType | 'family-list' | 'border-style';

export interface ThemeKeyInfo {
  id: string;
  tier: ThemeKeyTier;
  /** Catalog value type; derived typography parts use their field type. */
  valueType: ThemeValueType | 'family-list';
  bindable: boolean;
  modeVariant: boolean;
  enumValues?: readonly string[] | undefined;
  default?: ThemeExpression | undefined;
  part?: { role: string; field: ThemeTypographyPartField } | undefined;
}

const PART_VALUE_TYPE: Record<ThemeTypographyPartField, ThemeKeyInfo['valueType']> = {
  family: 'family-list',
  weight: 'number',
  size: 'length',
  'line-height': 'number',
};

export function buildThemeKeyIndex(catalog: ThemeKeyCatalog): Map<string, ThemeKeyInfo> {
  const index = new Map<string, ThemeKeyInfo>();
  for (const key of catalog.keys) {
    index.set(key.id, {
      id: key.id,
      tier: key.tier,
      valueType: key.valueType,
      bindable: key.bindable,
      modeVariant: key.modeVariant,
      enumValues: key.enumValues,
      default: key.default,
    });
    if (key.valueType !== 'typography') continue;
    for (const field of THEME_TYPOGRAPHY_PART_FIELDS) {
      const id = themeTypographyPartId(key.id, field);
      index.set(id, {
        id,
        tier: key.tier,
        valueType: PART_VALUE_TYPE[field],
        bindable: false,
        modeVariant: false,
        part: { role: key.id, field },
      });
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Pack chain
// ---------------------------------------------------------------------------

export function listPackChain(
  packs: ReadonlyMap<string, ThemePackSource>,
  packId: string,
): ThemePackChainResult {
  const chain: string[] = [];
  const diagnostics: ThemeDiagnostic[] = [];
  const visited = new Set<string>();
  let current: string = packId;
  let child: string | undefined;
  for (;;) {
    const pack = packs.get(current);
    if (!pack) {
      diagnostics.push(
        createThemeDiagnostic(
          'theme.unresolved-reference',
          child ?? packId,
          child === undefined
            ? `Theme pack "${current}" does not exist.`
            : `Theme pack "${child}" extends "${current}", which does not exist.`,
          { path: 'manifest.extends' },
        ),
      );
      return { chain, diagnostics };
    }
    if (visited.has(current)) {
      diagnostics.push(
        createThemeDiagnostic(
          'theme.extends-cycle',
          current,
          `Theme pack inheritance cycle: ${formatThemeCyclePath([...chain.slice(chain.indexOf(current)), current])}`,
          { path: 'manifest.extends' },
        ),
      );
      return { chain, diagnostics };
    }
    visited.add(current);
    chain.push(current);
    const manifest = pack.manifest;
    if (manifest.scope === 'base') {
      if (manifest.extends !== undefined) {
        diagnostics.push(
          createThemeDiagnostic(
            'theme.extends-cycle',
            current,
            `Base pack "${current}" must not extend another pack.`,
            { path: 'manifest.extends' },
          ),
        );
      }
      return { chain, diagnostics };
    }
    if (manifest.extends === undefined) {
      diagnostics.push(
        createThemeDiagnostic(
          'theme.extends-cycle',
          current,
          `Theme pack "${current}" (scope ${manifest.scope}) must extend a pack; the chain does not terminate at a base pack.`,
          { path: 'manifest.extends' },
        ),
      );
      return { chain, diagnostics };
    }
    child = current;
    current = manifest.extends;
  }
}

// ---------------------------------------------------------------------------
// Preparation
// ---------------------------------------------------------------------------

interface Prepared {
  catalog: ThemeKeyCatalog;
  constants: Map<string, ThemeConstantDefinition>;
  constantValues: Record<string, string | number>;
  packs: ReadonlyMap<string, ThemePackSource>;
  targetId: string;
  chain: string[];
  chainPacks: ThemePackSource[];
  baseId: string;
  keyIndex: Map<string, ThemeKeyInfo>;
  sortedKeyIds: string[];
  modes: string[];
  themeIds: string[];
  defaultTheme: string;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function prepare(
  input: ThemeResolveCommonInput,
  packId: string,
): { prepared: Prepared | null; diagnostics: ThemeDiagnostic[] } {
  const { chain, diagnostics } = listPackChain(input.packs, packId);
  if (diagnostics.length > 0) return { prepared: null, diagnostics };
  const chainPacks = chain.map((id) => input.packs.get(id) as ThemePackSource);
  const target = chainPacks[0] as ThemePackSource;

  const keyIndex = buildThemeKeyIndex(input.keyCatalog);
  const constants = new Map<string, ThemeConstantDefinition>();
  const constantValues: Record<string, string | number> = {};
  for (const constant of input.constants.constants) {
    constants.set(constant.id, constant);
    constantValues[constant.id] = constant.value;
  }

  const themeIds = target.manifest.themes.map((theme) => theme.id);
  const defaultTheme = target.manifest.defaultTheme;

  return {
    prepared: {
      catalog: input.keyCatalog,
      constants,
      constantValues,
      packs: input.packs,
      targetId: packId,
      chain,
      chainPacks,
      baseId: chain[chain.length - 1] as string,
      keyIndex,
      sortedKeyIds: [...keyIndex.keys()].sort(compareStrings),
      modes: [...target.manifest.modes],
      themeIds,
      defaultTheme,
    },
    diagnostics: [],
  };
}

// ---------------------------------------------------------------------------
// Static (structure) checks on every pack of a chain
// ---------------------------------------------------------------------------

function lintChain(prepared: Prepared): ThemeDiagnostic[] {
  const out: ThemeDiagnostic[] = [];
  const emit = (
    code: ThemeDiagnosticCode,
    packId: string,
    message: string,
    extra: { key?: string; path?: string } = {},
  ) => out.push(createThemeDiagnostic(code, packId, message, extra));

  prepared.chain.forEach((packId) => {
    const pack = prepared.packs.get(packId) as ThemePackSource;
    const manifest = pack.manifest;
    const declaredModes = new Set(manifest.modes);

    if (!declaredModes.has(manifest.defaultMode)) {
      emit('theme.mode-undeclared', packId, `defaultMode "${manifest.defaultMode}" is not listed in modes.`, {
        path: 'manifest.defaultMode',
      });
    }

    const declaredThemes = new Set(manifest.themes.map((theme) => theme.id));
    if (!declaredThemes.has(manifest.defaultTheme)) {
      emit('theme.theme-undeclared', packId, `defaultTheme "${manifest.defaultTheme}" is not listed in themes.`, {
        path: 'manifest.defaultTheme',
      });
    }
    const defaults = manifest.themes.filter((theme) => theme.default);
    if (defaults.length > 1 || (defaults.length === 1 && defaults[0]!.id !== manifest.defaultTheme)) {
      emit('theme.theme-undeclared', packId, 'Theme default flags must agree with defaultTheme.', { path: 'manifest.themes' });
    }

    lintPrimitives(prepared, pack, emit);

    for (const [layerName, tier] of [
      ['semantic', 'semantic'],
      ['component', 'component'],
    ] as const) {
      const layer = pack[layerName];
      if (!layer) continue;
      lintExpressionMap(prepared, packId, layer.values, `${layerName}.values`, tier, undefined, emit);
      for (const [mode, map] of Object.entries(layer.modes ?? {})) {
        if (!declaredModes.has(mode)) {
          emit('theme.mode-undeclared', packId, `${layerName}.json declares mode "${mode}" which is not in pack modes.`, {
            path: `${layerName}.modes.${mode}`,
          });
        }
        lintExpressionMap(prepared, packId, map, `${layerName}.modes.${mode}`, tier, 'mode', emit);
      }
      for (const [theme, override] of Object.entries(layer.themes ?? {})) {
        if (!declaredThemes.has(theme)) emit('theme.theme-undeclared', packId,
          `Undeclared theme "${theme}".`, { path: `${layerName}.themes.${theme}` });
        lintExpressionMap(prepared, packId, override.values, `${layerName}.themes.${theme}.values`, tier, undefined, emit);
      }
      for (const [theme, modes] of Object.entries(layer.themeModes ?? {})) {
        if (!declaredThemes.has(theme)) emit('theme.theme-undeclared', packId,
          `Undeclared theme "${theme}".`, { path: `${layerName}.themeModes.${theme}` });
        for (const [mode, map] of Object.entries(modes)) {
          if (!declaredModes.has(mode)) emit('theme.mode-undeclared', packId,
            `Undeclared mode "${mode}".`, { path: `${layerName}.themeModes.${theme}.${mode}` });
          lintExpressionMap(prepared, packId, map, `${layerName}.themeModes.${theme}.${mode}`, tier, 'mode', emit);
        }
      }
    }
  });
  return out;
}

type Emit = (
  code: ThemeDiagnosticCode,
  packId: string,
  message: string,
  extra?: { key?: string; path?: string },
) => void;

function lintExpressionMap(
  prepared: Prepared,
  packId: string,
  map: Readonly<Record<string, ThemeExpression>> | undefined,
  path: string,
  tier: ThemeKeyTier | undefined,
  kind: 'mode' | undefined,
  emit: Emit,
): void {
  if (!map) return;
  for (const key of Object.keys(map)) {
    const keyPath = `${path}.${key}`;
    if (prepared.constants.has(key)) {
      emit('theme.tier-violation', packId, `Constant "${key}" cannot be overridden by a theme pack.`, {
        key,
        path: keyPath,
      });
      continue;
    }
    const info = prepared.keyIndex.get(key);
    if (!info) {
      emit('theme.unknown-key', packId, `"${key}" is not a key of the Key Catalog.`, { key, path: keyPath });
      continue;
    }
    if (info.part?.field === 'family') {
      emit('theme.unknown-key', packId, `"${key}" is a read-only system font part.`, { key, path: keyPath });
      continue;
    }
    if (tier !== undefined && info.tier !== tier) {
      emit(
        'theme.tier-violation',
        packId,
        `${info.tier}-tier key "${key}" must not appear in the ${tier} layer.`,
        { key, path: keyPath },
      );
      continue;
    }
    if (kind === 'mode' && !info.modeVariant) {
      emit('theme.mode-variant-forbidden', packId, `Key "${key}" is not modeVariant and cannot be overridden per mode.`, {
        key,
        path: keyPath,
      });
    }

  }
}

function lintPrimitives(prepared: Prepared, pack: ThemePackSource, emit: Emit): void {
  const packId = pack.manifest.id;
  const values = pack.primitives?.values;
  if (!values) return;
  for (const [name, expression] of Object.entries(values)) {
    const path = `primitives.values.${name}`;
    if (prepared.keyIndex.has(name) || prepared.constants.has(name)) {
      emit('theme.tier-violation', packId, `Primitive "${name}" has the same name as a catalog key or constant.`, {
        key: name,
        path,
      });
    }
    for (const reference of collectThemeReferences(expression)) {
      if (prepared.keyIndex.has(reference) || prepared.constants.has(reference)) {
        emit(
          'theme.tier-violation',
          packId,
          `Primitive "${name}" references "${reference}"; Primitives may only reference Primitives.`,
          { key: name, path },
        );
      }
    }
  }
  for (const cycle of findThemeReferenceCycles(buildThemeDependencyGraph(values))) {
    emit('theme.reference-cycle', packId, `Primitive reference cycle: ${formatThemeCyclePath(cycle)}`, {
      key: cycle[0] as string,
      path: formatThemeCyclePath(cycle),
    });
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

type EvalResult = { ok: true; value: unknown; tail: string[] } | { ok: false };
const FAIL: { ok: false } = { ok: false };

type KeyResult =
  | {
      ok: true;
      value: unknown;
      chain: string[];
      sourcePackId: string;
      owner: string;
    }
  | { ok: false };

interface EvalContext {
  /** Pack that owns the expression being evaluated (files, diagnostics). */
  owner: string;
  /** Pack whose Primitive table (and ancestors) resolves Primitive references. */
  scope: string;
  /** Key being resolved at the top of this evaluation. */
  key: string;
  tier: ThemeKeyTier;
  enumValues?: readonly string[] | undefined;
  /** Inside a Primitive expression; structural errors are reported by the static pass. */
  inPrimitive: boolean;
}

interface Level {
  sourcePackId: string;
  owner: string;
  scope: string;
  exprs: Readonly<Record<string, ThemeExpression>> | undefined;
}

const LENGTH_PATTERN = /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|dvh)$/;

function hasOwn(map: object | undefined, key: string): boolean {
  return map !== undefined && Object.prototype.hasOwnProperty.call(map, key);
}

function describeValue(value: unknown): string {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

interface EvaluationOutput {
  values: Record<string, ResolvedThemeValue>;
  provenance: Record<string, ResolvedThemeProvenance>;
}

class Evaluator {
  readonly diagnostics: ThemeDiagnostic[] = [];
  private readonly seen = new Set<string>();
  private readonly memo = new Map<string, KeyResult>();
  private readonly roleBase = new Map<string, KeyResult>();
  private readonly stack: string[] = [];
  private readonly levels: Record<ThemeKeyTier, Level[]>;

  constructor(
    private readonly p: Prepared,
    private readonly mode: string,
    private readonly theme: string,
  ) {
    this.levels = { semantic: this.buildLevels('semantic'), component: this.buildLevels('component') };
  }

  run(): EvaluationOutput {
    const values: Record<string, ResolvedThemeValue> = {};
    const provenance: Record<string, ResolvedThemeProvenance> = {};
    for (const id of this.p.sortedKeyIds) {
      const result = this.evalKey(id);
      if (!result.ok) continue;
      values[id] = result.value as ResolvedThemeValue;
      provenance[id] = {
        sourcePackId: result.sourcePackId,
        chain: result.chain,
        inherited: result.owner !== this.p.targetId,
      };
    }
    return { values, provenance };
  }

  // -- levels ---------------------------------------------------------------

  private buildLevels(tier: ThemeKeyTier): Level[] {
    const levels: Level[] = [];
    for (const pack of this.p.chainPacks) {
      const id = pack.manifest.id;
      const layer = tier === 'semantic' ? pack.semantic : pack.component;
      levels.push({ sourcePackId: id, owner: id, scope: id, exprs: layer?.themeModes?.[this.theme]?.[this.mode] });
      levels.push({ sourcePackId: id, owner: id, scope: id, exprs: layer?.themes?.[this.theme]?.values });
      levels.push({ sourcePackId: id, owner: id, scope: id, exprs: layer?.modes?.[this.mode] });
      levels.push({ sourcePackId: id, owner: id, scope: id, exprs: layer?.values });
    }
    return levels;
  }

  /** First level (by priority) defining any of `ids` (checked in the given order within a level). */
  private findLevel(ids: readonly string[], tier: ThemeKeyTier): { level: Level; id: string } | null {
    for (const level of this.levels[tier]) {
      for (const id of ids) {
        if (hasOwn(level.exprs, id)) return { level, id };
      }
    }
    return null;
  }

  // -- diagnostics ----------------------------------------------------------

  private emit(
    code: ThemeDiagnosticCode,
    packId: string,
    message: string,
    extra: { key?: string; path?: string } = {},
  ): void {
    const diagnostic = createThemeDiagnostic(code, packId, message, {
      ...extra,
      mode: this.mode,
      theme: this.theme,
    });
    const dedupeKey = `${diagnostic.code}|${diagnostic.packId}|${diagnostic.key ?? ''}|${diagnostic.path ?? ''}|${diagnostic.message}`;
    if (this.seen.has(dedupeKey)) return;
    this.seen.add(dedupeKey);
    this.diagnostics.push(diagnostic);
  }

  private typeError(ctx: EvalContext, expected: string, got: unknown): EvalResult {
    this.emit('theme.value-type', ctx.owner, `Key "${ctx.key}" expects ${expected} but got ${describeValue(got)}.`, {
      key: ctx.key,
    });
    return FAIL;
  }

  private cycle(token: string, ctx: EvalContext | undefined): { ok: false } {
    const index = this.stack.indexOf(token);
    const path = [...this.stack.slice(index), token];
    // Primitive-only cycles are reported by the static pass.
    if (path.every((entry) => entry.includes(':'))) return FAIL;
    const key = path.find((entry) => !entry.includes(':')) as string;
    const text = formatThemeCyclePath(path);
    this.emit('theme.reference-cycle', ctx?.owner ?? this.p.targetId, `Reference cycle: ${text}`, {
      key,
      path: text,
    });
    return FAIL;
  }

  // -- keys -----------------------------------------------------------------

  private evalKey(id: string, from?: EvalContext): KeyResult {
    const cached = this.memo.get(id);
    if (cached) return cached;
    if (this.stack.includes(id)) return this.cycle(id, from);
    const info = this.p.keyIndex.get(id) as ThemeKeyInfo;
    this.stack.push(id);
    let result: KeyResult;
    try {
      if (info.part) result = this.computePart(info);
      else if (info.valueType === 'typography') result = this.computeRole(info);
      else result = this.computeFromLevels(info);
    } finally {
      this.stack.pop();
    }
    this.memo.set(id, result);
    return result;
  }

  private contextFor(info: ThemeKeyInfo, level: Level): EvalContext {
    return {
      owner: level.owner,
      scope: level.scope,
      key: info.id,
      tier: info.tier,
      enumValues: info.enumValues,
      inPrimitive: false,
    };
  }

  private evalTypeOf(info: ThemeKeyInfo): EvalType {
    return info.valueType;
  }

  /** Effective expression (levels, then key.default) evaluated with the key's own type. */
  private computeFromLevels(info: ThemeKeyInfo): KeyResult {
    const found = this.findLevel([info.id], info.tier);
    let level: Level;
    let expression: ThemeExpression;
    if (found) {
      level = found.level;
      expression = (level.exprs as Record<string, ThemeExpression>)[info.id] as ThemeExpression;
    } else if (info.default !== undefined) {
      level = { sourcePackId: this.p.baseId, owner: this.p.baseId, scope: this.p.baseId, exprs: undefined };
      expression = info.default;
    } else {
      this.emit('theme.base-incomplete', this.p.baseId, `Base pack "${this.p.baseId}" does not provide a value for "${info.id}".`, {
        key: info.id,
      });
      return FAIL;
    }
    const result = this.evalTyped(expression, this.evalTypeOf(info), this.contextFor(info, level));
    if (!result.ok) return FAIL;
    return {
      ok: true,
      value: result.value,
      chain: [info.id, ...result.tail],
      sourcePackId: level.sourcePackId,
      owner: level.owner,
    };
  }

  private evalRoleBase(info: ThemeKeyInfo): KeyResult {
    const cached = this.roleBase.get(info.id);
    if (cached) return cached;
    const pushed = !this.stack.includes(info.id);
    if (pushed) this.stack.push(info.id);
    let result: KeyResult;
    try {
      result = this.computeFromLevels(info);
    } finally {
      if (pushed) this.stack.pop();
    }
    this.roleBase.set(info.id, result);
    return result;
  }

  private computeRole(info: ThemeKeyInfo): KeyResult {
    const base = this.evalRoleBase(info);
    if (!base.ok) return FAIL;
    const parts = new Map<ThemeTypographyPartField, Extract<KeyResult, { ok: true }>>();
    let failed = false;
    for (const field of THEME_TYPOGRAPHY_PART_FIELDS) {
      const part = this.evalKey(themeTypographyPartId(info.id, field));
      if (!part.ok) failed = true;
      else parts.set(field, part);
    }
    if (failed) return FAIL;
    const family = parts.get('family') as Extract<KeyResult, { ok: true }>;
    return {
      ok: true,
      value: {
        family: family.value as string[],
        features: info.id.startsWith('typography.numeric-') ? ['tnum'] : [],
        weight: (parts.get('weight') as { value: unknown }).value,
        size: (parts.get('size') as { value: unknown }).value,
        lineHeight: (parts.get('line-height') as { value: unknown }).value,
      },
      chain: base.chain,
      sourcePackId: base.sourcePackId,
      owner: base.owner,
    };
  }

  private computePart(info: ThemeKeyInfo): KeyResult {
    const { role, field } = info.part as NonNullable<ThemeKeyInfo['part']>;
    if (field === 'family') {
      const base = this.evalRoleBase(this.p.keyIndex.get(role) as ThemeKeyInfo);
      if (!base.ok) return FAIL;
      return { ...base, value: [...THEME_SYSTEM_FONT_FAMILY], chain: [info.id, ...base.chain] };
    }
    const roleInfo = this.p.keyIndex.get(role) as ThemeKeyInfo;
    const found = this.findLevel([info.id, role], info.tier);
    if (found && found.id === info.id) {
      const level = found.level;
      const expression = (level.exprs as Record<string, ThemeExpression>)[info.id] as ThemeExpression;
      const type: EvalType = field === 'size' ? 'length' : 'number';
      const result = this.evalTyped(expression, type, this.contextFor(info, level));
      if (!result.ok) return FAIL;
      return {
        ok: true,
        value: result.value,
        chain: [info.id, ...result.tail],
        sourcePackId: level.sourcePackId,
        owner: level.owner,
      };
    }
    const base = this.evalRoleBase(roleInfo);
    if (!base.ok) return FAIL;
    const typography = base.value as {
      family: string[];
      features: string[];
      weight: number;
      size: number | string;
      lineHeight: number;
    };
    const chain = [info.id, ...base.chain];
    const value = field === 'weight' ? typography.weight : field === 'size' ? typography.size : typography.lineHeight;
    return { ok: true, value, chain, sourcePackId: base.sourcePackId, owner: base.owner };
  }

  // -- expressions ----------------------------------------------------------

  private evalTyped(expression: ThemeExpression, type: EvalType, ctx: EvalContext): EvalResult {
    if (typeof expression === 'string') {
      const reference = parseThemeReference(expression);
      if (reference !== null) return this.evalReference(reference, type, ctx);
      return this.evalLiteral(expression, type, ctx);
    }
    if (typeof expression === 'number' || Array.isArray(expression)) {
      return this.evalLiteral(expression, type, ctx);
    }
    if (isThemeSwitchExpression(expression)) return this.evalSwitch(expression, type, ctx);
    return this.evalComposite(expression as unknown as Record<string, unknown>, type, ctx);
  }

  private evalLiteral(value: unknown, type: EvalType, ctx: EvalContext): EvalResult {
    const ok = (result: unknown): EvalResult => ({ ok: true, value: result, tail: [] });
    switch (type) {
      case 'color':
        if (typeof value === 'string' && parseThemeColor(value) !== null) return ok(value);
        return this.typeError(ctx, 'a color (#hex, rgb()/rgba() or transparent)', value);
      case 'length':
        if (typeof value === 'number' && Number.isFinite(value)) return ok(value);
        if (typeof value === 'string' && LENGTH_PATTERN.test(value)) return ok(value);
        return this.typeError(ctx, 'a length (number of px or a value with a unit)', value);
      case 'number':
        if (typeof value === 'number' && Number.isFinite(value)) return ok(value);
        return this.typeError(ctx, 'a finite number', value);
      case 'duration':
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return ok(value);
        return this.typeError(ctx, 'a non-negative duration in milliseconds', value);
      case 'easing':
      case 'shadow':
      case 'filter':
        if (typeof value === 'string' && value.trim().length > 0) return ok(value);
        return this.typeError(ctx, `a non-empty ${type} string`, value);
      case 'enum':
        if (typeof value === 'string' && ctx.enumValues?.includes(value)) return ok(value);
        return this.typeError(ctx, `one of ${describeValue(ctx.enumValues ?? [])}`, value);
      case 'border-style':
        if (typeof value === 'string' && (THEME_BORDER_STYLES as readonly string[]).includes(value)) return ok(value);
        return this.typeError(ctx, `a border style (${THEME_BORDER_STYLES.join('|')})`, value);
      case 'asset':
        if (value === 'none') return ok('none');
        return this.typeError(ctx, "'none' or { file, mediaType, alt }", value);
      default:
        return this.typeError(ctx, type, value);
    }
  }

  private evalComposite(expression: Record<string, unknown>, type: EvalType, ctx: EvalContext): EvalResult {
    const requireFields = (fields: readonly string[]): boolean => {
      const missing = fields.filter((field) => !hasOwn(expression, field));
      if (missing.length > 0) {
        this.emit('theme.value-type', ctx.owner, `Key "${ctx.key}" ${type} value is missing field(s): ${missing.join(', ')}.`, {
          key: ctx.key,
        });
        return false;
      }
      return true;
    };
    switch (type) {
      case 'typography': {
        if (!requireFields(['weight', 'size', 'lineHeight'])) return FAIL;
        if (expression.family !== undefined && expression.family !== '$default') return this.typeError(ctx, 'the fixed system family', expression.family);
        const weight = this.evalTyped(expression.weight as ThemeExpression, 'number', ctx);
        const size = this.evalTyped(expression.size as ThemeExpression, 'length', ctx);
        const lineHeight = this.evalTyped(expression.lineHeight as ThemeExpression, 'number', ctx);
        if (!weight.ok || !size.ok || !lineHeight.ok) return FAIL;
        return {
          ok: true,
          value: {
            family: [...THEME_SYSTEM_FONT_FAMILY],
            features: ctx.key.startsWith('typography.numeric-') ? ['tnum'] : [],
            weight: weight.value,
            size: size.value,
            lineHeight: lineHeight.value,
          },
          tail: [],
        };
      }
      case 'border': {
        if (!requireFields(['width', 'style', 'color'])) return FAIL;
        const width = this.evalTyped(expression.width as ThemeExpression, 'length', ctx);
        const style = this.evalTyped(expression.style as ThemeExpression, 'border-style', ctx);
        const color = this.evalTyped(expression.color as ThemeExpression, 'color', ctx);
        if (!width.ok || !style.ok || !color.ok) return FAIL;
        return { ok: true, value: { width: width.value, style: style.value, color: color.value }, tail: [] };
      }
      case 'asset': {
        if (!requireFields(['file', 'mediaType', 'alt'])) return FAIL;
        const { file, mediaType, alt } = expression;
        if (typeof file !== 'string' || typeof mediaType !== 'string' || typeof alt !== 'string' || !file || !mediaType) {
          return this.typeError(ctx, '{ file, mediaType, alt } strings', expression);
        }
        const hash = this.p.packs.get(ctx.owner)?.files?.[file];
        if (typeof hash !== 'string' || hash.length === 0) {
          this.emit('theme.asset-missing', ctx.owner, `Asset file "${file}" (key "${ctx.key}") is not listed in the files of pack "${ctx.owner}".`, {
            key: ctx.key,
            path: file,
          });
          return FAIL;
        }
        return { ok: true, value: { file, mediaType, alt, packId: ctx.owner }, tail: [] };
      }
      default:
        return this.typeError(ctx, type, expression);
    }
  }

  private evalSwitch(
    expression: { $switch: string; cases: Record<string, ThemeExpression> },
    type: EvalType,
    ctx: EvalContext,
  ): EvalResult {
    if (ctx.inPrimitive) return FAIL;
    const selector = expression.$switch;
    if (this.p.constants.has(selector)) {
      this.emit('theme.tier-violation', ctx.owner, `$switch selector "${selector}" is a constant; theme packs cannot reference constants.`, {
        key: ctx.key,
      });
      return FAIL;
    }
    const selectorInfo = this.p.keyIndex.get(selector);
    if (!selectorInfo) {
      this.emit('theme.unresolved-reference', ctx.owner, `$switch selector "${selector}" (key "${ctx.key}") is not a catalog key.`, {
        key: ctx.key,
      });
      return FAIL;
    }
    if (selectorInfo.valueType !== 'enum') {
      this.emit('theme.value-type', ctx.owner, `$switch selector "${selector}" (key "${ctx.key}") must be an enum key, not ${selectorInfo.valueType}.`, {
        key: ctx.key,
      });
      return FAIL;
    }
    if (ctx.tier === 'semantic' && selectorInfo.tier === 'component') {
      this.emit('theme.tier-violation', ctx.owner, `Semantic key "${ctx.key}" must not depend on component key "${selector}".`, {
        key: ctx.key,
      });
      return FAIL;
    }
    const enumValues = selectorInfo.enumValues ?? [];
    const caseNames = Object.keys(expression.cases);
    const missing = enumValues.filter((value) => !caseNames.includes(value));
    const extra = caseNames.filter((name) => !enumValues.includes(name));
    let casesComplete = true;
    if (missing.length > 0 || extra.length > 0) {
      casesComplete = false;
      const parts = [
        missing.length > 0 ? `missing case(s): ${missing.join(', ')}` : '',
        extra.length > 0 ? `unexpected case(s): ${extra.join(', ')}` : '',
      ].filter(Boolean);
      this.emit('theme.value-type', ctx.owner, `$switch on "${selector}" (key "${ctx.key}") must cover exactly ${enumValues.join('|')}; ${parts.join('; ')}.`, {
        key: ctx.key,
      });
    }
    const selection = this.evalKey(selector, ctx);
    const outcomes = new Map<string, EvalResult>();
    for (const name of caseNames) {
      outcomes.set(name, this.evalTyped(expression.cases[name] as ThemeExpression, type, ctx));
    }
    if (!selection.ok || !casesComplete) return FAIL;
    const chosen = outcomes.get(selection.value as string);
    return chosen ?? FAIL;
  }

  private evalReference(name: string, type: EvalType, ctx: EvalContext): EvalResult {
    if (this.p.constants.has(name)) {
      if (!ctx.inPrimitive) {
        this.emit('theme.tier-violation', ctx.owner, `Key "${ctx.key}" references constant "${name}"; theme packs cannot reference constants.`, {
          key: ctx.key,
        });
      }
      return FAIL;
    }
    const info = this.p.keyIndex.get(name);
    if (info) {
      if (ctx.inPrimitive) return FAIL;
      if (ctx.tier === 'semantic' && info.tier === 'component') {
        this.emit('theme.tier-violation', ctx.owner, `Semantic key "${ctx.key}" must not reference component key "${name}".`, {
          key: ctx.key,
        });
        return FAIL;
      }
      const target = this.evalKey(name, ctx);
      if (!target.ok) return FAIL;
      return this.adaptKeyValue(name, info, target, type, ctx);
    }
    const primitive = this.lookupPrimitive(ctx.scope, name);
    if (!primitive) {
      this.emit('theme.unresolved-reference', ctx.owner, `Reference "{${name}}" in key "${ctx.key}" is neither a catalog key nor a Primitive visible from pack "${ctx.scope}".`, {
        key: ctx.key,
      });
      return FAIL;
    }
    const token = `${primitive.packId}:${name}`;
    if (this.stack.includes(token)) return this.cycle(token, ctx);
    this.stack.push(token);
    try {
      const inner = this.evalTyped(primitive.expression, type, {
        ...ctx,
        owner: primitive.packId,
        scope: primitive.packId,
        inPrimitive: true,
      });
      return inner.ok ? { ok: true, value: inner.value, tail: [token, ...inner.tail] } : FAIL;
    } finally {
      this.stack.pop();
    }
  }

  private adaptKeyValue(
    name: string,
    info: ThemeKeyInfo,
    target: Extract<KeyResult, { ok: true }>,
    type: EvalType,
    ctx: EvalContext,
  ): EvalResult {
    const tail = target.chain;
    const mismatch = (): EvalResult => {
      this.emit('theme.value-type', ctx.owner, `Key "${ctx.key}" expects ${type} but "${name}" is ${info.valueType}.`, {
        key: ctx.key,
      });
      return FAIL;
    };
    if (type === 'border-style') {
      if (
        info.valueType === 'enum' &&
        typeof target.value === 'string' &&
        (THEME_BORDER_STYLES as readonly string[]).includes(target.value)
      ) {
        return { ok: true, value: target.value, tail };
      }
      return mismatch();
    }
    if (type !== info.valueType) return mismatch();
    if (type === 'enum' && !ctx.enumValues?.includes(target.value as string)) {
      this.emit('theme.value-type', ctx.owner, `Key "${ctx.key}" expects one of ${describeValue(ctx.enumValues ?? [])} but "${name}" resolved to ${describeValue(target.value)}.`, {
        key: ctx.key,
      });
      return FAIL;
    }
    return { ok: true, value: target.value, tail };
  }

  private lookupPrimitive(scope: string, name: string): { packId: string; expression: ThemeExpression } | null {
    const start = this.p.chain.indexOf(scope);
    for (let index = Math.max(start, 0); index < this.p.chain.length; index += 1) {
      const packId = this.p.chain[index] as string;
      const values = this.p.packs.get(packId)?.primitives?.values;
      if (hasOwn(values, name)) return { packId, expression: (values as Record<string, ThemeExpression>)[name] as ThemeExpression };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Resolves every declared mode x every Theme of `packId` and computes the pack digest. */
export function resolveAllThemeTables(input: ResolveAllThemeTablesInput): ResolveAllThemeTablesResult {
  const { prepared, diagnostics: chainDiagnostics } = prepare(input, input.packId);
  if (!prepared) return { digest: null, tables: [], diagnostics: chainDiagnostics };

  const diagnostics: ThemeDiagnostic[] = lintChain(prepared);

  const evaluations: Array<{ mode: string; theme: string; output: EvaluationOutput }> = [];
  for (const mode of prepared.modes) {
    for (const theme of prepared.themeIds) {
      const evaluator = new Evaluator(prepared, mode, theme);
      const output = evaluator.run();
      diagnostics.push(...evaluator.diagnostics);
      evaluations.push({ mode, theme, output });
    }
  }
  if (hasThemeBlock(diagnostics)) return { digest: null, tables: [], diagnostics };

  const resolved: Record<string, Record<string, Record<string, ResolvedThemeValue>>> = {};
  for (const { mode, theme, output } of evaluations) {
    (resolved[theme] ??= {})[mode] = output.values;
  }
  const files: Record<string, string> = {};
  for (const pack of prepared.chainPacks) {
    for (const [path, hash] of Object.entries(pack.files ?? {})) files[`${pack.manifest.id}/${path}`] = hash;
  }
  const target = prepared.chainPacks[0] as ThemePackSource;
  const digest = computeThemePackDigest({
    packId: prepared.targetId,
    extendsChain: prepared.chain.slice(1),
    keyCatalogDigest: computeKeyCatalogDigest(prepared.catalog),
    modes: prepared.modes,
    defaultMode: target.manifest.defaultMode,
    themes: prepared.themeIds,
    defaultTheme: prepared.defaultTheme,
    resolved,
    files,
  });
  const tables: ResolvedThemeTable[] = evaluations.map(({ mode, theme, output }) => ({
    identity: { packId: prepared.targetId, packDigest: digest, mode, theme },
    values: output.values,
    provenance: output.provenance,
    constants: { ...prepared.constantValues },
  }));
  return { digest, tables, diagnostics };
}

/**
 * Resolves one `(packId, mode, theme)`. The pack is always evaluated as a
 * whole (its digest covers every theme x mode), so `table` is `null` when any
 * theme or mode of the pack has a block diagnostic.
 */
export function resolveThemePack(input: ResolveThemePackInput): ResolveThemePackResult {
  const { prepared, diagnostics: chainDiagnostics } = prepare(input, input.packId);
  if (!prepared) return { table: null, diagnostics: chainDiagnostics };

  const target = prepared.chainPacks[0] as ThemePackSource;
  const theme = input.theme ?? prepared.defaultTheme;
  const requestDiagnostics: ThemeDiagnostic[] = [];
  if (!target.manifest.modes.includes(input.mode)) {
    requestDiagnostics.push(
      createThemeDiagnostic('theme.mode-undeclared', input.packId, `Mode "${input.mode}" is not declared by pack "${input.packId}".`, {
        mode: input.mode,
        path: 'mode',
      }),
    );
  }
  if (!prepared.themeIds.includes(theme)) {
    requestDiagnostics.push(
      createThemeDiagnostic('theme.theme-undeclared', input.packId, `Theme "${theme}" is not defined for pack "${input.packId}".`, {
        theme,
        path: 'theme',
      }),
    );
  }

  const all = resolveAllThemeTables(input);
  const diagnostics = [...requestDiagnostics, ...all.diagnostics];
  if (requestDiagnostics.length > 0 || all.digest === null) return { table: null, diagnostics };
  const table = all.tables.find((entry) => entry.identity.mode === input.mode && entry.identity.theme === theme);
  return { table: table ?? null, diagnostics };
}