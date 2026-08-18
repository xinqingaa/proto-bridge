import { afterEach, describe, expect, it } from 'vitest';
import { FlutterMcpProvider } from '../src/flutter-mcp-provider.js';

let provider: FlutterMcpProvider | undefined;

afterEach(async () => {
  await provider?.close();
  provider = undefined;
});

describe('installed official Dart and Flutter MCP server', () => {
  it('negotiates the attach-only Runtime Review capability profile', async () => {
    provider = new FlutterMcpProvider({ requestTimeoutMs: 15_000 });
    const handshake = await provider.ensureSession(process.cwd());

    expect(handshake.availableTools).toEqual(expect.arrayContaining([
      'connect_dart_tooling_daemon',
      'get_widget_tree',
      'flutter_driver',
      'get_runtime_errors',
    ]));
    expect(handshake.capabilities).toEqual({
      attach: true,
      applicationIdentity: true,
      casePreparation: true,
      structureObservation: true,
      stateObservation: true,
      screenshot: true,
      interaction: true,
      runtimeErrors: true,
    });
    expect(handshake.unsupportedReasons).toEqual([]);
  }, 20_000);
});
