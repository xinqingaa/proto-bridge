import type { Page } from 'playwright';
import {
  RUNTIME_CAPTURE_GLOBAL,
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
  RuntimeCaptureResponse,
  type RuntimeDescribeSuccess,
  type RuntimeExecuteActionSuccess,
  type RuntimePrepareSuccess,
  type RuntimeReadinessSuccess,
  type RuntimeResetSuccess,
  type RuntimeSemanticSnapshotSuccess,
  type RuntimeVerifyCheckpointSuccess,
  type RuntimeCaptureRequestPayload,
  type RuntimeCaptureSuccess,
} from '../runtime-contract/index.js';
import { generateOperationalId } from '../store/id-generator.js';

export class RuntimeProtocolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RuntimeProtocolError';
  }
}

type RuntimeSuccessByKind = {
  describe: typeof RuntimeDescribeSuccess._output;
  prepare: typeof RuntimePrepareSuccess._output;
  readiness: typeof RuntimeReadinessSuccess._output;
  'semantic-snapshot': typeof RuntimeSemanticSnapshotSuccess._output;
  reset: typeof RuntimeResetSuccess._output;
  'execute-action': typeof RuntimeExecuteActionSuccess._output;
  'verify-checkpoint': typeof RuntimeVerifyCheckpointSuccess._output;
};

export async function requestRuntimeCapture<
  TPayload extends RuntimeCaptureRequestPayload,
>(
  page: Page,
  payload: TPayload,
): Promise<RuntimeSuccessByKind[TPayload['kind']]> {
  const request = {
    protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
    requestId: generateOperationalId('request'),
    payload,
  };
  let raw: unknown;
  const retryable = new Set<RuntimeCaptureRequestPayload['kind']>([
    'describe',
    'prepare',
    'readiness',
    'semantic-snapshot',
    'verify-checkpoint',
  ]).has(payload.kind);
  for (let attempt = 0; ; attempt += 1) {
    try {
      raw = await page.evaluate(
        async ({ globalName, protocolRequest }) => {
          const api = (window as unknown as Record<string, unknown>)[globalName] as
            | { request(input: unknown): Promise<unknown> }
            | undefined;
          if (!api || typeof api.request !== 'function') {
            throw new Error(`Runtime does not expose ${globalName}.`);
          }
          return api.request(protocolRequest);
        },
        { globalName: RUNTIME_CAPTURE_GLOBAL, protocolRequest: request },
      );
      break;
    } catch (error) {
      const navigationDestroyed =
        error instanceof Error &&
        error.message.includes('Execution context was destroyed');
      if (!retryable || !navigationDestroyed || attempt >= 2) throw error;
      await page.waitForLoadState('domcontentloaded');
      await page.waitForFunction(
        (globalName) =>
          Boolean((window as unknown as Record<string, unknown>)[globalName]),
        RUNTIME_CAPTURE_GLOBAL,
        { timeout: 10_000 },
      );
    }
  }
  const response = RuntimeCaptureResponse.parse(raw);
  if (!response.ok) {
    throw new RuntimeProtocolError(
      response.error.code,
      response.error.message,
      response.error.details,
    );
  }
  return response as RuntimeSuccessByKind[TPayload['kind']];
}
