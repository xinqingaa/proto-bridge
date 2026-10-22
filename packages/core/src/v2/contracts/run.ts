import { z } from 'zod';
import { CaseAttempt } from './attempt.js';
import { CoverageSummary } from './coverage.js';
import { BundleId, CaseId, IssueId, PrototypeId, RunId, ScopeKey, WorkspaceId } from './ids.js';
import { NormalizedCaptureScope, computeScopeKey } from './scope.js';
import { CaseKey, computeCaseId } from './case.js';
import { RunTerminationReason } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';
import { ThemeIdentity } from '../theme/schema.js';

/** One selected Case plus the Capture Scope requested for it, as fixed inside a normalized Selection. */
export const SelectedCase = z
  .object({
    caseId: CaseId,
    caseKey: CaseKey,
    captureScope: NormalizedCaptureScope,
  })
  .strict();
export type SelectedCase = z.infer<typeof SelectedCase>;

export const CapturePurpose = z.enum(['implementation-delivery', 'appearance-audit']);
export type CapturePurpose = z.infer<typeof CapturePurpose>;

export const AppearanceDimension = z.enum(['structure', 'components', 'bindings', 'resources', 'layout']);
export type AppearanceDimension = z.infer<typeof AppearanceDimension>;

export const CapturePlanReference = z.object({ caseId: CaseId, scopeKey: ScopeKey }).strict();
export type CapturePlanReference = z.infer<typeof CapturePlanReference>;

/** Fixed planning claims, never fabricated Runtime observations or pixel Facts. */
export const CapturePlan = z.object({
  version: z.literal(1),
  purpose: CapturePurpose,
  inputVersion: z.string().min(1),
  sourceDigest: z.string().optional(),
  baseline: ThemeIdentity.pick({ theme: true, mode: true }),
  fullCaseCount: z.number().int().nonnegative(),
  businessCases: z.array(SelectedCase),
  observations: z.array(z.object({
    selectedCase: SelectedCase,
    reason: z.enum(['baseline', 'representative', 'fallback', 'audit']),
  }).strict()),
  rules: z.array(z.object({
    ruleKey: z.string().min(1),
    ruleScreenId: z.string().min(1),
    ruleId: z.string().min(1),
    rationale: z.string().min(1),
    dimensions: z.array(AppearanceDimension).min(1),
    representatives: z.array(CapturePlanReference),
  }).strict()),
  derivations: z.array(z.object({
    selectedCase: SelectedCase,
    baseline: CapturePlanReference,
    ruleKey: z.string().min(1),
    /** No screenshot is asserted for the omitted appearance. */
    pixels: z.literal('unobserved'),
  }).strict()),
}).strict();
export type CapturePlan = z.infer<typeof CapturePlan>;

/** Minimal normalized Selection: a Preflight-approved Case Matrix for one Prototype. */
export const NormalizedSelection = z
  .object({
    prototypeId: PrototypeId,
    /** Default theme and mode fixed for this matrix. Case `themeId` is the mode. */
    themePack: ThemeIdentity,
    /** Full authored theme/mode domain; legacy Runs leave it unknown. */
    declaredThemeModes: z.array(ThemeIdentity.pick({ theme: true, mode: true })).min(1).optional(),
    capturePlan: CapturePlan.optional(),
    cases: z.array(SelectedCase).min(1),
    acceptedWarningIds: z.array(IssueId).default([]),
  })
  .strict()
  .superRefine((selection, ctx) => {
    const plan = selection.capturePlan;
    if (!plan) return;
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capturePlan'], message });
    const key = (item: SelectedCase) => `${item.caseId}#${computeScopeKey(item.captureScope)}`;
    const business = (item: SelectedCase) => {
      const { theme: _theme, themeId: _mode, ...rest } = item.caseKey;
      return JSON.stringify([rest, computeScopeKey(item.captureScope)]);
    };
    const cases = new Set(selection.cases.map(key));
    const observed = new Set(plan.observations.map((entry) => key(entry.selectedCase)));
    const derived = new Set(plan.derivations.map((entry) => key(entry.selectedCase)));
    if (cases.size !== observed.size || [...cases].some((id) => !observed.has(id)) || observed.size !== plan.observations.length) issue('Plan observations must exactly match selected Case/Scopes.');
    if (derived.size !== plan.derivations.length || [...derived].some((id) => observed.has(id)) || plan.fullCaseCount !== observed.size + derived.size) issue('Plan must partition the full appearance domain without duplicates.');
    if (plan.purpose === 'appearance-audit' && derived.size) issue('Appearance audit cannot derive unobserved Cases.');
    if (derived.size && !/^sha256:[0-9a-f]{64}$/.test(plan.sourceDigest ?? '')) issue('Derivations require a fixed source digest.');
    if (plan.baseline.theme !== selection.themePack.theme || plan.baseline.mode !== selection.themePack.mode) issue('Plan baseline must match the fixed default appearance.');
    const baseline = new Map(plan.businessCases.map((item) => [business(item), item]));
    if (baseline.size !== plan.businessCases.length) issue('Business Cases must be unique.');
    const expectedDomain = new Set(plan.businessCases.flatMap((item) =>
      (selection.declaredThemeModes ?? []).map((appearance) => {
        const caseKey = { ...item.caseKey, theme: appearance.theme, themeId: appearance.mode };
        return key({ ...item, caseKey, caseId: computeCaseId(caseKey) });
      })));
    if (!selection.declaredThemeModes || expectedDomain.size !== plan.fullCaseCount ||
      [...expectedDomain].some((id) => !observed.has(id) && !derived.has(id)) ||
      [...observed, ...derived].some((id) => !expectedDomain.has(id))) issue('Plan must account for the full declared appearance domain of every business Case.');
    for (const item of plan.businessCases) {
      if (!cases.has(key(item)) || item.caseKey.theme !== plan.baseline.theme || item.caseKey.themeId !== plan.baseline.mode) issue('Every business Case requires a selected baseline observation.');
    }
    for (const item of [...selection.cases, ...plan.derivations.map((entry) => entry.selectedCase)]) {
      if (computeCaseId(item.caseKey) !== item.caseId || !baseline.has(business(item))) issue('Plan appearance has an invalid identity or missing business baseline.');
    }
    const referenceKey = (item: CapturePlanReference) => `${item.caseId}#${item.scopeKey}`;
    const sources = new Map(selection.cases.map((item) => [key(item), item]));
    const rules = new Map(plan.rules.map((rule) => [rule.ruleKey, rule]));
    if (rules.size !== plan.rules.length) issue('Plan rule keys must be unique.');
    for (const rule of plan.rules) {
      if (!AppearanceDimension.options.every((dimension) => rule.dimensions.includes(dimension))) issue('Derivations must account for every appearance dimension.');
      if (rule.representatives.some((ref) => !sources.has(referenceKey(ref)))) issue('Representative references must resolve to selected observations.');
    }
    for (const entry of plan.derivations) {
      const expected = baseline.get(business(entry.selectedCase));
      if (!expected || key(expected) !== referenceKey(entry.baseline)) issue('Derivation baseline must resolve to its selected business observation.');
      const rule = rules.get(entry.ruleKey);
      if (!rule || rule.ruleScreenId !== entry.selectedCase.caseKey.screenId || rule.representatives.some((ref) => {
        const item = sources.get(referenceKey(ref));
        return !item || item.caseKey.scenario || item.caseKey.screenId !== rule.ruleScreenId ||
          item.caseKey.deviceId !== entry.selectedCase.caseKey.deviceId ||
          computeScopeKey(item.captureScope) !== computeScopeKey(entry.selectedCase.captureScope);
      })) issue('Representative references must use the same Screen, device and Scope.');
    }
    const references = [...plan.businessCases, ...plan.observations.map((entry) => entry.selectedCase),
      ...plan.derivations.map((entry) => entry.selectedCase)];
    if (references.some((item) => computeCaseId(item.caseKey) !== item.caseId)) issue('Plan source references must preserve canonical Case identity.');
  });
export type NormalizedSelection = z.infer<typeof NormalizedSelection>;

/**
 * A Run is one execution of a normalized Selection. It never represents
 * the Bundle's current state by itself (pb-v2-spec.md "核心对象与关系").
 */
export const Run = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    runId: RunId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    selection: NormalizedSelection,
    inputVersion: z.string().min(1),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    terminationReason: RunTerminationReason,
    attempts: z.array(CaseAttempt),
    coverage: CoverageSummary,
  })
  .strict()
  .superRefine((run, ctx) => {
    if (run.selection.capturePlan && run.selection.capturePlan.inputVersion !== run.inputVersion) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Capture plan inputVersion must match its source Run.', path: ['selection', 'capturePlan', 'inputVersion'] });
    }
    const selectedIds = new Set(run.selection.cases.map((c) => c.caseId));
    run.attempts.forEach((attempt, index) => {
      if (attempt.runId !== run.runId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `attempt[${index}].runId does not match Run.runId`, path: ['attempts', index, 'runId'] });
      }
      if (!selectedIds.has(attempt.caseId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `attempt[${index}].caseId is not part of the Run's selection`, path: ['attempts', index, 'caseId'] });
      }
    });
  });
export type Run = z.infer<typeof Run>;
