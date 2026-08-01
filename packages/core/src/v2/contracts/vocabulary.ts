import { z } from 'zod';

/**
 * `data-pb-role` closed word list (pb-v2-spec.md "语义词表"). This is a
 * product-semantic set, not equivalent to ARIA role. New words require a
 * schema change, not a free string.
 */
export const SEMANTIC_ROLES = [
  'page',
  'app-bar',
  'bottom-bar',
  'navigation',
  'section',
  'summary',
  'card',
  'list',
  'scroll-list',
  'list-item',
  'filter',
  'search',
  'form',
  'field',
  'tab-bar',
  'tab',
  'tab-panel',
  'tab-viewport',
  'chart',
  'empty-state',
  'loading-state',
  'error-state',
  'sheet',
  'dialog',
  'drawer',
  'toast',
  'button',
  'chip',
  'badge',
  'status',
  'icon',
  'image',
  'text',
  'unknown',
] as const;
export const SemanticRole = z.enum(SEMANTIC_ROLES);
export type SemanticRole = z.infer<typeof SemanticRole>;

export const OVERLAY_SHELLS = ['sheet', 'dialog', 'modal', 'drawer', 'popover', 'toast'] as const;
export const OverlayShell = z.enum(OVERLAY_SHELLS);
export type OverlayShell = z.infer<typeof OverlayShell>;

/**
 * Ordered low -> high. Ordering is only used for automatic activation
 * comparisons; it never replaces per-fact provenance judgement
 * (pb-v2-spec.md "Evidence Level").
 */
export const EVIDENCE_LEVELS = [
  'screenshot-only',
  'generic-runtime',
  'instrumented-runtime',
  'instrumented-source-runtime',
] as const;
export const EvidenceLevel = z.enum(EVIDENCE_LEVELS);
export type EvidenceLevel = z.infer<typeof EvidenceLevel>;

export function evidenceLevelRank(level: EvidenceLevel): number {
  return EVIDENCE_LEVELS.indexOf(level);
}

export function evidenceLevelAtLeast(level: EvidenceLevel, minimum: EvidenceLevel): boolean {
  return evidenceLevelRank(level) >= evidenceLevelRank(minimum);
}

/** Authoritative fact sources (pb-v2-spec.md "事实、来源与冲突"). Target facts must never appear here. */
export const FACT_SOURCES = [
  'registry',
  'component-contract',
  'runtime-registration',
  'runtime-contract',
  'data-pb',
  'source',
  'runtime-observation',
  'screenshot',
  'aria',
  'heuristic',
] as const;
export const FactSource = z.enum(FACT_SOURCES);
export type FactSource = z.infer<typeof FactSource>;

export const CAPTURE_INPUT_MODES = ['instrumented', 'generic-runtime', 'screenshot-only'] as const;
export const CaptureInputMode = z.enum(CAPTURE_INPUT_MODES);
export type CaptureInputMode = z.infer<typeof CaptureInputMode>;

export const ATTEMPT_RESULTS = ['captured', 'reused', 'failed', 'skipped', 'unsupported', 'cancelled', 'interrupted'] as const;
export const AttemptResult = z.enum(ATTEMPT_RESULTS);
export type AttemptResult = z.infer<typeof AttemptResult>;

export const RUN_TERMINATION_REASONS = ['completed', 'cancelled', 'interrupted', 'failed'] as const;
export const RunTerminationReason = z.enum(RUN_TERMINATION_REASONS);
export type RunTerminationReason = z.infer<typeof RunTerminationReason>;

/**
 * Capture Job lifecycle (pbwork-pb-v2-workflow.md "Job 执行状态"). These
 * values are the only public execution-state vocabulary; Service, PBWork
 * and CLI must not collapse the four observable phases into a private
 * `running` state.
 */
export const JOB_STATUSES = [
  'queued',
  'discovering',
  'capturing',
  'writing',
  'completed',
  'cancelled',
  'interrupted',
  'failed',
] as const;
export const JobStatus = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof JobStatus>;

export const JOB_EXECUTING_STATUSES = ['discovering', 'capturing', 'writing'] as const;
export type ExecutingJobStatus = (typeof JOB_EXECUTING_STATUSES)[number];

export const JOB_TERMINAL_STATUS_VALUES = ['completed', 'cancelled', 'interrupted', 'failed'] as const;
export type TerminalJobStatus = (typeof JOB_TERMINAL_STATUS_VALUES)[number];

export const JOB_TERMINAL_STATUSES = new Set<JobStatus>(JOB_TERMINAL_STATUS_VALUES);

export function isTerminalJobStatus(status: JobStatus): boolean {
  return JOB_TERMINAL_STATUSES.has(status);
}

/**
 * pb-v2-spec.md "Bundle 生命周期": a `writable` Bundle can append new Runs;
 * an `archived` Bundle is read-only and can only be continued from via an
 * explicit fork into a new Bundle.
 */
export const BUNDLE_STATUSES = ['writable', 'archived', 'trashed'] as const;
export const BundleStatus = z.enum(BUNDLE_STATUSES);
export type BundleStatus = z.infer<typeof BundleStatus>;

export const COVERAGE_STATUSES = ['complete', 'partial'] as const;
export const CoverageStatus = z.enum(COVERAGE_STATUSES);
export type CoverageStatus = z.infer<typeof CoverageStatus>;

export const FRESHNESS_STATUSES = ['fresh', 'stale'] as const;
export const FreshnessStatus = z.enum(FRESHNESS_STATUSES);
export type FreshnessStatus = z.infer<typeof FreshnessStatus>;

export const ISSUE_SEVERITIES = ['blocked', 'warning', 'info'] as const;
export const IssueSeverity = z.enum(ISSUE_SEVERITIES);
export type IssueSeverity = z.infer<typeof IssueSeverity>;

export const RISK_KINDS = [
  'partial-coverage',
  'stale-evidence',
  'required-unknown',
  'unresolved-conflict',
  'evidence-level-limitation',
  'manual-promotion',
  'interaction-coverage',
] as const;
export const RiskKind = z.enum(RISK_KINDS);
export type RiskKind = z.infer<typeof RiskKind>;
