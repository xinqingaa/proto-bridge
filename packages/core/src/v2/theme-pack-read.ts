import { readCaseIdParts } from './contracts/case.js';
import type { CatalogRevision } from './contracts/catalog.js';
import { V2ContractError, unknownReferenceError } from './contracts/errors.js';
import type { AgentHandoff } from './contracts/handoff.js';
import type {
  ResolvedThemeProvenance,
  ResolvedThemeValue,
} from './theme/schema.js';

export type ThemePackTable = {
  values: Record<string, ResolvedThemeValue>;
  provenance: Record<string, ResolvedThemeProvenance>;
};

export function themePackManifestObjectId(packId: string): string {
  return `${packId}/manifest`;
}

export function themePackTableObjectId(
  packId: string,
  theme: string,
  mode: string,
): string {
  return `${packId}/${theme}/${mode}`;
}

export function readThemePackTable(
  catalog: CatalogRevision,
  packId: string,
  theme: string,
  mode: string,
): ThemePackTable {
  const objectId = themePackTableObjectId(packId, theme, mode);
  const entry = catalog.entries.find((candidate) => candidate.objectId === objectId);
  if (!entry) {
    throw unknownReferenceError('theme-pack table', objectId);
  }
  const value = entry.value;
  if (!value || typeof value !== 'object') {
    throw new V2ContractError(
      'invalid-schema',
      `theme-pack entry ${objectId} has no resolved table.`,
    );
  }
  const record = value as {
    values?: Record<string, ResolvedThemeValue>;
    provenance?: Record<string, ResolvedThemeProvenance>;
  };
  if (!record.values || !record.provenance) {
    throw new V2ContractError(
      'invalid-schema',
      `theme-pack entry ${objectId} is missing values or provenance.`,
    );
  }
  return { values: record.values, provenance: record.provenance };
}

export type ThemePackProjection = {
  packId: string;
  packDigest: string;
  defaultTheme: string;
  defaultMode: string;
  theme: string;
  mode: string;
  /** Legacy presence flag: at least one resolved selected Case, never exhaustive Screenshot coverage. */
  captured: boolean;
  pageCoverage: {
    resolvedCaseCount: number;
    /** Full state/Screenshot coverage is reported by the fixed Handoff index. */
    allStates: 'not-evaluated';
  };
  catalogRevisionId: string;
  values: Record<string, ResolvedThemeValue>;
  provenance: Record<string, { chain: string[]; tier?: string }>;
};

export function projectThemePack(input: {
  handoff: AgentHandoff;
  catalog: CatalogRevision;
  theme?: string;
  mode?: string;
  tokenIds?: string[];
}): ThemePackProjection {
  if (input.catalog.kind !== 'theme-pack') {
    throw new V2ContractError(
      'invalid-schema',
      `Catalog ${input.catalog.catalogRevisionId} is not a theme-pack.`,
    );
  }
  if (input.catalog.catalogRevisionId !== input.handoff.themePack.catalogRevisionId) {
    throw new V2ContractError(
      'unknown-reference',
      'theme-pack Catalog is not the revision fixed by this Handoff.',
    );
  }
  const theme = input.theme ?? input.handoff.themePack.defaultTheme;
  const mode = input.mode ?? input.handoff.themePack.defaultMode;
  const table = readThemePackTable(
    input.catalog,
    input.handoff.themePack.packId,
    theme,
    mode,
  );
  const tokenIds = input.tokenIds ? new Set(input.tokenIds) : undefined;
  const values: ThemePackProjection['values'] = {};
  const provenance: ThemePackProjection['provenance'] = {};
  for (const [tokenId, value] of Object.entries(table.values)) {
    if (tokenIds && !tokenIds.has(tokenId)) continue;
    values[tokenId] = value;
    const chain = table.provenance[tokenId]?.chain ?? [];
    provenance[tokenId] = { chain };
  }
  const resolvedCases = input.handoff.selectedCases.filter((selected) => {
    if (selected.resolution !== 'resolved') return false;
    const key = selected.caseKey ?? readCaseIdParts(selected.caseId);
    return Boolean(key && (key.theme ?? input.handoff.themePack.defaultTheme) === theme && key.themeId === mode);
  });
  return {
    packId: input.handoff.themePack.packId,
    packDigest: input.handoff.themePack.packDigest,
    defaultTheme: input.handoff.themePack.defaultTheme,
    defaultMode: input.handoff.themePack.defaultMode,
    theme,
    mode,
    captured: resolvedCases.length > 0,
    pageCoverage: { resolvedCaseCount: resolvedCases.length, allStates: 'not-evaluated' },
    catalogRevisionId: input.catalog.catalogRevisionId,
    values,
    provenance,
  };
}
