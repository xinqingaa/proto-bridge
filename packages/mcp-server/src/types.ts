import type {
  BuildUiImplementationPlanResult,
  CapturePageEvidenceResult,
} from '@proto-bridge/core/workflows/ui-reconstruction';

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null | undefined;
  method: string;
  params?: JsonObject | undefined;
};

export type GeneratedEvidence = {
  id: string;
  createdAt: string;
  targetRoot: string;
  result: CapturePageEvidenceResult;
};

export type GeneratedUiPlan = {
  id: string;
  createdAt: string;
  targetRoot: string;
  evidenceId: string;
  result: BuildUiImplementationPlanResult;
};

export type ServerOptions = Record<string, never>;

export type ToolContext = {
  options: ServerOptions;
  evidences: {
    add(evidence: GeneratedEvidence): void;
    get(evidenceId: string): GeneratedEvidence | undefined;
    require(evidenceId: string): GeneratedEvidence;
    values(): GeneratedEvidence[];
  };
  plans: {
    add(plan: GeneratedUiPlan): void;
    get(planId: string): GeneratedUiPlan | undefined;
    require(planId: string): GeneratedUiPlan;
    values(): GeneratedUiPlan[];
  };
};
