import type { GenerateMigrationSpecResult, MigrationContext } from '@proto-bridge/core';

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null | undefined;
  method: string;
  params?: JsonObject | undefined;
};

export type ProtoBridgeConfig = {
  source?: { adapter?: string | undefined; root?: string | undefined } | undefined;
  target?: { adapter?: string | undefined; root?: string | undefined } | undefined;
  route?: string | undefined;
  vue?: string | undefined;
  url?: string | undefined;
  prototypeUrl?: string | undefined;
  outputRoot?: string | undefined;
  capture?: boolean | undefined;
};

export type ResolvedConfig = {
  configPath: string;
  configDir: string;
  config: ProtoBridgeConfig;
};

export type GeneratedRun = {
  id: string;
  createdAt: string;
  configPath: string;
  result: GenerateMigrationSpecResult;
};

export type ServerOptions = {
  config?: string | undefined;
};

export type ToolContext = {
  options: ServerOptions;
  runs: {
    add(run: GeneratedRun): void;
    get(runId: string): GeneratedRun | undefined;
    require(runId: string): GeneratedRun;
    values(): GeneratedRun[];
  };
};

export type { MigrationContext };
