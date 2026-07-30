import type { JsonRpcRequest, ServerOptions, ToolContext } from '../types.js';
import { EvidenceStoreReader } from '../services/evidence-store-reader.js';
import { dispatch } from './dispatcher.js';
import { errorData, errorMessage, send, sendError } from './responses.js';

export function startMcpServer(options: ServerOptions): void {
  const context = createToolContext(options);

  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) void handleLine(context, line);
      newlineIndex = buffer.indexOf('\n');
    }
  });
  process.stdin.on('end', () => {
    // Let in-flight async tool calls finish before Node exits naturally.
  });
}

export function createToolContext(options: ServerOptions): ToolContext {
  return {
    options,
    evidence: new EvidenceStoreReader(options),
  };
}

async function handleLine(context: ToolContext, line: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(line) as JsonRpcRequest;
  } catch (error) {
    sendError(null, -32700, `Invalid JSON: ${errorMessage(error)}`);
    return;
  }

  try {
    const result = await dispatch(context, request.method, request.params);
    if (request.id !== undefined && request.id !== null) {
      send({ jsonrpc: '2.0', id: request.id, result });
    }
  } catch (error) {
    if (request.id !== undefined && request.id !== null) {
      sendError(request.id, -32603, errorMessage(error), errorData(error));
    } else {
      console.error(errorMessage(error));
    }
  }
}
