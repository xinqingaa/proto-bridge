import type {
  CapturePageCanonicalInput,
  CapturePageCanonicalResult,
  OcrScreenshotInput,
  OcrScreenshotResult,
  GenerateMigrationSpecInput,
  PageCanonical,
  PageCapabilityName,
  UiBuildPlan,
  ExportUiReviewResult,
  FlutterContextAnalysis,
  PrototypePageAnalysis,
} from '../types/index.js';

export type CapabilityDescriptor = {
  name: PageCapabilityName;
  description: string;
  reads: string[];
  writes: string[];
};

export type SourceAnalyzeCapabilityInput = Pick<GenerateMigrationSpecInput, 'source' | 'route' | 'vue'>;

export type SourceAnalyzeCapabilityResult = {
  capability: 'source.analyze';
  source: PrototypePageAnalysis;
  warnings: string[];
};

export type RuntimeCaptureCapabilityInput = CapturePageCanonicalInput;

export type RuntimeCaptureCapabilityResult = CapturePageCanonicalResult & {
  capability: 'runtime.capture';
};

export type ScreenshotAttachCapabilityInput = OcrScreenshotInput;

export type ScreenshotAttachCapabilityResult = OcrScreenshotResult & {
  capability: 'screenshot.attach';
  screenshotPath: string;
};

export type TargetInspectCapabilityInput = {
  target: GenerateMigrationSpecInput['target'];
  prototypeModule?: string | undefined;
  screenId?: string | undefined;
  route?: string | undefined;
  targetModule?: string | undefined;
};

export type TargetInspectCapabilityResult = {
  capability: 'target.inspect';
  target: FlutterContextAnalysis;
  warnings: string[];
};

export type PageMergeCapabilityInput = {
  outDir: string;
  source?: SourceAnalyzeCapabilityResult | undefined;
  runtime?: RuntimeCaptureCapabilityResult | undefined;
  screenshot?: ScreenshotAttachCapabilityResult | undefined;
  target?: TargetInspectCapabilityResult | undefined;
  trace?: import('../types/index.js').PageOrchestrationTrace | undefined;
};

export type PageMergeCapabilityResult = {
  capability: 'page.merge';
  page: PageCanonical;
  files: {
    pageCanonical: string;
    pageDebugIndex: string;
    screenshots: string[];
  };
  warnings: string[];
};

export type UiPlanCapabilityResult = {
  capability: 'ui.plan';
  plan: UiBuildPlan;
  files: {
    uiBuildPlan: string;
  };
  warnings: string[];
};

export type UiReviewCapabilityResult = ExportUiReviewResult & {
  capability: 'ui.review';
  warnings: string[];
};

export const capabilityDescriptors: CapabilityDescriptor[] = [
  {
    name: 'source.analyze',
    description: 'Analyze local prototype source for semantic structure, state space, interactions, routes, assets, and style token intent.',
    reads: ['source root', 'route or vue path'],
    writes: ['sourceFacts'],
  },
  {
    name: 'runtime.capture',
    description: 'Capture the rendered page for visible DOM, computed style, bbox, runtime metadata, assets, interactions, and screenshots.',
    reads: ['url'],
    writes: ['runtimeFacts', 'screenshots', 'page-canonical.json'],
  },
  {
    name: 'screenshot.attach',
    description: 'Attach screenshot/OCR evidence as visual confirmation and fallback text evidence.',
    reads: ['screenshot path', 'OCR payload'],
    writes: ['screenshotFacts', 'ocr-result.json'],
  },
  {
    name: 'target.inspect',
    description: 'Inspect the target Flutter app for module, route, theme, component, asset, i18n, and example conventions.',
    reads: ['target root'],
    writes: ['targetFacts'],
  },
  {
    name: 'page.merge',
    description: 'Merge source, runtime, screenshot, and target facts into the hybrid PageCanonical with field-level priority and mismatch warnings.',
    reads: ['sourceFacts', 'runtimeFacts', 'screenshotFacts', 'targetFacts'],
    writes: ['page-canonical.json', 'page-debug-index.json'],
  },
  {
    name: 'ui.plan',
    description: 'Build ui-build-plan.json from the unified PageCanonical regardless of which facts produced it.',
    reads: ['page-canonical.json', 'targetFacts'],
    writes: ['ui-build-plan.json'],
  },
  {
    name: 'ui.review',
    description: 'Build ui-build-review.md as the primary human-readable projection, enhanced by source facts when present.',
    reads: ['page-canonical.json', 'ui-build-plan.json'],
    writes: ['ui-build-review.md'],
  },
  {
    name: 'ui.validate',
    description: 'Validate target changes against the unified PageCanonical and ui-build-plan.json.',
    reads: ['target diff', 'page-canonical.json', 'ui-build-plan.json'],
    writes: ['validation result'],
  },
];
