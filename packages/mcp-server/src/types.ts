import type { EvidenceStoreReader } from './services/evidence-store-reader.js';
import type { ReviewServiceClient } from './services/review-service-client.js';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null;
  method: string;
  params?: JsonObject;
};

export type ServerOptions = {
  storeRoot?: string;
  workspaceId?: string;
  serviceUrl?: string;
  serviceOrigin?: string;
};

export type ToolContext = {
  options: ServerOptions;
  evidence: EvidenceStoreReader;
  reviews: ReviewServiceClient;
};
