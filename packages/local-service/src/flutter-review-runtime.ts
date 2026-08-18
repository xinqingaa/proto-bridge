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
  runtimeErrors: unknown;
};

export type FlutterRuntimeScenarioResult = {
  providerSession: ReviewProviderSessionReceipt;
  failures: ReviewProviderFailure[];
  transition: TargetScenarioTransition;
  runtimeReceipt: ReviewRuntimeOperationReceipt;
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
    const prepared = await this.provider.invokeServiceExtension('wait', contract.runtime.prepareServiceExtension, {
      caseId: input.caseId,
      screenId: selected.screenId,
      ...(selected.route ? { route: selected.route } : {}),
      ...(selected.fixture ? { fixture: selected.fixture } : {}),
      ...(selected.variantId ? { variantId: selected.variantId } : {}),
      ...(selected.stateSeed !== undefined ? { stateSeed: selected.stateSeed } : {}),
    });
    failures.push(...prepared.failures);
    const inspected = await this.provider.callForApp('inspect', 'widget_inspector', { command: 'get_widget_tree', summaryOnly: false });
    failures.push(...inspected.failures);
    const screenshot = await this.provider.callForApp('screenshot', 'flutter_driver_command', {
      command: 'screenshot',
      timeout: String(contract.runtime.settleTimeoutMs ?? 5_000),
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
      runtimeReceipt: operationReceipt(screenshot, connected.application, connected.providerSession, 'screenshot', 'flutter_driver_command:screenshot', targetDigest),
      runtimeErrors: runtimeErrors.value,
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
    const prepared = await this.provider.invokeServiceExtension('wait', contract.runtime.prepareServiceExtension, {
      caseId: input.caseId,
      screenId: selectedCase.screenId,
      scenarioId: scenario.scenarioId,
      ...(selectedCase.route ? { route: selectedCase.route } : {}),
      ...(selectedCase.fixture ? { fixture: selectedCase.fixture } : {}),
      ...(selectedCase.variantId ? { variantId: selectedCase.variantId } : {}),
      ...(selectedCase.stateSeed !== undefined ? { stateSeed: selectedCase.stateSeed } : {}),
    });
    failures.push(...prepared.failures);
    const pre = await this.observe(contract, input.caseId);
    failures.push(...pre.failures);
    const actions: TargetScenarioAction[] = [];
    const operationDigests: string[] = [];
    let maximumAttempt: 1 | 2 | 3 = 1;
    for (const action of scenario.actions) {
      const inspected = await this.provider.callForApp('inspect', 'widget_inspector', { command: 'get_widget_tree', summaryOnly: false });
      failures.push(...inspected.failures);
      const performed = await this.performAction(action, contract.runtime.settleTimeoutMs ?? 5_000);
      failures.push(...performed.failures);
      maximumAttempt = Math.max(maximumAttempt, performed.attemptOrdinal) as 1 | 2 | 3;
      operationDigests.push(digest(JSON.stringify(performed.value)));
      actions.push(logicalAction(action));
    }
    const post = await this.observe(contract, input.caseId);
    failures.push(...post.failures);
    const runtimeErrors = await this.provider.callForApp('runtime-errors', 'get_runtime_errors', { clearRuntimeErrors: false });
    failures.push(...runtimeErrors.failures);
    const transition: TargetScenarioTransition = {
      caseId: input.caseId,
      screenId: scenario.screenId,
      scenarioId: scenario.scenarioId,
      checkpointId: scenario.checkpointId,
      preState: pre.value,
      actions,
      postState: post.value,
      visibleResult: {
        visibleRegionIds: [...post.value.visibleRegionIds],
        changedRegionIds: changedRegions(pre.value, post.value),
      },
    };
    const resultDigest = digest(JSON.stringify({ transition, operationDigests }));
    return {
      providerSession: connected.providerSession,
      failures,
      transition,
      runtimeReceipt: {
        receiptVersion: 1,
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
        capability: 'flutter_driver_command:scenario',
        resultDigest,
      },
      runtimeErrors: runtimeErrors.value,
    };
  }

  private async connect(session: ReviewSession, contract: FlutterContract): Promise<{
    providerSession: ReviewProviderSessionReceipt;
    application: ReviewApplicationReceipt;
    failures: ReviewProviderFailure[];
  }> {
    const attached = await this.provider.attach(session.targetRoot, contract.runtime.applicationIdentity);
    const identity = await this.provider.probeApplicationIdentity(contract.runtime.identityServiceExtension);
    const application = identity.value;
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

  private async observe(contract: FlutterContract, caseId: string): Promise<FlutterMcpOperationResult<TargetStateSnapshot>> {
    const observed = await this.provider.invokeServiceExtension('inspect', contract.runtime.observeServiceExtension, { caseId });
    return { ...observed, value: parseStateSnapshot(observed.value, caseId) };
  }

  private performAction(action: FlutterScenario['actions'][number], timeoutMs: number): Promise<FlutterMcpOperationResult<unknown>> {
    const finder = driverFinder(action.finder);
    if (action.kind === 'tap') return this.provider.callForApp('tap', 'flutter_driver_command', { command: 'tap', ...finder, timeout: String(timeoutMs) });
    if (action.kind === 'enter-text') return this.performTextEntry(action, finder, timeoutMs);
    if (action.kind === 'scroll') return this.provider.callForApp('scroll', 'flutter_driver_command', {
      command: 'scroll', ...finder, dx: String(action.dx), dy: String(action.dy),
      duration: String(action.durationMicros), frequency: String(action.frequency), timeout: String(timeoutMs),
    });
    if (action.kind === 'scroll-into-view') return this.provider.callForApp('scroll', 'flutter_driver_command', { command: 'scrollIntoView', ...finder, alignment: String(action.alignment), timeout: String(timeoutMs) });
    return this.provider.callForApp('wait', 'flutter_driver_command', { command: 'waitFor', ...finder, timeout: String(timeoutMs) });
  }

  private async performTextEntry(action: Extract<FlutterScenario['actions'][number], { kind: 'enter-text' }>, finder: Record<string, string>, timeoutMs: number): Promise<FlutterMcpOperationResult<unknown>> {
    const tapped = await this.provider.callForApp('tap', 'flutter_driver_command', { command: 'tap', ...finder, timeout: String(timeoutMs) });
    const entered = await this.provider.callForApp('input', 'flutter_driver_command', { command: 'enter_text', text: action.text, timeout: String(timeoutMs) });
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
): ReviewRuntimeOperationReceipt {
  return {
    receiptVersion: 1,
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

function parseStateSnapshot(value: unknown, caseId: string): TargetStateSnapshot {
  const candidate = findObject(value, (item) => item.caseId === caseId && item.shell !== undefined);
  const shell = candidate && object(candidate.shell);
  if (!candidate || !shell || typeof shell.screenId !== 'string' || typeof shell.variantId !== 'string') throw new FlutterMcpProviderError('runtime-observation-invalid', 'Flutter Runtime observer returned an invalid State snapshot.', false);
  const visibleRegionIds = stringArray(candidate.visibleRegionIds);
  const unknownKeys = stringArray(candidate.unknownKeys);
  if (!visibleRegionIds || !unknownKeys || typeof candidate.complete !== 'boolean' || !Array.isArray(candidate.keyedCollections) || !Array.isArray(candidate.values)) throw new FlutterMcpProviderError('runtime-observation-invalid', 'Flutter Runtime observer returned an incomplete State snapshot.', false);
  return candidate as unknown as TargetStateSnapshot;
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
