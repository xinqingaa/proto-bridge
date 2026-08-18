import { createHash, randomUUID } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import type {
  ReviewApplicationReceipt,
  ReviewProviderCapabilities,
  ReviewProviderFailure,
  ReviewRuntimeOperation,
} from '@proto-bridge/core/review';

export const FLUTTER_MCP_PROVIDER_ID = 'dart-flutter-mcp' as const;
const DEFAULT_PROTOCOL_VERSION = '2025-06-18';
const FORBIDDEN_LIFECYCLE_TOOLS = new Set(['launch_app', 'list_devices', 'list_running_apps', 'stop_app', 'get_app_logs']);

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type McpInitializeResult = {
  protocolVersion: string;
  serverInfo: { name: string; version: string };
  capabilities?: Record<string, unknown>;
};

export interface FlutterMcpTransport {
  initialize(input: { protocolVersion: string; clientName: string; clientVersion: string }): Promise<McpInitializeResult>;
  listTools(): Promise<McpToolDefinition[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

export type FlutterMcpCapabilityHandshake = {
  providerId: typeof FLUTTER_MCP_PROVIDER_ID;
  providerVersion: string;
  protocolVersion: string;
  serverCommandDigest: string;
  availableTools: string[];
  capabilities: ReviewProviderCapabilities;
  unsupportedReasons: string[];
  providerFingerprint: string;
  sessionIdentityDigest: string;
  sessionStartedAt: string;
};

export type FlutterMcpAttachResult = {
  handshake: FlutterMcpCapabilityHandshake;
  dtdSelectionDigest: string;
  applicationSelectionDigest: string;
};

export type FlutterMcpOperationResult<T> = {
  operationId: string;
  attemptOrdinal: 1 | 2 | 3;
  startedAt: string;
  finishedAt: string;
  value: T;
  failures: ReviewProviderFailure[];
};

export class FlutterMcpProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly failures: ReviewProviderFailure[] = [],
  ) {
    super(message);
    this.name = 'FlutterMcpProviderError';
  }
}

export type FlutterMcpProviderOptions = {
  command?: string;
  args?: string[];
  protocolVersion?: string;
  requestTimeoutMs?: number;
  retryDelayMs?: number;
  transportFactory?: (input: { command: string; args: string[]; cwd: string; requestTimeoutMs: number }) => FlutterMcpTransport;
  now?: () => Date;
};

export class FlutterMcpProvider {
  private readonly command: string;
  private readonly args: string[];
  private readonly protocolVersion: string;
  private readonly requestTimeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly transportFactory: NonNullable<FlutterMcpProviderOptions['transportFactory']>;
  private readonly now: () => Date;
  private transport: FlutterMcpTransport | undefined;
  private targetRoot: string | undefined;
  private handshake: FlutterMcpCapabilityHandshake | undefined;
  private tools = new Map<string, McpToolDefinition>();
  private attached: FlutterMcpAttachResult | undefined;
  private appUri: string | undefined;

  constructor(options: FlutterMcpProviderOptions = {}) {
    this.command = options.command ?? 'dart';
    this.args = options.args ?? ['mcp-server'];
    this.protocolVersion = options.protocolVersion ?? DEFAULT_PROTOCOL_VERSION;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.retryDelayMs = options.retryDelayMs ?? 150;
    this.transportFactory = options.transportFactory ?? ((input) => new StdioFlutterMcpTransport(input));
    this.now = options.now ?? (() => new Date());
  }

  async ensureSession(targetRoot: string): Promise<FlutterMcpCapabilityHandshake> {
    const resolvedRoot = path.resolve(targetRoot);
    if (this.handshake && this.targetRoot === resolvedRoot) return this.handshake;
    await this.invalidate();
    const transport = this.transportFactory({ command: this.command, args: [...this.args], cwd: resolvedRoot, requestTimeoutMs: this.requestTimeoutMs });
    try {
      const initialized = await transport.initialize({
        protocolVersion: this.protocolVersion,
        clientName: 'proto-bridge-local-service',
        clientVersion: '1',
      });
      const listed = await transport.listTools();
      const tools = new Map(listed.map((item) => [item.name, item]));
      const availableTools = [...tools.keys()].sort();
      const capabilities = capabilityInventory(tools);
      const unsupportedReasons = requiredCapabilityFailures(capabilities);
      const serverCommandDigest = digest(JSON.stringify([this.command, ...this.args]));
      const providerFingerprint = digest(JSON.stringify({
        providerId: FLUTTER_MCP_PROVIDER_ID,
        providerVersion: initialized.serverInfo.version,
        protocolVersion: initialized.protocolVersion,
        availableTools,
      }));
      const sessionStartedAt = this.now().toISOString();
      const sessionIdentityDigest = digest(JSON.stringify({ providerFingerprint, targetRoot: resolvedRoot, sessionStartedAt, nonce: randomUUID() }));
      this.transport = transport;
      this.targetRoot = resolvedRoot;
      this.tools = tools;
      this.handshake = {
        providerId: FLUTTER_MCP_PROVIDER_ID,
        providerVersion: initialized.serverInfo.version,
        protocolVersion: initialized.protocolVersion,
        serverCommandDigest,
        availableTools,
        capabilities,
        unsupportedReasons,
        providerFingerprint,
        sessionIdentityDigest,
        sessionStartedAt,
      };
      return this.handshake;
    } catch (error) {
      await transport.close().catch(() => undefined);
      throw classifyProviderError(error, 'mcp-initialize-failed');
    }
  }

  async attach(targetRoot: string, expectedApplicationIdentity?: string): Promise<FlutterMcpOperationResult<FlutterMcpAttachResult>> {
    if (this.attached && this.targetRoot === path.resolve(targetRoot) && this.appUri) {
      const at = this.now().toISOString();
      return { operationId: `flutter-mcp-${randomUUID()}`, attemptOrdinal: 1, startedAt: at, finishedAt: at, value: this.attached, failures: [] };
    }
    return this.runWithRetry('connect', async () => {
      const handshake = await this.ensureSession(targetRoot);
      this.requireTool('dtd');
      const listed = await this.callToolOnce('dtd', { command: 'listDtdUris' });
      const candidates = extractDtdCandidates(listed);
      const selectedDtd = selectDtdCandidate(candidates, path.resolve(targetRoot));
      await this.callToolOnce('dtd', { command: 'connect', uri: selectedDtd.uri });
      const connected = await this.callToolOnce('dtd', { command: 'listConnectedApps' });
      const applications = extractApplicationCandidates(connected);
      const selectedApplication = selectApplicationCandidate(applications, expectedApplicationIdentity);
      const appUri = firstString(selectedApplication, ['uri', 'vmServiceUri', 'appUri']);
      if (!appUri) throw new FlutterMcpProviderError('app-identity-incomplete', 'Connected App does not expose a VM Service URI.', false);
      this.appUri = appUri;
      this.attached = {
        handshake,
        dtdSelectionDigest: digest(JSON.stringify(redactDtdCandidate(selectedDtd))),
        applicationSelectionDigest: digest(JSON.stringify(redactApplicationCandidate(selectedApplication))),
      };
      return this.attached;
    });
  }

  async probeApplicationIdentity(serviceExtension: string): Promise<FlutterMcpOperationResult<ReviewApplicationReceipt>> {
    const result = await this.invokeServiceExtension('inspect', serviceExtension, {});
    return { ...result, value: parseApplicationReceipt(result.value) };
  }

  async invokeServiceExtension<T = unknown>(
    operation: ReviewRuntimeOperation,
    serviceExtension: string,
    args: Record<string, unknown>,
  ): Promise<FlutterMcpOperationResult<T>> {
    if (!/^ext\.[A-Za-z0-9_.-]+$/.test(serviceExtension)) throw new FlutterMcpProviderError('service-extension-invalid', 'Flutter Runtime service extension name is invalid.', false);
    const targetRoot = this.targetRoot;
    const appUri = this.appUri;
    if (!targetRoot || !appUri) throw new FlutterMcpProviderError('provider-session-missing', 'Flutter MCP App session is not attached.', true);
    return this.runWithRetry(operation, async () => {
      await this.ensureSession(targetRoot);
      this.requireTool('vm_service');
      const vm = await this.callToolOnce('vm_service', { command: 'callMethod', appUri, method: 'getVM' });
      const isolateId = extractIsolateId(vm);
      const response = await this.callToolOnce('vm_service', { command: 'callMethod', appUri, method: serviceExtension, isolateId, arguments: args });
      return extractServiceExtensionValue(response) as T;
    });
  }

  async callForApp<T = unknown>(
    operation: ReviewRuntimeOperation,
    toolName: string,
    args: Record<string, unknown>,
    options: { retryAfterDispatch?: boolean } = {},
  ): Promise<FlutterMcpOperationResult<T>> {
    if (!this.appUri) throw new FlutterMcpProviderError('provider-session-missing', 'Flutter MCP App session is not attached.', true);
    return this.call<T>(operation, toolName, { ...args, appUri: this.appUri }, options);
  }

  async call<T = unknown>(
    operation: ReviewRuntimeOperation,
    toolName: string,
    args: Record<string, unknown>,
    options: { retryAfterDispatch?: boolean } = {},
  ): Promise<FlutterMcpOperationResult<T>> {
    const targetRoot = this.targetRoot;
    if (!targetRoot) throw new FlutterMcpProviderError('provider-session-missing', 'Flutter MCP provider session is not initialized.', true);
    return this.runWithRetry(operation, async () => {
      await this.ensureSession(targetRoot);
      this.requireTool(toolName);
      try {
        return await this.callToolOnce(toolName, args) as T;
      } catch (error) {
        const classified = classifyProviderError(error, 'mcp-tool-call-failed');
        if (!options.retryAfterDispatch && ['tap', 'input', 'scroll'].includes(operation) && classified.code === 'mcp-timeout') {
          throw new FlutterMcpProviderError('side-effect-outcome-unknown', 'A side-effecting Flutter MCP command timed out after dispatch.', false);
        }
        throw classified;
      }
    });
  }

  currentHandshake(): FlutterMcpCapabilityHandshake | undefined {
    return this.handshake;
  }

  async invalidate(): Promise<void> {
    const transport = this.transport;
    this.transport = undefined;
    this.targetRoot = undefined;
    this.handshake = undefined;
    this.attached = undefined;
    this.appUri = undefined;
    this.tools.clear();
    await transport?.close().catch(() => undefined);
  }

  async close(): Promise<void> {
    await this.invalidate();
  }

  private requireTool(name: string): void {
    if (FORBIDDEN_LIFECYCLE_TOOLS.has(name)) throw new FlutterMcpProviderError('device-lifecycle-forbidden', `Flutter MCP lifecycle tool ${name} is outside the attach-only provider boundary.`, false);
    if (!this.transport || !this.handshake) throw new FlutterMcpProviderError('provider-session-missing', 'Flutter MCP provider session is not initialized.', true);
    if (!this.tools.has(name)) throw new FlutterMcpProviderError('mcp-capability-missing', `Flutter MCP tool ${name} is not available in the negotiated session.`, false);
  }

  private async callToolOnce(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.transport) throw new FlutterMcpProviderError('provider-session-missing', 'Flutter MCP provider session is not initialized.', true);
    return this.transport.callTool(name, args);
  }

  private async runWithRetry<T>(operation: ReviewRuntimeOperation, perform: () => Promise<T>): Promise<FlutterMcpOperationResult<T>> {
    const operationId = `flutter-mcp-${randomUUID()}`;
    const failures: ReviewProviderFailure[] = [];
    for (let ordinal = 1 as 1 | 2 | 3; ordinal <= 3; ordinal = (ordinal + 1) as 1 | 2 | 3) {
      const startedAt = this.now().toISOString();
      try {
        const value = await perform();
        return { operationId, attemptOrdinal: ordinal, startedAt, finishedAt: this.now().toISOString(), value, failures };
      } catch (error) {
        const classified = classifyProviderError(error, 'mcp-operation-failed');
        const failure: ReviewProviderFailure = {
          operationId,
          operation,
          attemptOrdinal: ordinal,
          errorCode: classified.code,
          retryable: classified.retryable,
          ...(this.handshake ? {
            providerFingerprint: this.handshake.providerFingerprint,
            sessionIdentityDigest: this.handshake.sessionIdentityDigest,
          } : {}),
          startedAt,
          finishedAt: this.now().toISOString(),
          detailDigest: digest(classified.message),
        };
        failures.push(failure);
        if (!classified.retryable || ordinal === 3) throw new FlutterMcpProviderError(classified.code, classified.message, false, failures);
        if (['mcp-process-exited', 'mcp-transport-closed', 'provider-session-missing'].includes(classified.code)) await this.invalidate();
        if (this.retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
    throw new FlutterMcpProviderError('retry-budget-exhausted', 'Flutter MCP retry budget exhausted.', false, failures);
  }
}

type StdioTransportOptions = { command: string; args: string[]; cwd: string; requestTimeoutMs: number };

export class StdioFlutterMcpTransport implements FlutterMcpTransport {
  private child: ChildProcessWithoutNullStreams | undefined;
  private nextId = 1;
  private stdoutBuffer = '';
  private readonly pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void; timeout: NodeJS.Timeout }>();

  constructor(private readonly options: StdioTransportOptions) {}

  async initialize(input: { protocolVersion: string; clientName: string; clientVersion: string }): Promise<McpInitializeResult> {
    this.start();
    const result = await this.request('initialize', {
      protocolVersion: input.protocolVersion,
      capabilities: {},
      clientInfo: { name: input.clientName, version: input.clientVersion },
    }) as McpInitializeResult;
    if (!result || typeof result.protocolVersion !== 'string' || !result.serverInfo || typeof result.serverInfo.name !== 'string' || typeof result.serverInfo.version !== 'string') {
      throw new FlutterMcpProviderError('mcp-protocol-incompatible', 'Flutter MCP initialize response is incomplete.', false);
    }
    this.notify('notifications/initialized', {});
    return result;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    const result = await this.request('tools/list', {}) as { tools?: unknown };
    if (!Array.isArray(result?.tools)) throw new FlutterMcpProviderError('mcp-protocol-incompatible', 'Flutter MCP tools/list response is incomplete.', false);
    return result.tools.map((item) => {
      if (!item || typeof item !== 'object' || typeof (item as { name?: unknown }).name !== 'string') throw new FlutterMcpProviderError('mcp-protocol-incompatible', 'Flutter MCP tool definition is invalid.', false);
      const tool = item as { name: string; description?: string; inputSchema?: unknown };
      return { name: tool.name, ...(tool.description ? { description: tool.description } : {}), ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}) };
    });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.request('tools/call', { name, arguments: args }) as { isError?: boolean; content?: unknown };
    if (result?.isError) throw new FlutterMcpProviderError('mcp-tool-error', summarizeToolError(result.content), false);
    return result;
  }

  async close(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    if (!child) return;
    child.stdin.end();
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      const timeout = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 1_000);
      child.once('exit', () => { clearTimeout(timeout); resolve(); });
    });
  }

  private start(): void {
    if (this.child) return;
    const child = spawn(this.options.command, this.options.args, {
      cwd: this.options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    this.child = child;
    const decoder = new StringDecoder('utf8');
    child.stdout.on('data', (chunk: Buffer) => this.consumeStdout(decoder.write(chunk)));
    child.once('error', (error) => this.rejectAll(new FlutterMcpProviderError('mcp-process-start-failed', error.message, false)));
    child.once('exit', (code, signal) => this.rejectAll(new FlutterMcpProviderError('mcp-process-exited', `Flutter MCP process exited (${code ?? signal ?? 'unknown'}).`, true)));
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const child = this.child;
    if (!child || child.stdin.destroyed) return Promise.reject(new FlutterMcpProviderError('mcp-transport-closed', 'Flutter MCP stdio transport is closed.', true));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new FlutterMcpProviderError('mcp-timeout', `Flutter MCP ${method} timed out.`, true));
      }, this.options.requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, (error) => {
        if (!error) return;
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(new FlutterMcpProviderError('mcp-transport-closed', error.message, true));
      });
    });
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.child?.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  private consumeStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    for (;;) {
      const newline = this.stdoutBuffer.indexOf('\n');
      if (newline < 0) return;
      const line = this.stdoutBuffer.slice(0, newline).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      let message: { id?: unknown; result?: unknown; error?: { code?: unknown; message?: unknown } };
      try { message = JSON.parse(line) as typeof message; } catch {
        this.rejectAll(new FlutterMcpProviderError('mcp-protocol-incompatible', 'Flutter MCP stdout contained invalid JSON.', false));
        continue;
      }
      if (typeof message.id !== 'number') continue;
      const pending = this.pending.get(message.id);
      if (!pending) continue;
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new FlutterMcpProviderError('mcp-request-error', String(message.error.message ?? message.error.code ?? 'Unknown MCP error.'), false));
      else pending.resolve(message.result);
    }
  }

  private rejectAll(error: Error): void {
    for (const item of this.pending.values()) {
      clearTimeout(item.timeout);
      item.reject(error);
    }
    this.pending.clear();
  }
}

function capabilityInventory(tools: Map<string, McpToolDefinition>): ReviewProviderCapabilities {
  return {
    dtd: tools.has('dtd'),
    vmService: tools.has('vm_service'),
    driver: tools.has('flutter_driver_command'),
    inspector: tools.has('widget_inspector'),
    screenshot: tools.has('flutter_driver_command'),
    interaction: tools.has('flutter_driver_command'),
    runtimeErrors: tools.has('get_runtime_errors'),
  };
}

function requiredCapabilityFailures(capabilities: ReviewProviderCapabilities): string[] {
  return Object.entries(capabilities).flatMap(([name, available]) => available ? [] : [`missing-${name}`]).sort();
}

type DtdCandidate = { uri: string; workingDirectory?: string };

function extractDtdCandidates(value: unknown): DtdCandidate[] {
  return uniqueObjects(extractObjects(value).flatMap((item) => {
    const uri = firstString(item, ['dtdUri', 'dtdURI', 'uri']);
    if (!uri || !/^(?:ws|wss|http|https):/.test(uri)) return [];
    const workingDirectory = firstString(item, ['workingDirectory', 'working_directory', 'cwd', 'projectRoot']);
    return [{ uri, ...(workingDirectory ? { workingDirectory } : {}) }];
  }), (item) => item.uri);
}

function selectDtdCandidate(candidates: DtdCandidate[], targetRoot: string): DtdCandidate {
  if (candidates.length === 0) throw new FlutterMcpProviderError('dtd-not-found', 'No Dart Tooling Daemon was discovered for a running App.', true);
  const matching = candidates.filter((item) => item.workingDirectory && path.resolve(item.workingDirectory) === targetRoot);
  if (matching.length === 1) return matching[0]!;
  if (matching.length > 1 || candidates.length > 1) throw new FlutterMcpProviderError('dtd-ambiguous', 'Multiple Dart Tooling Daemons were discovered and Target root did not identify exactly one.', false);
  return candidates[0]!;
}

type ApplicationCandidate = Record<string, string | number | boolean>;

function extractApplicationCandidates(value: unknown): ApplicationCandidate[] {
  return uniqueObjects(extractObjects(value).flatMap((item) => {
    const identity = firstString(item, ['applicationIdentity', 'appId', 'id', 'name', 'deviceId', 'uri', 'vmServiceUri', 'appUri']);
    if (!identity) return [];
    const candidate = Object.fromEntries(Object.entries(item).filter(([, entry]) => ['string', 'number', 'boolean'].includes(typeof entry))) as ApplicationCandidate;
    return [candidate];
  }), (item) => JSON.stringify(item));
}

function selectApplicationCandidate(candidates: ApplicationCandidate[], expected?: string): ApplicationCandidate {
  if (candidates.length === 0) throw new FlutterMcpProviderError('app-not-found', 'DTD has no connected running App.', true);
  if (expected) {
    const matching = candidates.filter((item) => Object.values(item).some((value) => String(value) === expected));
    if (matching.length === 1) return matching[0]!;
  }
  if (candidates.length !== 1) throw new FlutterMcpProviderError('app-ambiguous', 'Multiple running Apps are connected and application identity did not identify exactly one.', false);
  return candidates[0]!;
}

function extractObjects(value: unknown): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];
  const visit = (item: unknown): void => {
    if (typeof item === 'string') {
      try { visit(JSON.parse(item) as unknown); } catch { /* Tool text can be non-JSON diagnostic output. */ }
      return;
    }
    if (Array.isArray(item)) { for (const entry of item) visit(entry); return; }
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    result.push(record);
    for (const entry of Object.values(record)) visit(entry);
  };
  visit(value);
  return result;
}

function firstString(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) if (typeof item[key] === 'string' && item[key]) return item[key] as string;
  return undefined;
}

function uniqueObjects<T>(items: T[], identity: (item: T) => string): T[] {
  return [...new Map(items.map((item) => [identity(item), item])).values()];
}

function redactDtdCandidate(candidate: DtdCandidate): Record<string, string> {
  return { uriDigest: digest(candidate.uri), ...(candidate.workingDirectory ? { workingDirectoryDigest: digest(path.resolve(candidate.workingDirectory)) } : {}) };
}

function redactApplicationCandidate(candidate: ApplicationCandidate): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(candidate).map(([key, value]) => [/(?:uri|device|id)/i.test(key) ? `${key}Digest` : key, /(?:uri|device|id)/i.test(key) ? digest(String(value)) : value]));
}

function extractIsolateId(value: unknown): string {
  for (const item of extractObjects(value)) {
    if (Array.isArray(item.isolates)) {
      for (const isolate of item.isolates) {
        if (isolate && typeof isolate === 'object' && typeof (isolate as { id?: unknown }).id === 'string') return (isolate as { id: string }).id;
      }
    }
  }
  throw new FlutterMcpProviderError('app-identity-incomplete', 'Flutter App VM response does not expose an isolate ID.', false);
}

function extractServiceExtensionValue(value: unknown): unknown {
  const objects = extractObjects(value);
  for (const item of objects) {
    if (item.result && typeof item.result === 'object') return item.result;
    if (item.response && typeof item.response === 'object') return item.response;
  }
  return objects.at(-1) ?? value;
}

function parseApplicationReceipt(value: unknown): ReviewApplicationReceipt {
  const candidate = extractObjects(value).find((item) => [
    'applicationIdentity', 'targetCommit', 'targetContentDigest', 'appBuildDigest', 'reviewHarnessVersion', 'platform',
  ].every((key) => typeof item[key] === 'string' && item[key]));
  if (!candidate) throw new FlutterMcpProviderError('app-identity-incomplete', 'Flutter Runtime identity service extension returned an incomplete receipt.', false);
  const size = (key: string): { width: number; height: number } | undefined => {
    const item = candidate[key];
    return item && typeof item === 'object' && typeof (item as { width?: unknown }).width === 'number' && typeof (item as { height?: unknown }).height === 'number'
      ? { width: (item as { width: number }).width, height: (item as { height: number }).height }
      : undefined;
  };
  const optionalString = (key: string) => typeof candidate[key] === 'string' ? candidate[key] as string : undefined;
  const optionalNumber = (key: string) => typeof candidate[key] === 'number' ? candidate[key] as number : undefined;
  const receipt: ReviewApplicationReceipt = {
    applicationIdentity: candidate.applicationIdentity as string,
    targetCommit: candidate.targetCommit as string,
    targetContentDigest: candidate.targetContentDigest as string,
    appBuildDigest: candidate.appBuildDigest as string,
    reviewHarnessVersion: candidate.reviewHarnessVersion as string,
    platform: candidate.platform as string,
    ...(optionalString('runtimeOrOsVersion') ? { runtimeOrOsVersion: optionalString('runtimeOrOsVersion')! } : {}),
    ...(size('logicalSize') ? { logicalSize: size('logicalSize')! } : {}),
    ...(size('pixelSize') ? { pixelSize: size('pixelSize')! } : {}),
    ...(optionalNumber('dpr') ? { dpr: optionalNumber('dpr')! } : {}),
    ...(optionalString('orientation') ? { orientation: optionalString('orientation')! } : {}),
    ...(optionalString('locale') ? { locale: optionalString('locale')! } : {}),
    ...(optionalString('theme') ? { theme: optionalString('theme')! } : {}),
    ...(optionalNumber('textScale') ? { textScale: optionalNumber('textScale')! } : {}),
    ...(optionalString('safeArea') ? { safeArea: optionalString('safeArea')! } : {}),
    ...(optionalString('fontEnvironment') ? { fontEnvironment: optionalString('fontEnvironment')! } : {}),
    ...(typeof candidate.textEntryEmulation === 'boolean' ? { textEntryEmulation: candidate.textEntryEmulation } : {}),
    ...(optionalString('settlePolicy') ? { settlePolicy: optionalString('settlePolicy')! } : {}),
    ...(optionalString('systemChromePolicy') ? { systemChromePolicy: optionalString('systemChromePolicy')! } : {}),
  };
  return receipt;
}

function classifyProviderError(error: unknown, fallbackCode: string): FlutterMcpProviderError {
  if (error instanceof FlutterMcpProviderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const retryable = /timeout|timed out|disconnect|closed|broken pipe|not ready|starting/.test(lower);
  return new FlutterMcpProviderError(retryable ? inferRetryableCode(lower) : fallbackCode, message, retryable);
}

function inferRetryableCode(message: string): string {
  if (/timeout|timed out/.test(message)) return 'mcp-timeout';
  if (/disconnect/.test(message)) return 'app-disconnected';
  return 'mcp-transport-closed';
}

function summarizeToolError(content: unknown): string {
  const text = extractObjects(content).flatMap((item) => typeof item.text === 'string' ? [item.text] : []).join(' ');
  return text || 'Flutter MCP tool returned an error result.';
}

function digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
