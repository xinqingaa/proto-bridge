import type { JsonObject } from '../types.js';

export function send(message: JsonObject): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function sendError(id: string | number | null, code: number, message: string): void {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

export function toolJson(value: unknown): JsonObject {
  return toolText(JSON.stringify(value, null, 2));
}

export function toolText(text: string): JsonObject {
  return { content: [{ type: 'text', text }] };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
