import { createHash, randomUUID } from 'node:crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import type {
  ReviewProviderCapabilities,
  ReviewProviderFailure,
  ReviewRuntimeOperation,
} from '@proto-bridge/core/review';

export const FLUTTER_MCP_PROVIDER_ID = 'dart-flutter-mcp' as const;
const DEFAULT_PROTOCOL_VERSION = '2025-06-18';
const FORBIDDEN_LIFECYCLE_TOOLS = new Set(['launch_app', 'list_devices', 'list_running_apps', 'stop_app', 'get_app_logs']);
const ALLOWED_RUNTIME_TOOLS = new Set([
  'connect_dart_tooling_daemon',
  'get_widget_tree',
  'flutter_driver',
  'get_runtime_errors',
]);

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
  dtdUri?: string;
  dtdUriProvider?: () => string | undefined;
  transportFactory?: (input: { command: string; args: string[]; cwd: string; requestTimeoutMs: number }) => FlutterMcpTransport;
  now?: () => Date;
};

export class FlutterMcpProvider {
  private readonly command: string;
  private readonly args: string[];
  private readonly protocolVersion: string;
  private readonly requestTimeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly dtdUriProvider: () => string | undefined;
  private readonly transportFactory: NonNullable<FlutterMcpProviderOptions['transportFactory']>;
  private readonly now: () => Date;
  private transport: FlutterMcpTransport | undefined;
  private targetRoot: string | undefined;
  private handshake: FlutterMcpCapabilityHandshake | undefined;
  private tools = new Map<string, McpToolDefinition>();
  private attached: FlutterMcpAttachResult | undefined;
  private attachedDtdDigest: string | undefined;

  constructor(options: FlutterMcpProviderOptions = {}) {
    this.command = options.command ?? 'dart';
    this.args = options.args ?? ['mcp-server'];
    this.protocolVersion = options.protocolVersion ?? DEFAULT_PROTOCOL_VERSION;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.retryDelayMs = options.retryDelayMs ?? 150;
    this.dtdUriProvider = options.dtdUriProvider ?? (() => options.dtdUri ?? process.env.PB_FLUTTER_DTD_URI);
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

  async attach(targetRoot: string): Promise<FlutterMcpOperationResult<FlutterMcpAttachResult>> {
    const dtdUri = this.dtdUriProvider()?.trim();
    if (!dtdUri) throw new FlutterMcpProviderError('dtd-uri-required', 'Attach-only Flutter Review requires an operator-provided DTD URI.', false);
    if (!/^(?:ws|wss|http|https):\/\//.test(dtdUri)) throw new FlutterMcpProviderError('dtd-uri-invalid', 'The operator-provided DTD URI is invalid.', false);
    const dtdSelectionDigest = digest(dtdUri);
    if (this.attached && this.targetRoot === path.resolve(targetRoot) && this.attachedDtdDigest === dtdSelectionDigest) {
      const at = this.now().toISOString();
      return { operationId: `flutter-mcp-${randomUUID()}`, attemptOrdinal: 1, startedAt: at, finishedAt: at, value: this.attached, failures: [] };
    }
    this.attached = undefined;
    this.attachedDtdDigest = undefined;
    return this.runWithRetry('connect', async () => {
      const handshake = await this.ensureSession(targetRoot);
      this.requireTool('connect_dart_tooling_daemon');
      await this.callToolOnce('connect_dart_tooling_daemon', { uri: dtdUri });
      this.attachedDtdDigest = dtdSelectionDigest;
      this.attached = {
        handshake,
        dtdSelectionDigest,
        applicationSelectionDigest: digest(JSON.stringify({ dtdSelectionDigest, targetRoot: path.resolve(targetRoot) })),
      };
      return this.attached;
    });
  }

  async callForApp<T = unknown>(
    operation: ReviewRuntimeOperation,
    toolName: string,
    args: Record<string, unknown>,
    options: { retryAfterDispatch?: boolean } = {},
  ): Promise<FlutterMcpOperationResult<T>> {
    if (!this.attached) throw new FlutterMcpProviderError('provider-session-missing', 'Flutter MCP App session is not attached.', true);
    return this.call<T>(operation, toolName, args, options);
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
    this.attachedDtdDigest = undefined;
    this.tools.clear();
    await transport?.close().catch(() => undefined);
  }

  async close(): Promise<void> {
    await this.invalidate();
  }

  private requireTool(name: string): void {
    if (FORBIDDEN_LIFECYCLE_TOOLS.has(name)) throw new FlutterMcpProviderError('device-lifecycle-forbidden', `Flutter MCP lifecycle tool ${name} is outside the attach-only provider boundary.`, false);
    if (!ALLOWED_RUNTIME_TOOLS.has(name)) throw new FlutterMcpProviderError('mcp-tool-forbidden', `Flutter MCP tool ${name} is outside the Runtime Review allowlist.`, false);
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
  const driverCommands = toolEnum(tools.get('flutter_driver'), 'command');
  const hasDriverCommands = (...commands: string[]) => commands.every((command) => driverCommands.has(command));
  return {
    attach: tools.has('connect_dart_tooling_daemon'),
    applicationIdentity: hasDriverCommands('get_text'),
    casePreparation: hasDriverCommands('tap', 'enter_text', 'waitFor'),
    structureObservation: tools.has('get_widget_tree'),
    stateObservation: hasDriverCommands('get_text'),
    screenshot: hasDriverCommands('screenshot'),
    interaction: hasDriverCommands('tap', 'enter_text', 'scroll', 'scrollIntoView', 'waitFor'),
    runtimeErrors: tools.has('get_runtime_errors'),
  };
}

function requiredCapabilityFailures(capabilities: ReviewProviderCapabilities): string[] {
  return Object.entries(capabilities).flatMap(([name, available]) => available ? [] : [`missing-${name}`]).sort();
}

function toolEnum(tool: McpToolDefinition | undefined, property: string): Set<string> {
  if (!tool?.inputSchema || typeof tool.inputSchema !== 'object') return new Set();
  const properties = (tool.inputSchema as { properties?: unknown }).properties;
  if (!properties || typeof properties !== 'object') return new Set();
  const definition = (properties as Record<string, unknown>)[property];
  if (!definition || typeof definition !== 'object') return new Set();
  const values = (definition as { enum?: unknown }).enum;
  return new Set(Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : []);
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
