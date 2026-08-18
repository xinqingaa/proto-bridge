import { V2ContractError } from '@proto-bridge/core/v2';
import {
  LOCAL_SERVICE_PROTOCOL_VERSION,
  type LocalServiceEnvelope,
  type LocalServiceSession,
} from '@proto-bridge/core/v2/service-contract';
import type { ServerOptions } from '../types.js';

export class ReviewServiceClient {
  private session: LocalServiceSession | undefined;

  constructor(private readonly options: ServerOptions) {}

  async call<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
    if (!this.options.serviceUrl) throw unavailable('No Local Service URL is configured for this MCP process.');
    const session = await this.ensureSession();
    try {
      const response = await fetch(`${this.options.serviceUrl.replace(/\/$/, '')}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          Origin: this.options.serviceOrigin ?? new URL(this.options.serviceUrl).origin,
          Authorization: `Bearer ${session.sessionToken}`,
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      });
      const envelope = await response.json() as LocalServiceEnvelope;
      if (!envelope.ok) throw new V2ContractError(envelope.error.code as never, envelope.error.message, envelope.error.details);
      return envelope.data as T;
    } catch (error) {
      if (error instanceof V2ContractError) throw error;
      this.session = undefined;
      throw unavailable(error instanceof Error ? error.message : String(error));
    }
  }

  async readArtifact(reviewRunId: string, digest: string): Promise<Uint8Array> {
    if (!this.options.serviceUrl) throw unavailable('No Local Service URL is configured for this MCP process.');
    const session = await this.ensureSession();
    try {
      // Digest is always `sha256:<hex>`; do not encodeURIComponent it — `%3A` breaks Local Service path matching.
      if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
        throw new V2ContractError('unknown-reference', `Invalid Review artifact digest ${digest}.`);
      }
      const response = await fetch(`${this.options.serviceUrl.replace(/\/$/, '')}/reviews/${encodeURIComponent(reviewRunId)}/artifacts/${digest}`, {
        headers: { Origin: this.options.serviceOrigin ?? new URL(this.options.serviceUrl).origin, Authorization: `Bearer ${session.sessionToken}` },
      });
      if (!response.ok) {
        const envelope = await response.json() as LocalServiceEnvelope;
        if (!envelope.ok) throw new V2ContractError(envelope.error.code as never, envelope.error.message, envelope.error.details);
      }
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      if (error instanceof V2ContractError) throw error;
      throw unavailable(error instanceof Error ? error.message : String(error));
    }
  }

  private async ensureSession(): Promise<LocalServiceSession> {
    if (this.session && Date.parse(this.session.expiresAt) > Date.now()) return this.session;
    try {
      const response = await fetch(`${this.options.serviceUrl!.replace(/\/$/, '')}/session`, {
        method: 'POST',
        headers: { Origin: this.options.serviceOrigin ?? new URL(this.options.serviceUrl!).origin },
      });
      const envelope = await response.json() as LocalServiceEnvelope;
      if (!envelope.ok) throw new Error(envelope.error.message);
      const session = envelope.data as LocalServiceSession;
      if (session.protocolVersion !== LOCAL_SERVICE_PROTOCOL_VERSION) {
        throw new Error(`Local Service protocol ${String(session.protocolVersion)} is incompatible with required version ${LOCAL_SERVICE_PROTOCOL_VERSION}.`);
      }
      this.session = session;
      return this.session;
    } catch (error) {
      throw unavailable(error instanceof Error ? error.message : String(error));
    }
  }
}

function unavailable(detail: string): V2ContractError {
  return new V2ContractError('review-service-unavailable', `Authoritative Review requires the Local Service: ${detail}`);
}
