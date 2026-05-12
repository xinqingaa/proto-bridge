import type {
  BuildUiPlanResult,
  CapturePageCanonicalResult,
  ExportUiReviewResult,
  AttachScreenshotOcrResult,
  PageCanonical,
} from '@proto-bridge/core/workflows/ui-reconstruction';

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type JsonRpcRequest = {
  jsonrpc?: '2.0';
  id?: string | number | null | undefined;
  method: string;
  params?: JsonObject | undefined;
};

export type GeneratedPage = {
  id: string;
  createdAt: string;
  targetRoot: string;
  page: PageCanonical;
  files: CapturePageCanonicalResult['files'] & {
    uiBuildPlan?: string | undefined;
    uiBuildReview?: string | undefined;
    ocrResult?: string | undefined;
  };
  capabilities: CapturePageCanonicalResult['capabilities'];
  plan?: BuildUiPlanResult['plan'] | undefined;
  review?: ExportUiReviewResult | undefined;
  ocr?: AttachScreenshotOcrResult | undefined;
};

export type ServerOptions = Record<string, never>;

export type ToolContext = {
  options: ServerOptions;
  pages: {
    add(page: GeneratedPage): void;
    get(pageId: string): GeneratedPage | undefined;
    require(pageId: string): GeneratedPage;
    latest(): GeneratedPage | undefined;
    values(): GeneratedPage[];
  };
};
