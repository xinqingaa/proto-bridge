import type { JsonObject } from '../types.js';
import { V2ContractError } from '@proto-bridge/core/v2';
import { ZodError } from 'zod';

export function send(message: JsonObject): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

export function sendError(
  id: string | number | null,
  code: number,
  message: string,
  data?: JsonObject,
): void {
  send({
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data ? { data } : {}) },
  });
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

export function errorData(error: unknown): JsonObject | undefined {
  if (error instanceof V2ContractError) {
    return {
      errorCode: error.code,
      ...(error.details === undefined
        ? {}
        : { details: JSON.parse(JSON.stringify(error.details)) }),
    };
  }
  if (error instanceof ZodError) {
    return {
      errorCode: 'invalid-schema',
      details: error.issues as unknown as JsonObject['details'],
    };
  }
  return undefined;
}
