/**
 * @experimental Runtime orchestration retained for isolated tests and future
 * Flutter MCP evaluation; it is not part of the default Consumer contract.
 */
import { createHash, randomUUID } from 'node:crypto';
import type {
  ReviewApplicationReceipt,
  ReviewArtifact,
  ReviewProviderFailure,
  ReviewProviderSessionReceipt,
  ReviewRuntimeOperationReceipt,
  ReviewSession,
  TargetScenarioAction,
  TargetScenarioTransition,
  TargetStateSnapshot,
} from '@proto-bridge/core/review';
import type { StructureIR } from '@proto-bridge/core/v2';
import { readFlutterReviewContract } from '@proto-bridge/core/target';
import {
  FlutterMcpProvider,
  FlutterMcpProviderError,
  type FlutterMcpOperationResult,
} from './flutter-mcp-provider.js';

type FlutterContract = Awaited<ReturnType<typeof readFlutterReviewContract>>;
type FlutterScenario = NonNullable<FlutterContract['scenarios']>[string];

export type FlutterRuntimeRenderResult = {
  providerSession: ReviewProviderSessionReceipt;
  failures: ReviewProviderFailure[];
  artifact: ReviewArtifact;
  bytes: Uint8Array;
  runtimeReceipt: ReviewRuntimeOperationReceipt;
  runtimeErrorReceipts: ReviewRuntimeOperationReceipt[];
  runtimeErrors: unknown;
  structureObservation: StructureIR;
  stateObservation: TargetStateSnapshot;
};

export type FlutterRuntimeScenarioResult = {
  providerSession: ReviewProviderSessionReceipt;
  failures: ReviewProviderFailure[];
  transition: TargetScenarioTransition;
  runtimeReceipt: ReviewRuntimeOperationReceipt;
  runtimeErrorReceipts: ReviewRuntimeOperationReceipt[];
  runtimeErrors: unknown;
};

export class FlutterReviewRuntime {
  constructor(private readonly provider: FlutterMcpProvider, private readonly now: () => Date = () => new Date()) {}

  async render(session: ReviewSession, input: { caseId: string; attemptId: string }): Promise<FlutterRuntimeRenderResult> {
    const contract = await readFlutterReviewContract(session.targetRoot);
    const selected = contract.cases[input.caseId];
    if (!selected) throw new FlutterMcpProviderError('case-not-declared', `Flutter MCP Review contract has no Case ${input.caseId}.`, false);
    const connected = await this.connect(session, contract);
    const failures = [...connected.failures];
    const cleared = await this.provider.callForApp('runtime-errors', 'get_runtime_errors', { clearRuntimeErrors: true });
    failures.push(...cleared.failures);
    const prepared = await this.prepare(contract, input.caseId);
    failures.push(...prepared.failures);
    const inspected = await this.provider.callForApp('inspect', 'get_widget_tree', { summaryOnly: false });
    failures.push(...inspected.failures);
    const observed = await this.observe(contract, input.caseId, true);
    failures.push(...observed.failures);
    const screenshot = await this.provider.callForApp('screenshot', 'flutter_driver', {
      command: 'screenshot',
      timeout: contract.runtime.settleTimeoutMs ?? 5_000,
    });
    failures.push(...screenshot.failures);
    const bytes = extractImage(screenshot.value);
    const dimensions = pngDimensions(bytes);
    const targetDigest = digest(bytes);
    const runtimeErrors = await this.provider.callForApp('runtime-errors', 'get_runtime_errors', { clearRuntimeErrors: false });
    failures.push(...runtimeErrors.failures);
    return {
      providerSession: connected.providerSession,
      failures,
      artifact: {
        kind: 'target', digest: targetDigest, mimeType: 'image/png', byteLength: bytes.byteLength,
        width: dimensions.width, height: dimensions.height,
        environment: artifactEnvironment(connected.application, connected.providerSession),
        owner: { screenId: selected.screenId, caseId: input.caseId, attemptId: input.attemptId },
      },
      bytes,
      runtimeReceipt: operationReceipt(screenshot, connected.application, connected.providerSession, 'screenshot', 'flutter_driver:screenshot', targetDigest, {
        session, caseId: input.caseId, screenId: selected.screenId,
      }),
      runtimeErrorReceipts: [
        operationReceipt(cleared, connected.application, connected.providerSession, 'runtime-errors', 'get_runtime_errors:before', digest(JSON.stringify(cleared.value)), {
          session, caseId: input.caseId, screenId: selected.screenId,
        }),
        operationReceipt(runtimeErrors, connected.application, connected.providerSession, 'runtime-errors', 'get_runtime_errors:after', digest(JSON.stringify(runtimeErrors.value)), {
          session, caseId: input.caseId, screenId: selected.screenId,
        }),
      ],
      runtimeErrors: runtimeErrors.value,
      structureObservation: observed.value.structure,
      stateObservation: observed.value.state,
    };
  }

  async replay(session: ReviewSession, input: { caseId: string }): Promise<FlutterRuntimeScenarioResult> {
    const startedAt = this.now().toISOString();
    const contract = await readFlutterReviewContract(session.targetRoot);
    const selectedCase = contract.cases[input.caseId];
    const scenario = contract.scenarios?.[input.caseId];
    if (!selectedCase || !scenario) throw new FlutterMcpProviderError('scenario-not-declared', `Flutter MCP Review contract has no Scenario Case ${input.caseId}.`, false);
    const connected = await this.connect(session, contract);
    const failures = [...connected.failures];
    const cleared = await this.provider.callForApp('runtime-errors', 'get_runtime_errors', { clearRuntimeErrors: true });
    failures.push(...cleared.failures);
    const prepared = await this.prepare(contract, input.caseId);
    failures.push(...prepared.failures);
    const pre = await this.observe(contract, input.caseId, false);
    failures.push(...pre.failures);
    const actions: TargetScenarioAction[] = [];
    const operationDigests: string[] = [];
    let maximumAttempt: 1 | 2 | 3 = 1;
    for (const action of scenario.actions) {
      const inspected = await this.provider.callForApp('inspect', 'get_widget_tree', { summaryOnly: false });
      failures.push(...inspected.failures);
      const performed = await this.performAction(action, contract.runtime.settleTimeoutMs ?? 5_000);
      failures.push(...performed.failures);
      maximumAttempt = Math.max(maximumAttempt, performed.attemptOrdinal) as 1 | 2 | 3;
      operationDigests.push(digest(JSON.stringify(performed.value)));
      actions.push(logicalAction(action));
    }
    const post = await this.observe(contract, input.caseId, false);
    failures.push(...post.failures);
    const runtimeErrors = await this.provider.callForApp('runtime-errors', 'get_runtime_errors', { clearRuntimeErrors: false });
    failures.push(...runtimeErrors.failures);
    const transition: TargetScenarioTransition = {
      caseId: input.caseId,
      screenId: scenario.screenId,
      scenarioId: scenario.scenarioId,
      checkpointId: scenario.checkpointId,
      preState: pre.value.state,
      actions,
      postState: post.value.state,
      visibleResult: {
        visibleRegionIds: [...post.value.state.visibleRegionIds],
        changedRegionIds: changedRegions(pre.value.state, post.value.state),
      },
    };
    const resultDigest = digest(JSON.stringify({ transition, operationDigests }));
    return {
      providerSession: connected.providerSession,
      failures,
      transition,
      runtimeReceipt: {
        receiptVersion: 1,
        reviewRunId: session.reviewRunId,
        coverageProfile: session.reviewProfile.coverageProfile,
        caseId: input.caseId,
        screenId: scenario.screenId,
        scenarioId: scenario.scenarioId,
        checkpointId: scenario.checkpointId,
        operationId: `flutter-mcp-scenario-${randomUUID()}`,
        operation: 'scenario',
        providerId: connected.providerSession.providerId,
        providerFingerprint: connected.providerSession.providerFingerprint,
        sessionIdentityDigest: connected.providerSession.sessionIdentityDigest,
        applicationIdentity: connected.application.applicationIdentity,
        appBuildDigest: connected.application.appBuildDigest,
        targetCommit: connected.application.targetCommit,
        targetContentDigest: connected.application.targetContentDigest,
        attemptOrdinal: maximumAttempt,
        startedAt,
        finishedAt: this.now().toISOString(),
        capability: 'flutter_driver:scenario',
        resultDigest,
      },
      runtimeErrorReceipts: [
        operationReceipt(cleared, connected.application, connected.providerSession, 'runtime-errors', 'get_runtime_errors:before', digest(JSON.stringify(cleared.value)), {
          session, caseId: input.caseId, screenId: scenario.screenId, scenarioId: scenario.scenarioId, checkpointId: scenario.checkpointId,
        }),
        operationReceipt(runtimeErrors, connected.application, connected.providerSession, 'runtime-errors', 'get_runtime_errors:after', digest(JSON.stringify(runtimeErrors.value)), {
          session, caseId: input.caseId, screenId: scenario.screenId, scenarioId: scenario.scenarioId, checkpointId: scenario.checkpointId,
        }),
      ],
      runtimeErrors: runtimeErrors.value,
    };
  }

  private async connect(session: ReviewSession, contract: FlutterContract): Promise<{
    providerSession: ReviewProviderSessionReceipt;
    application: ReviewApplicationReceipt;
    failures: ReviewProviderFailure[];
  }> {
    const attached = await this.provider.attach(session.targetRoot);
    const identity = await this.provider.callForApp('inspect', 'flutter_driver', {
      command: 'get_text',
      ...driverFinder(contract.runtime.bridge.identityFinder),
      timeout: contract.runtime.settleTimeoutMs ?? 5_000,
    });
    const application = parseApplicationReceipt(identity.value);
    if (
      application.applicationIdentity !== contract.runtime.applicationIdentity
      || application.targetCommit !== session.targetBaselineCommit
      || (session.targetContentDigest !== undefined && application.targetContentDigest !== session.targetContentDigest)
      || application.reviewHarnessVersion !== contract.runtime.reviewHarnessVersion
      || application.textEntryEmulation !== contract.runtime.textEntryEmulation
    ) throw new FlutterMcpProviderError('app-build-identity-mismatch', 'Running Flutter App identity does not match the fixed Target Review contract.', false, [...attached.failures, ...identity.failures]);
    return {
      application,
      failures: [...attached.failures, ...identity.failures],
      providerSession: { ...attached.value.handshake, receiptVersion: 1, application },
    };
  }

  private async observe(
    contract: FlutterContract,
    caseId: string,
    requireStructure: boolean,
  ): Promise<FlutterMcpOperationResult<{ state: TargetStateSnapshot; structure: StructureIR }>> {
    const observed = await this.provider.callForApp('inspect', 'flutter_driver', {
      command: 'get_text',
      ...driverFinder(contract.runtime.bridge.observationFinder),
      timeout: contract.runtime.settleTimeoutMs ?? 5_000,
    });
    const state = parseStateSnapshot(observed.value, caseId);
    const structure = parseStructureObservation(observed.value, caseId);
    if (requireStructure && !structure) throw new FlutterMcpProviderError('runtime-observation-invalid', 'Flutter Runtime observer did not return a complete Structure observation.', false);
    return { ...observed, value: { state, structure: structure ?? emptyStructure(caseId) } };
  }

  private async prepare(contract: FlutterContract, caseId: string): Promise<FlutterMcpOperationResult<unknown>> {
    const timeout = contract.runtime.settleTimeoutMs ?? 5_000;
    const control = await this.provider.callForApp('tap', 'flutter_driver', {
      command: 'tap', ...driverFinder(contract.runtime.bridge.controlFinder), timeout,
    });
    const tapped = await this.provider.callForApp('tap', 'flutter_driver', {
      command: 'tap', ...driverFinder(contract.runtime.bridge.caseInputFinder), timeout,
    });
    const entered = await this.provider.callForApp('input', 'flutter_driver', {
      command: 'enter_text', text: caseId, timeout,
    });
    const prepared = await this.provider.callForApp('tap', 'flutter_driver', {
      command: 'tap', ...driverFinder(contract.runtime.bridge.prepareFinder), timeout,
    });
    const ready = await this.provider.callForApp('wait', 'flutter_driver', {
      command: 'waitFor', ...driverFinder(contract.runtime.bridge.readyFinder), timeout,
    });
    return {
      ...ready,
      attemptOrdinal: Math.max(control.attemptOrdinal, tapped.attemptOrdinal, entered.attemptOrdinal, prepared.attemptOrdinal, ready.attemptOrdinal) as 1 | 2 | 3,
      startedAt: control.startedAt,
      failures: [...control.failures, ...tapped.failures, ...entered.failures, ...prepared.failures, ...ready.failures],
    };
  }

  private performAction(action: FlutterScenario['actions'][number], timeoutMs: number): Promise<FlutterMcpOperationResult<unknown>> {
    const finder = driverFinder(action.finder);
    if (action.kind === 'tap') return this.provider.callForApp('tap', 'flutter_driver', { command: 'tap', ...finder, timeout: timeoutMs });
    if (action.kind === 'enter-text') return this.performTextEntry(action, finder, timeoutMs);
    if (action.kind === 'scroll') return this.provider.callForApp('scroll', 'flutter_driver', {
      command: 'scroll', ...finder, dx: String(action.dx), dy: String(action.dy),
      duration: String(action.durationMicros), frequency: String(action.frequency), timeout: timeoutMs,
    });
    if (action.kind === 'scroll-into-view') return this.provider.callForApp('scroll', 'flutter_driver', { command: 'scrollIntoView', ...finder, alignment: String(action.alignment), timeout: timeoutMs });
    return this.provider.callForApp('wait', 'flutter_driver', { command: 'waitFor', ...finder, timeout: timeoutMs });
  }

  private async performTextEntry(action: Extract<FlutterScenario['actions'][number], { kind: 'enter-text' }>, finder: Record<string, string>, timeoutMs: number): Promise<FlutterMcpOperationResult<unknown>> {
    const tapped = await this.provider.callForApp('tap', 'flutter_driver', { command: 'tap', ...finder, timeout: timeoutMs });
    const entered = await this.provider.callForApp('input', 'flutter_driver', { command: 'enter_text', text: action.text, timeout: timeoutMs });
    return {
      ...entered,
      attemptOrdinal: Math.max(tapped.attemptOrdinal, entered.attemptOrdinal) as 1 | 2 | 3,
      startedAt: tapped.startedAt,
      value: { tapped: tapped.value, entered: entered.value },
      failures: [...tapped.failures, ...entered.failures],
    };
  }
}

export function runtimeErrorsDetected(value: unknown): boolean {
  const text = collectStrings(value).join(' ').trim();
  if (!text || /no (?:recent )?runtime errors/i.test(text)) return false;
  return /error|exception|stack trace/i.test(text) || extractArrays(value).some((item) => item.length > 0);
}

function operationReceipt(
  operation: FlutterMcpOperationResult<unknown>,
  application: ReviewApplicationReceipt,
  provider: ReviewProviderSessionReceipt,
  kind: ReviewRuntimeOperationReceipt['operation'],
  capability: string,
  resultDigest: string,
  binding: {
    session: ReviewSession;
    caseId: string;
    screenId: string;
    scenarioId?: string;
    checkpointId?: string;
  },
): ReviewRuntimeOperationReceipt {
  return {
    receiptVersion: 1,
    reviewRunId: binding.session.reviewRunId,
    coverageProfile: binding.session.reviewProfile.coverageProfile,
    caseId: binding.caseId,
    screenId: binding.screenId,
    ...(binding.scenarioId ? { scenarioId: binding.scenarioId } : {}),
    ...(binding.checkpointId ? { checkpointId: binding.checkpointId } : {}),
    operationId: operation.operationId,
    operation: kind,
    providerId: provider.providerId,
    providerFingerprint: provider.providerFingerprint,
    sessionIdentityDigest: provider.sessionIdentityDigest,
    applicationIdentity: application.applicationIdentity,
    appBuildDigest: application.appBuildDigest,
    targetCommit: application.targetCommit,
    targetContentDigest: application.targetContentDigest,
    attemptOrdinal: operation.attemptOrdinal,
    startedAt: operation.startedAt,
    finishedAt: operation.finishedAt,
    capability,
    resultDigest,
  };
}

function driverFinder(finder: FlutterScenario['actions'][number]['finder']): Record<string, string> {
  if (finder.kind === 'value-key') return { finderType: 'ByValueKey', keyValueString: finder.value, keyValueType: 'String' };
  if (finder.kind === 'semantics-label') return { finderType: 'BySemanticsLabel', label: finder.value, isRegExp: String(finder.isRegExp ?? false) };
  if (finder.kind === 'text') return { finderType: 'ByText', text: finder.value };
  if (finder.kind === 'tooltip') return { finderType: 'ByTooltipMessage', text: finder.value };
  return { finderType: 'ByType', type: finder.value };
}

function logicalAction(action: FlutterScenario['actions'][number]): TargetScenarioAction {
  if (action.kind === 'tap') return { actionId: action.actionId, kind: 'click', targetRegionId: action.targetRegionId };
  if (action.kind === 'enter-text') return { actionId: action.actionId, kind: 'input', targetRegionId: action.targetRegionId, input: action.text };
  if (action.kind === 'wait-for') return { actionId: action.actionId, kind: 'wait', targetRegionId: action.targetRegionId };
  return { actionId: action.actionId, kind: 'scroll', targetRegionId: action.targetRegionId };
}

function parseApplicationReceipt(value: unknown): ReviewApplicationReceipt {
  const candidate = findObject(value, (item) => [
    'applicationIdentity', 'targetCommit', 'targetContentDigest', 'appBuildDigest', 'reviewHarnessVersion', 'platform',
  ].every((key) => typeof item[key] === 'string' && item[key]));
  if (!candidate) throw new FlutterMcpProviderError('app-identity-incomplete', 'Flutter Review Bridge returned an incomplete application identity.', false);
  const size = (key: string): { width: number; height: number } | undefined => {
    const item = object(candidate[key]);
    return item && typeof item.width === 'number' && typeof item.height === 'number'
      ? { width: item.width, height: item.height }
      : undefined;
  };
  const optionalString = (key: string) => typeof candidate[key] === 'string' ? candidate[key] as string : undefined;
  const optionalNumber = (key: string) => typeof candidate[key] === 'number' ? candidate[key] as number : undefined;
  return {
    applicationIdentity: candidate.applicationIdentity as string,
    targetCommit: candidate.targetCommit as string,
    targetContentDigest: candidate.targetContentDigest as string,
    appBuildDigest: candidate.appBuildDigest as string,
    reviewHarnessVersion: candidate.reviewHarnessVersion as string,
    platform: candidate.platform as string,
    ...(optionalString('runtimeOrOsVersion') ? { runtimeOrOsVersion: optionalString('runtimeOrOsVersion')! } : {}),
    ...(size('logicalSize') ? { logicalSize: size('logicalSize')! } : {}),
    ...(size('pixelSize') ? { pixelSize: size('pixelSize')! } : {}),
    ...(optionalNumber('dpr') !== undefined ? { dpr: optionalNumber('dpr')! } : {}),
    ...(optionalString('orientation') ? { orientation: optionalString('orientation')! } : {}),
    ...(optionalString('locale') ? { locale: optionalString('locale')! } : {}),
    ...(optionalString('theme') ? { theme: optionalString('theme')! } : {}),
    ...(optionalNumber('textScale') !== undefined ? { textScale: optionalNumber('textScale')! } : {}),
    ...(optionalString('safeArea') ? { safeArea: optionalString('safeArea')! } : {}),
    ...(optionalString('fontEnvironment') ? { fontEnvironment: optionalString('fontEnvironment')! } : {}),
    ...(typeof candidate.textEntryEmulation === 'boolean' ? { textEntryEmulation: candidate.textEntryEmulation } : {}),
    ...(optionalString('settlePolicy') ? { settlePolicy: optionalString('settlePolicy')! } : {}),
    ...(optionalString('systemChromePolicy') ? { systemChromePolicy: optionalString('systemChromePolicy')! } : {}),
  };
}

function parseStateSnapshot(value: unknown, caseId: string): TargetStateSnapshot {
  const candidate = findObject(value, (item) => item.caseId === caseId && item.shell !== undefined);
  const shell = candidate && object(candidate.shell);
  if (!candidate || !shell || typeof shell.screenId !== 'string' || typeof shell.variantId !== 'string') throw new FlutterMcpProviderError('runtime-observation-invalid', 'Flutter Runtime observer returned an invalid State snapshot.', false);
  const visibleRegionIds = stringArray(candidate.visibleRegionIds);
  const unknownKeys = stringArray(candidate.unknownKeys);
  if (!visibleRegionIds || !unknownKeys || typeof candidate.complete !== 'boolean' || !Array.isArray(candidate.keyedCollections) || !Array.isArray(candidate.values)) throw new FlutterMcpProviderError('runtime-observation-invalid', 'Flutter Runtime observer returned an incomplete State snapshot.', false);
  return candidate as unknown as TargetStateSnapshot;
}

function parseStructureObservation(value: unknown, caseId: string): StructureIR | undefined {
  const candidate = findObject(value, (item) => item.caseId === caseId && Array.isArray(item.regions) && Array.isArray(item.rootRegionIds));
  if (
    !candidate
    || !Array.isArray(candidate.siblingGroups)
    || !Array.isArray(candidate.siblingRelations)
    || !Array.isArray(candidate.scrollContainers)
    || typeof candidate.complete !== 'boolean'
    || !Array.isArray(candidate.unknownRegionIds)
  ) return undefined;
  return candidate as unknown as StructureIR;
}

function emptyStructure(caseId: string): StructureIR {
  return {
    caseId, regions: [], rootRegionIds: [], siblingGroups: [], siblingRelations: [], scrollContainers: [],
    complete: false, unknownRegionIds: ['<not-requested>'],
  };
}

function changedRegions(before: TargetStateSnapshot, after: TargetStateSnapshot): string[] {
  const changed = new Set<string>();
  const beforeVisible = new Set(before.visibleRegionIds);
  for (const item of new Set([...before.visibleRegionIds, ...after.visibleRegionIds])) if (beforeVisible.has(item) !== after.visibleRegionIds.includes(item)) changed.add(item);
  const beforeValues = new Map(before.values.map((item) => [`${item.regionId}\0${item.key}`, item.value]));
  for (const item of after.values) if (beforeValues.get(`${item.regionId}\0${item.key}`) !== item.value) changed.add(item.regionId);
  return [...changed].sort();
}

function extractImage(value: unknown): Uint8Array {
  const candidate = findObject(value, (item) => item.type === 'image' && typeof item.data === 'string');
  if (!candidate || candidate.mimeType !== 'image/png') throw new FlutterMcpProviderError('screenshot-missing', 'Flutter MCP screenshot response did not contain a PNG image.', false);
  const bytes = Buffer.from(candidate.data as string, 'base64');
  if (bytes.byteLength === 0) throw new FlutterMcpProviderError('screenshot-missing', 'Flutter MCP screenshot PNG is empty.', false);
  return bytes;
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const buffer = Buffer.from(bytes);
  if (buffer.byteLength < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new FlutterMcpProviderError('screenshot-invalid', 'Flutter MCP screenshot is not a valid PNG.', false);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function artifactEnvironment(application: ReviewApplicationReceipt, provider: ReviewProviderSessionReceipt): Record<string, string | number | boolean> {
  return {
    platform: application.platform,
    targetCommit: application.targetCommit,
    targetContentDigest: application.targetContentDigest,
    appBuildDigest: application.appBuildDigest,
    applicationIdentity: application.applicationIdentity,
    reviewHarnessVersion: application.reviewHarnessVersion,
    providerFingerprint: provider.providerFingerprint,
    sessionIdentityDigest: provider.sessionIdentityDigest,
    ...(application.runtimeOrOsVersion ? { runtimeOrOsVersion: application.runtimeOrOsVersion } : {}),
    ...(application.dpr !== undefined ? { dpr: application.dpr } : {}),
    ...(application.orientation ? { orientation: application.orientation } : {}),
    ...(application.locale ? { locale: application.locale } : {}),
    ...(application.theme ? { theme: application.theme } : {}),
    ...(application.textScale !== undefined ? { textScale: application.textScale } : {}),
    ...(application.textEntryEmulation !== undefined ? { textEntryEmulation: application.textEntryEmulation } : {}),
  };
}

function findObject(value: unknown, predicate: (item: Record<string, unknown>) => boolean): Record<string, unknown> | undefined {
  const visited = new Set<object>();
  const visit = (item: unknown): Record<string, unknown> | undefined => {
    if (typeof item === 'string') { try { return visit(JSON.parse(item) as unknown); } catch { return undefined; } }
    if (!item || typeof item !== 'object' || visited.has(item)) return undefined;
    visited.add(item);
    if (Array.isArray(item)) {
      for (const entry of item) { const found = visit(entry); if (found) return found; }
      return undefined;
    }
    const record = item as Record<string, unknown>;
    if (predicate(record)) return record;
    for (const entry of Object.values(record)) { const found = visit(entry); if (found) return found; }
    return undefined;
  };
  return visit(value);
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  return value && typeof value === 'object' ? Object.values(value as Record<string, unknown>).flatMap(collectStrings) : [];
}

function extractArrays(value: unknown): unknown[][] {
  if (Array.isArray(value)) return [value, ...value.flatMap(extractArrays)];
  return value && typeof value === 'object' ? Object.values(value as Record<string, unknown>).flatMap(extractArrays) : [];
}

function digest(value: Uint8Array | string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
