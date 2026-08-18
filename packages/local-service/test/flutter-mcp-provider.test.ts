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

const tools = [
  'dtd', 'flutter_driver_command', 'widget_inspector', 'get_runtime_errors',
  'launch_app', 'list_devices',
].map((name) => ({ name }));

describe('attach-only Flutter MCP provider', () => {
  it('negotiates capabilities once and attaches to one already-running App without lifecycle tools', async () => {
    const transport = new FakeTransport(tools, (name, args) => {
      if (name !== 'dtd') throw new Error(`Unexpected tool ${name}`);
      if (args.command === 'listDtdUris') return { content: [{ type: 'text', text: JSON.stringify({ dtdUris: [{ uri: 'ws://sensitive-dtd', workingDirectory: '/target' }] }) }] };
      if (args.command === 'connect') return { content: [{ type: 'text', text: 'connected' }] };
      return { content: [{ type: 'text', text: JSON.stringify({ apps: [{ appId: 'app-1', name: 'sample' }] }) }] };
    });
    const provider = new FlutterMcpProvider({ transportFactory: () => transport, retryDelayMs: 0 });
    const attached = await provider.attach('/target', 'app-1');
    expect(attached.attemptOrdinal).toBe(1);
    expect(attached.value.handshake).toMatchObject({
      providerId: 'dart-flutter-mcp',
      providerVersion: '3.12.0',
      capabilities: { dtd: true, driver: true, inspector: true, screenshot: true, interaction: true, runtimeErrors: true },
    });
    expect(attached.value.dtdSelectionDigest).toMatch(/^sha256:/);
    expect(JSON.stringify(attached.value)).not.toContain('sensitive-dtd');
    expect(transport.toolCalls.map((item) => [item.name, item.args.command])).toEqual([
      ['dtd', 'listDtdUris'], ['dtd', 'connect'], ['dtd', 'listConnectedApps'],
    ]);
    expect(transport.initializeCalls).toBe(1);
  });

  it('uses one three-attempt budget and returns every failed attempt before success', async () => {
    let discoveries = 0;
    const transport = new FakeTransport(tools, (_name, args) => {
      if (args.command === 'listDtdUris') {
        discoveries += 1;
        return discoveries < 3
          ? { content: [{ type: 'text', text: JSON.stringify({ dtdUris: [] }) }] }
          : { content: [{ type: 'text', text: JSON.stringify({ dtdUris: [{ uri: 'ws://dtd', workingDirectory: '/target' }] }) }] };
      }
      if (args.command === 'connect') return {};
      return { content: [{ type: 'text', text: JSON.stringify({ apps: [{ appId: 'app-1' }] }) }] };
    });
    const provider = new FlutterMcpProvider({ transportFactory: () => transport, retryDelayMs: 0 });
    const attached = await provider.attach('/target');
    expect(attached.attemptOrdinal).toBe(3);
    expect(attached.failures.map((item) => [item.attemptOrdinal, item.errorCode, item.retryable])).toEqual([
      [1, 'dtd-not-found', true], [2, 'dtd-not-found', true],
    ]);
  });

  it('stops immediately for ambiguity and forbids device lifecycle tools', async () => {
    const transport = new FakeTransport(tools, (_name, args) => {
      if (args.command === 'listDtdUris') return { content: [{ type: 'text', text: JSON.stringify({ dtdUris: [
        { uri: 'ws://one', workingDirectory: '/target' },
        { uri: 'ws://two', workingDirectory: '/target' },
      ] }) }] };
      return {};
    });
    const provider = new FlutterMcpProvider({ transportFactory: () => transport, retryDelayMs: 0 });
    await expect(provider.attach('/target')).rejects.toMatchObject({ code: 'dtd-ambiguous', retryable: false, failures: [{ attemptOrdinal: 1 }] });
    expect(transport.toolCalls).toHaveLength(1);

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
    await expect(provider.call('tap', 'flutter_driver_command', { command: 'tap' })).rejects.toMatchObject({
      code: 'side-effect-outcome-unknown',
      failures: [{ attemptOrdinal: 1, retryable: false }],
    });
    expect(transport.toolCalls).toHaveLength(1);
  });
});
