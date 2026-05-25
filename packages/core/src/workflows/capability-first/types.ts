import type {
  AdapterProjectConfig,
  OcrTextBox,
  PageCanonical,
  PageOrchestrationTrace,
  UiBuildPlan,
} from '../../types/index.js';
import type {
  PageMergeCapabilityResult,
  RuntimeCaptureCapabilityResult,
  ScreenshotAttachCapabilityResult,
  SourceAnalyzeCapabilityResult,
  TargetInspectCapabilityResult,
  UiPlanCapabilityResult,
  UiReviewCapabilityResult,
} from '../../capabilities/index.js';
import type { ResolvedRestorationProfile } from '../../profile/index.js';

export type ReconstructPageContextInput = {
  source?: AdapterProjectConfig | undefined;
  target?: AdapterProjectConfig | undefined;
  route?: string | undefined;
  vue?: string | undefined;
  url?: string | undefined;
  screenshotPath?: string | undefined;
  ocrText?: string[] | undefined;
  ocrBoxes?: OcrTextBox[] | undefined;
  outDir: string;
  capture?: boolean | undefined;
  viewport?: { width: number; height: number; deviceScaleFactor?: number | undefined } | undefined;
  saveArtifacts?: boolean | undefined;
  targetModule?: string | undefined;
  restorationProfile?: ResolvedRestorationProfile | undefined;
  buildPlan?: boolean | undefined;
  buildReview?: boolean | undefined;
  trace?: boolean | undefined;
};

export type ReconstructPageContextResult = {
  page: PageCanonical;
  plan?: UiBuildPlan | undefined;
  markdown?: string | undefined;
  capabilities: {
    source?: SourceAnalyzeCapabilityResult | undefined;
    runtime?: RuntimeCaptureCapabilityResult | undefined;
    screenshot?: ScreenshotAttachCapabilityResult | undefined;
    target?: TargetInspectCapabilityResult | undefined;
    merge: PageMergeCapabilityResult;
    plan?: UiPlanCapabilityResult | undefined;
    review?: UiReviewCapabilityResult | undefined;
  };
  files: {
    pageCanonical: string;
    pageDebugIndex: string;
    screenshots: string[];
    uiBuildPlan?: string | undefined;
    uiBuildReview?: string | undefined;
  };
  warnings: string[];
  nextActions: string[];
  trace: PageOrchestrationTrace;
};
