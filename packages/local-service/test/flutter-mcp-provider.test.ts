import { describe, expect, it } from 'vitest';
import {
  FlutterMcpProvider,
  FlutterMcpProviderError,
  type FlutterMcpTransport,
  type McpToolDefinition,
} from '../src/flutter-mcp-provider.js';

class FakeTransport implements FlutterMcpTransport {
  initializeCalls = 0;
  listCalls = 0;
  closeCalls = 0;
  readonly toolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

  constructor(
    private readonly tools: McpToolDefinition[],
    private readonly responder: (name: string, args: Record<string, unknown>, call: number) => unknown | Promise<unknown>,
  ) {}

  async initialize() {
    this.initializeCalls += 1;
    return { protocolVersion: '2025-06-18', serverInfo: { name: 'dart-mcp-server', version: '3.12.0' } };
  }

  async listTools() {
    this.listCalls += 1;
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>) {
    this.toolCalls.push({ name, args });
    return this.responder(name, args, this.toolCalls.length);
  }

  async close() {
    this.closeCalls += 1;
  }
}

const driverCommands = ['get_text', 'tap', 'enter_text', 'waitFor', 'scroll', 'scrollIntoView', 'screenshot'];
const tools: McpToolDefinition[] = [
  { name: 'connect_dart_tooling_daemon', inputSchema: { type: 'object', properties: { uri: { type: 'string' } } } },
  { name: 'get_widget_tree', inputSchema: { type: 'object', properties: { summaryOnly: { type: 'boolean' } } } },
  { name: 'flutter_driver', inputSchema: { type: 'object', properties: { command: { type: 'string', enum: driverCommands } } } },
  { name: 'get_runtime_errors', inputSchema: { type: 'object', properties: { clearRuntimeErrors: { type: 'boolean' } } } },
  { name: 'launch_app' },
  { name: 'list_devices' },
];

describe('attach-only Flutter MCP provider', () => {
  it('negotiates capabilities once and attaches to one already-running App without lifecycle tools', async () => {
    const transport = new FakeTransport(tools, (name) => {
      if (name !== 'connect_dart_tooling_daemon') throw new Error(`Unexpected tool ${name}`);
      return { content: [{ type: 'text', text: 'connected' }] };
    });
    const provider = new FlutterMcpProvider({ dtdUri: 'ws://sensitive-dtd', transportFactory: () => transport, retryDelayMs: 0 });
    const attached = await provider.attach('/target');
    expect(attached.attemptOrdinal).toBe(1);
    expect(attached.value.handshake).toMatchObject({
      providerId: 'dart-flutter-mcp',
      providerVersion: '3.12.0',
      capabilities: { attach: true, applicationIdentity: true, casePreparation: true, structureObservation: true, stateObservation: true, screenshot: true, interaction: true, runtimeErrors: true },
    });
    expect(attached.value.dtdSelectionDigest).toMatch(/^sha256:/);
    expect(JSON.stringify(attached.value)).not.toContain('sensitive-dtd');
    expect(transport.toolCalls).toEqual([{ name: 'connect_dart_tooling_daemon', args: { uri: 'ws://sensitive-dtd' } }]);
    expect(transport.initializeCalls).toBe(1);
  });

  it('uses one three-attempt budget and returns every failed attempt before success', async () => {
    let connects = 0;
    const transport = new FakeTransport(tools, () => {
      connects += 1;
      if (connects < 3) throw new FlutterMcpProviderError('mcp-timeout', 'DTD is starting.', true);
      return {};
    });
    const provider = new FlutterMcpProvider({ dtdUri: 'ws://dtd', transportFactory: () => transport, retryDelayMs: 0 });
    const attached = await provider.attach('/target');
    expect(attached.attemptOrdinal).toBe(3);
    expect(attached.failures.map((item) => [item.attemptOrdinal, item.errorCode, item.retryable])).toEqual([
      [1, 'mcp-timeout', true], [2, 'mcp-timeout', true],
    ]);
  });

  it('requires an operator DTD URI and forbids device lifecycle tools', async () => {
    const transport = new FakeTransport(tools, () => ({}));
    const provider = new FlutterMcpProvider({ transportFactory: () => transport, retryDelayMs: 0 });
    await expect(provider.attach('/target')).rejects.toMatchObject({ code: 'dtd-uri-required', retryable: false });
    expect(transport.toolCalls).toHaveLength(0);

    const ready = new FakeTransport(tools, () => ({}));
    const lifecycleProvider = new FlutterMcpProvider({ transportFactory: () => ready, retryDelayMs: 0 });
    await lifecycleProvider.ensureSession('/target');
    await expect(lifecycleProvider.call('connect', 'launch_app', {})).rejects.toMatchObject({ code: 'device-lifecycle-forbidden' });
    expect(ready.toolCalls).toEqual([]);
  });

  it('does not redispatch a side-effecting command after an unknown timeout', async () => {
    const transport = new FakeTransport(tools, () => {
      throw new FlutterMcpProviderError('mcp-timeout', 'timed out', true);
    });
    const provider = new FlutterMcpProvider({ transportFactory: () => transport, retryDelayMs: 0 });
    await provider.ensureSession('/target');
    await expect(provider.call('tap', 'flutter_driver', { command: 'tap' })).rejects.toMatchObject({
      code: 'side-effect-outcome-unknown',
      failures: [{ attemptOrdinal: 1, retryable: false }],
    });
    expect(transport.toolCalls).toHaveLength(1);
  });
});
