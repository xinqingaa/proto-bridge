import { CONTRAST_THRESHOLDS, contrastRatio, parseThemeColor } from './contrast.js';
import { listPackChain, resolveAllThemeTables, type ResolveAllThemeTablesResult } from './resolve.js';
import {
  ThemeConstantTable,
  ThemeKeyCatalog,
  ThemePackSource,
  createThemeDiagnostic,
  type ResolvedThemeTable,
  type ThemeContrastWaiver,
  type ThemeDiagnostic,
  type ThemeDiagnosticCode,
} from './schema.js';

export interface ThemePrototypeBinding {
  prototypeId: string;
  packId: string;
}

export interface ValidateThemePacksInput {
  keyCatalog: ThemeKeyCatalog;
  constants: ThemeConstantTable;
  packs: ReadonlyMap<string, ThemePackSource>;
  prototypeBindings?: ReadonlyArray<ThemePrototypeBinding> | undefined;
  /** Also emit `theme.inherited` (info) diagnostics. Default `false`. */
  includeInfo?: boolean | undefined;
}

/** `packId` used for diagnostics that belong to the Key Catalog rather than to a pack. */
export const THEME_CATALOG_DIAGNOSTIC_PACK_ID = '(catalog)';
/** `packId` used for diagnostics that belong to the constant table. */
export const THEME_CONSTANTS_DIAGNOSTIC_PACK_ID = '(constants)';

type Extra = { key?: string | undefined; mode?: string | undefined; theme?: string | undefined; path?: string | undefined };

interface CollectedEntry {
  diagnostic: ThemeDiagnostic;
  modes: Set<string | undefined>;
  themes: Set<string | undefined>;
}

/**
 * Deduplicates diagnostics by (code, packId, key, path, message). When the
 * same diagnostic occurs in several mode/Theme combinations, `mode` /
 * `theme` survive only if all occurrences agree on them.
 */
class Collector {
  private readonly entries = new Map<string, CollectedEntry>();

  add(diagnostic: ThemeDiagnostic): void {
    const id = `${diagnostic.code}|${diagnostic.packId}|${diagnostic.key ?? ''}|${diagnostic.path ?? ''}|${diagnostic.message}`;
    const existing = this.entries.get(id);
    if (existing) {
      existing.modes.add(diagnostic.mode);
      existing.themes.add(diagnostic.theme);
      return;
    }
    this.entries.set(id, {
      diagnostic: { ...diagnostic },
      modes: new Set([diagnostic.mode]),
      themes: new Set([diagnostic.theme]),
    });
  }

  emit(code: ThemeDiagnosticCode, packId: string, message: string, extra: Extra = {}): void {
    this.add(createThemeDiagnostic(code, packId, message, extra));
  }

  list(): ThemeDiagnostic[] {
    return [...this.entries.values()].map(({ diagnostic, modes, themes }) => {
      const result = { ...diagnostic };
      const [mode] = [...modes];
      if (modes.size !== 1 || mode === undefined) delete result.mode;
      const [theme] = [...themes];
      if (themes.size !== 1 || theme === undefined) delete result.theme;
      return result;
    });
  }
}

function formatIssuePath(path: ReadonlyArray<string | number>): string {
  return path.reduce<string>(
    (text, part) => (typeof part === 'number' ? `${text}[${part}]` : text ? `${text}.${part}` : part),
    '',
  );
}

function collectSchemaIssues(
  collector: Collector,
  packId: string,
  result:
    | { success: true }
    | { success: false; error: { issues: ReadonlyArray<{ path: ReadonlyArray<string | number>; message: string }> } },
): boolean {
  if (result.success) return true;
  for (const issue of result.error.issues) {
    const path = formatIssuePath(issue.path);
    collector.emit('theme.schema', packId, issue.message, path ? { path } : {});
  }
  return false;
}

/**
 * Validates the Key Catalog, the constant table and every pack:
 * structure (`theme.schema`), resolution of every declared mode x Theme
 * (all resolver diagnostics), assets, contrast, scope and prototype
 * bindings.
 *
 * Contrast waivers bind to concrete foreground/background value pairs: a
 * pack's own `contrastWaivers` apply to it, and an ancestor's waiver is
 * inherited only while the pack resolves both sides to the same colors as
 * the declaring ancestor.
 */
export function validateThemePacks(input: ValidateThemePacksInput): ThemeDiagnostic[] {
  const collector = new Collector();

  // -- catalog and constants -------------------------------------------------
  const catalogOk = collectSchemaIssues(
    collector,
    THEME_CATALOG_DIAGNOSTIC_PACK_ID,
    ThemeKeyCatalog.safeParse(input.keyCatalog),
  );
  const constantsOk = collectSchemaIssues(
    collector,
    THEME_CONSTANTS_DIAGNOSTIC_PACK_ID,
    ThemeConstantTable.safeParse(input.constants),
  );
  let tablesConsistent = catalogOk && constantsOk;
  if (tablesConsistent) {
    const catalogIds = new Set(input.keyCatalog.keys.map((key) => key.id));
    for (const constant of input.constants.constants) {
      if (catalogIds.has(constant.id)) {
        tablesConsistent = false;
        collector.emit(
          'theme.schema',
          THEME_CONSTANTS_DIAGNOSTIC_PACK_ID,
          `Constant "${constant.id}" has the same id as a catalog key.`,
          { key: constant.id },
        );
      }
    }
  }

  // -- pack structure --------------------------------------------------------
  const invalid = new Set<string>();
  for (const [id, pack] of input.packs) {
    const ok = collectSchemaIssues(collector, id, ThemePackSource.safeParse(pack));
    const manifestId = (pack as { manifest?: { id?: unknown } } | undefined)?.manifest?.id;
    if (ok && manifestId !== id) {
      collector.emit('theme.schema', id, `Pack registered as "${id}" declares manifest.id "${String(manifestId)}".`, {
        path: 'manifest.id',
      });
      invalid.add(id);
    } else if (!ok) {
      invalid.add(id);
    }
  }

  const hasInvalidAncestor = (startId: string): boolean => {
    const visited = new Set<string>();
    let current: string | undefined = startId;
    while (current !== undefined && !visited.has(current)) {
      if (invalid.has(current)) return true;
      visited.add(current);
      current = input.packs.get(current)?.manifest?.extends;
    }
    return false;
  };

  // -- resolution (lazy, cached; ancestors are consulted for waiver inheritance)
  const resolutions = new Map<string, ResolveAllThemeTablesResult>();
  const resolutionOf = (id: string): ResolveAllThemeTablesResult | null => {
    if (!tablesConsistent || invalid.has(id) || hasInvalidAncestor(id)) return null;
    let resolution = resolutions.get(id);
    if (!resolution) {
      resolution = resolveAllThemeTables({
        keyCatalog: input.keyCatalog,
        constants: input.constants,
        packs: input.packs,
        packId: id,
      });
      resolutions.set(id, resolution);
    }
    return resolution;
  };

  // -- per pack --------------------------------------------------------------
  for (const [id, pack] of input.packs) {
    if (invalid.has(id)) continue;
    checkPackScope(collector, id, pack);

    const resolution = resolutionOf(id);
    if (!resolution) continue;
    for (const diagnostic of resolution.diagnostics) collector.add(diagnostic);
    if (resolution.digest === null) continue;
    checkContrast(collector, id, pack, input, resolution.tables, (ancestorId) => {
      const ancestor = resolutionOf(ancestorId);
      return ancestor && ancestor.digest !== null ? ancestor.tables : null;
    });
    if (input.includeInfo === true) emitInherited(collector, id, pack, resolution.tables);
  }

  // -- prototype bindings ----------------------------------------------------
  for (const binding of input.prototypeBindings ?? []) {
    const pack = input.packs.get(binding.packId);
    if (!pack) {
      collector.emit(
        'theme.unresolved-reference',
        binding.packId,
        `Prototype "${binding.prototypeId}" is bound to theme pack "${binding.packId}", which does not exist.`,
        { path: `prototypeBindings.${binding.prototypeId}` },
      );
      continue;
    }
    if (invalid.has(binding.packId)) continue;
    const scope = pack.manifest.scope;
    if (scope === 'playground') {
      collector.emit(
        'theme.scope-violation',
        binding.packId,
        `Prototype "${binding.prototypeId}" cannot use playground pack "${binding.packId}".`,
        { path: `prototypeBindings.${binding.prototypeId}` },
      );
    } else if (scope === 'prototype' && binding.packId !== binding.prototypeId) {
      collector.emit(
        'theme.scope-violation',
        binding.packId,
        `Prototype pack "${binding.packId}" belongs to its own prototype and cannot be used by "${binding.prototypeId}".`,
        { path: `prototypeBindings.${binding.prototypeId}` },
      );
    }
  }

  return collector.list();
}

function checkPackScope(collector: Collector, packId: string, pack: ThemePackSource): void {
  if (pack.manifest.scope !== 'prototype') return;
  if (pack.ownerPrototypeId === undefined) {
    collector.emit('theme.scope-violation', packId, `Prototype pack "${packId}" has no ownerPrototypeId.`, {
      path: 'ownerPrototypeId',
    });
  } else if (pack.ownerPrototypeId !== packId) {
    collector.emit(
      'theme.scope-violation',
      packId,
      `Prototype pack id "${packId}" must equal its prototype id "${pack.ownerPrototypeId}".`,
      { path: 'ownerPrototypeId' },
    );
  }
}

function waiverMatches(
  waiver: ThemeContrastWaiver,
  foreground: string,
  background: string,
  mode: string,
  theme: string,
): boolean {
  return (
    waiver.pair[0] === foreground &&
    waiver.pair[1] === background &&
    (waiver.modes === undefined || waiver.modes.includes(mode)) &&
    (waiver.themes === undefined || waiver.themes.includes(theme))
  );
}

function sameColor(a: string, b: string): boolean {
  const left = parseThemeColor(a);
  const right = parseThemeColor(b);
  if (!left || !right) return a === b;
  const close = (x: number, y: number) => Math.abs(x - y) < 1e-6;
  return close(left.r, right.r) && close(left.g, right.g) && close(left.b, right.b) && close(left.a, right.a);
}

function checkContrast(
  collector: Collector,
  packId: string,
  pack: ThemePackSource,
  input: ValidateThemePacksInput,
  tables: readonly ResolvedThemeTable[],
  ancestorTables: (ancestorId: string) => readonly ResolvedThemeTable[] | null,
): void {
  const catalog = input.keyCatalog;
  const waivers = pack.manifest.contrastWaivers ?? [];
  const used = new Set<number>();
  const ancestors = listPackChain(input.packs, packId).chain.slice(1);

  const ancestorDefaultTheme = (ancestorId: string): string => {
    for (const id of listPackChain(input.packs, ancestorId).chain) {
      const theme = input.packs.get(id)?.manifest.defaultTheme;
      if (theme !== undefined) return theme;
    }
    return 'default';
  };

  for (const table of tables) {
    const { mode, theme } = table.identity;
    for (const pair of catalog.contrastPairs) {
      const foregroundValue = table.values[pair.foreground];
      const backgroundValue = table.values[pair.background];
      const foreground = typeof foregroundValue === 'string' ? parseThemeColor(foregroundValue) : null;
      const background = typeof backgroundValue === 'string' ? parseThemeColor(backgroundValue) : null;
      const path = `contrastPairs:${pair.foreground}/${pair.background}`;
      if (!foreground || !background) {
        const side = foreground ? pair.background : pair.foreground;
        collector.emit(
          'theme.value-type',
          packId,
          `Contrast pair ${pair.foreground} / ${pair.background}: "${side}" is not a parseable color.`,
          { key: side, mode, theme, path },
        );
        continue;
      }
      const backdropValue = table.values[pair.backdrop ?? 'color.background'];
      const backdrop = typeof backdropValue === 'string' ? (parseThemeColor(backdropValue) ?? undefined) : undefined;
      const ratio = contrastRatio(foreground, background, backdrop);
      const threshold = CONTRAST_THRESHOLDS[pair.level];
      if (ratio + 1e-9 >= threshold) continue;

      const summary = `Contrast ${pair.foreground} on ${pair.background} is ${ratio.toFixed(2)}:1, below the ${threshold}:1 ${pair.level} threshold`;
      const extra = { key: pair.foreground, mode, theme, path };

      // 1. The pack's own waiver.
      const own: number[] = [];
      waivers.forEach((waiver, index) => {
        if (waiverMatches(waiver, pair.foreground, pair.background, mode, theme)) {
          own.push(index);
          used.add(index);
        }
      });
      if (own.length > 0) {
        const reason = (waivers[own[0] as number] as ThemeContrastWaiver).reason;
        collector.emit('theme.contrast-waived', packId, `${summary}; waived: ${reason}`, extra);
        continue;
      }

      // 2. A waiver inherited from an ancestor while both resolved colors are unchanged.
      let inheritedFrom: { ancestor: string; reason: string } | undefined;
      let invalidated: { ancestor: string; changed: string[] } | undefined;
      for (const ancestorId of ancestors) {
        const ancestorPack = input.packs.get(ancestorId);
        const candidates = ancestorTables(ancestorId);
        if (!ancestorPack || !candidates) continue;
        const ancestorThemes = new Set(candidates.map((candidate) => candidate.identity.theme));
        const ancestorTheme = ancestorThemes.has(theme) ? theme : ancestorDefaultTheme(ancestorId);
        const match = (ancestorPack.manifest.contrastWaivers ?? []).find((waiver) =>
          waiverMatches(waiver, pair.foreground, pair.background, mode, ancestorTheme),
        );
        if (!match) continue;
        const ancestorTable = candidates.find(
          (candidate) => candidate.identity.mode === mode && candidate.identity.theme === ancestorTheme,
        );
        if (!ancestorTable) continue;
        const changed: string[] = [];
        const ancestorForeground = ancestorTable.values[pair.foreground];
        const ancestorBackground = ancestorTable.values[pair.background];
        if (typeof ancestorForeground !== 'string' || !sameColor(ancestorForeground, foregroundValue as string)) {
          changed.push('foreground');
        }
        if (typeof ancestorBackground !== 'string' || !sameColor(ancestorBackground, backgroundValue as string)) {
          changed.push('background');
        }
        if (changed.length === 0) {
          inheritedFrom = { ancestor: ancestorId, reason: match.reason };
          break;
        }
        invalidated ??= { ancestor: ancestorId, changed };
      }
      if (inheritedFrom) {
        collector.emit(
          'theme.contrast-waived',
          packId,
          `${summary}; waived (inherited from "${inheritedFrom.ancestor}", 继承自 ${inheritedFrom.ancestor}): ${inheritedFrom.reason}`,
          extra,
        );
        continue;
      }

      // 3. Block.
      if (invalidated) {
        const sides = invalidated.changed.join(' and ');
        collector.emit(
          'theme.contrast-insufficient',
          packId,
          `${summary}; the ${sides} side value changed, so the waiver inherited from "${invalidated.ancestor}" no longer applies (已改变 ${sides} 侧取值，继承自 ${invalidated.ancestor} 的豁免失效).`,
          extra,
        );
      } else {
        collector.emit('theme.contrast-insufficient', packId, `${summary}.`, extra);
      }
    }
  }

  waivers.forEach((waiver, index) => {
    if (used.has(index)) return;
    collector.emit(
      'theme.contrast-waiver-unused',
      packId,
      `Contrast waiver for ${waiver.pair[0]} / ${waiver.pair[1]} did not match any failing pair.`,
      { key: waiver.pair[0], path: `manifest.contrastWaivers[${index}]` },
    );
  });
}

function emitInherited(
  collector: Collector,
  packId: string,
  pack: ThemePackSource,
  tables: readonly ResolvedThemeTable[],
): void {
  const table =
    tables.find((entry) => entry.identity.theme === pack.manifest.defaultTheme && entry.identity.mode === pack.manifest.defaultMode) ??
    (tables[0] as ResolvedThemeTable | undefined);
  if (!table) return;
  for (const [key, provenance] of Object.entries(table.provenance)) {
    if (!provenance.inherited) continue;
    collector.emit('theme.inherited', packId, `Key "${key}" inherits its value from "${provenance.sourcePackId}".`, {
      key,
      mode: table.identity.mode,
      theme: table.identity.theme,
    });
  }
}
