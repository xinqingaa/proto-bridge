import type { EvidenceStoreReader } from './services/evidence-store-reader.js';

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
};

export type ToolContext = {
  options: ServerOptions;
  evidence: EvidenceStoreReader;
};
