import { z } from 'zod';

/**
 * Stable identity rule (pb-v2-spec.md "稳定身份"): lowercase, readable,
 * business-authored identifiers. No timestamps, array indices, DOM order,
 * random classes or incrementing counters, and never a CSS selector or
 * DOM path. Segments are alphanumeric, joined by `.`, `-` or `_`.
 */
const STABLE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

function stableId(label: string, maxLength = 200) {
  return z
    .string()
    .min(1, `${label} must not be empty`)
    .max(maxLength, `${label} must be at most ${maxLength} characters`)
    .regex(
      STABLE_ID_PATTERN,
      `${label} must be a stable lowercase identifier (letters, digits, '.', '-', '_'); ` +
        'CSS selectors, DOM paths, and array indices are not allowed',
    )
    .describe(label);
}

/**
 * `CaseId` is machine-derived by `computeCaseId` from already-validated
 * stable dimension ids (pb-v2-spec.md 允许 composite identity). It reuses
 * `::`, `@` and `=` as reserved joiners, so it needs a looser pattern than
 * a single authored stable id while still rejecting whitespace, CSS
 * selector syntax and DOM paths.
 */
const COMPOSITE_ID_PATTERN = /^[a-z][a-z0-9._:@=-]*$/;

function compositeId(label: string, maxLength = 600) {
  return z
    .string()
    .min(1, `${label} must not be empty`)
    .max(maxLength, `${label} must be at most ${maxLength} characters`)
    .regex(COMPOSITE_ID_PATTERN, `${label} must be a machine-derived composite of stable ids, not a CSS selector or DOM path`)
    .describe(label);
}

export const WorkspaceId = stableId('workspaceId');
export const PrototypeId = stableId('prototypeId');
/** Should carry the owning Prototype as a prefix, e.g. `sample.task-list`. */
export const ScreenId = stableId('screenId');
export const VariantId = stableId('variantId');
export const ThemeId = stableId('themeId');
export const DeviceId = stableId('deviceId');
export const ActionId = stableId('actionId');
export const ScenarioId = stableId('scenarioId');
export const CheckpointId = stableId('checkpointId');
export const ComponentId = stableId('componentId');
export const SlotId = stableId('slotId');
export const TokenId = stableId('tokenId');
export const AssetId = stableId('assetId');

/** `data-pb-id`: unique within the current visible semantic tree, or a shared template id for repeated instances. */
export const PbId = stableId('pbId', 400);
/** `data-pb-key`: required alongside a repeated-instance `pbId`; must be a non-sensitive business-stable key. */
export const PbKey = stableId('pbKey', 200);

export const BundleId = stableId('bundleId');
export const JobId = stableId('jobId');
export const RunId = stableId('runId');
export const AttemptId = stableId('attemptId');
export const CaseId = compositeId('caseId', 600);
export const CaseEvidenceRevisionId = stableId('caseEvidenceRevisionId');
export const CatalogRevisionId = stableId('catalogRevisionId');
export const SnapshotId = stableId('snapshotId');
export const StalenessReportId = stableId('stalenessReportId');
export const HandoffId = stableId('handoffId');
export const IssueId = stableId('issueId');
export const BlobId = stableId('blobId');

/** Produced only by `computeScopeKey`; never authored by hand. */
export const ScopeKey = z
  .string()
  .regex(/^scope_[0-9a-f]{12,64}$/, 'scopeKey must be produced by computeScopeKey')
  .describe('scopeKey');

export type WorkspaceId = z.infer<typeof WorkspaceId>;
export type PrototypeId = z.infer<typeof PrototypeId>;
export type ScreenId = z.infer<typeof ScreenId>;
export type VariantId = z.infer<typeof VariantId>;
export type ThemeId = z.infer<typeof ThemeId>;
export type DeviceId = z.infer<typeof DeviceId>;
export type ActionId = z.infer<typeof ActionId>;
export type ScenarioId = z.infer<typeof ScenarioId>;
export type CheckpointId = z.infer<typeof CheckpointId>;
export type ComponentId = z.infer<typeof ComponentId>;
export type SlotId = z.infer<typeof SlotId>;
export type TokenId = z.infer<typeof TokenId>;
export type AssetId = z.infer<typeof AssetId>;
export type PbId = z.infer<typeof PbId>;
export type PbKey = z.infer<typeof PbKey>;
export type BundleId = z.infer<typeof BundleId>;
export type JobId = z.infer<typeof JobId>;
export type RunId = z.infer<typeof RunId>;
export type AttemptId = z.infer<typeof AttemptId>;
export type CaseId = z.infer<typeof CaseId>;
export type CaseEvidenceRevisionId = z.infer<typeof CaseEvidenceRevisionId>;
export type CatalogRevisionId = z.infer<typeof CatalogRevisionId>;
export type SnapshotId = z.infer<typeof SnapshotId>;
export type StalenessReportId = z.infer<typeof StalenessReportId>;
export type HandoffId = z.infer<typeof HandoffId>;
export type IssueId = z.infer<typeof IssueId>;
export type BlobId = z.infer<typeof BlobId>;
export type ScopeKey = z.infer<typeof ScopeKey>;
