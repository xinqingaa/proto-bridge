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

/**
 * Successful tool results for tools that declare `outputSchema` must include
 * `structuredContent` (MCP 2025-06-18). Cursor and other strict clients reject
 * content-only payloads when an output schema is advertised.
 */
export function toolJson(value: unknown): JsonObject {
  const structuredContent = toStructuredObject(value);
  const text = JSON.stringify(structuredContent, null, 2);
  return {
    content: [{ type: 'text', text }],
    structuredContent,
  };
}

export function toolText(text: string): JsonObject {
  return { content: [{ type: 'text', text }] };
}

/** Returns a real MCP ImageContent block while keeping strict structured output. */
export function toolImage(input: {
  data: string;
  mimeType: string;
  metadata: JsonObject;
}): JsonObject {
  return {
    content: [
      { type: 'image', data: input.data, mimeType: input.mimeType },
      { type: 'text', text: JSON.stringify(input.metadata, null, 2) },
    ],
    structuredContent: input.metadata,
  };
}

function toStructuredObject(value: unknown): JsonObject {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return { value: value as never };
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
