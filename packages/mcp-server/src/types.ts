import type {
  PageCanonical,
  ProtoBridgeConfig,
  ReconstructPageContextResult,
  UiBuildPlan,
} from '@proto-bridge/core';
export type { ProtoBridgeConfig } from '@proto-bridge/core';
import type {
  ScreenshotAttachCapabilityResult,
  UiReviewCapabilityResult,
} from '@proto-bridge/core/capabilities';

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
  files: {
    pageCanonical: string;
    pageDebugIndex: string;
    screenshots: string[];
    uiBuildPlan?: string | undefined;
    uiBuildReview?: string | undefined;
    ocrResult?: string | undefined;
  };
  capabilities: PageCanonical['capabilities'];
  plan?: UiBuildPlan | undefined;
  review?: UiReviewCapabilityResult | undefined;
  ocr?: ScreenshotAttachCapabilityResult | undefined;
  reconstruction?: ReconstructPageContextResult | undefined;
};

export type ServerOptions = {
  configPath: string;
  configDir: string;
  configLoaded: boolean;
  config?: ProtoBridgeConfig | undefined;
};

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
