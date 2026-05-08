import type {
  BuildUiImplementationPlanResult,
  CapturePageSnapshotResult,
} from '@proto-bridge/core/workflows/snapshot-ui-reconstruction';

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null | undefined;
  method: string;
  params?: JsonObject | undefined;
};

export type GeneratedSnapshot = {
  id: string;
  createdAt: string;
  targetRoot: string;
  result: CapturePageSnapshotResult;
};

export type GeneratedUiPlan = {
  id: string;
  createdAt: string;
  targetRoot: string;
  snapshotId: string;
  result: BuildUiImplementationPlanResult;
};

export type ServerOptions = Record<string, never>;

export type ToolContext = {
  options: ServerOptions;
  snapshots: {
    add(snapshot: GeneratedSnapshot): void;
    get(snapshotId: string): GeneratedSnapshot | undefined;
    require(snapshotId: string): GeneratedSnapshot;
    values(): GeneratedSnapshot[];
  };
  plans: {
    add(plan: GeneratedUiPlan): void;
    get(planId: string): GeneratedUiPlan | undefined;
    require(planId: string): GeneratedUiPlan;
    values(): GeneratedUiPlan[];
  };
};
