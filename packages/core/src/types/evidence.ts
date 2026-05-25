import type { RuntimePageProtocolPayload } from '../shared/protocols/runtime-page.js';
import type { MappingConfidence } from './common.js';
import type { MigrationContext } from './planning.js';
import type { PrototypePageAnalysis } from './source.js';
import type { FlutterContextAnalysis } from './target-flutter.js';

export type DomNodeSnapshot = {
  tag: string;
  className?: string | undefined;
  id?: string | undefined;
  text?: string | undefined;
  role?: string | undefined;
  bbox?: { x: number; y: number; width: number; height: number } | undefined;
  computedStyle?: {
    display?: string | undefined;
    position?: string | undefined;
    flexDirection?: string | undefined;
    flexWrap?: string | undefined;
    alignItems?: string | undefined;
    justifyContent?: string | undefined;
    gap?: string | undefined;
    padding?: string | undefined;
    margin?: string | undefined;
    color?: string | undefined;
    backgroundColor?: string | undefined;
    fontSize?: string | undefined;
    fontWeight?: string | undefined;
    lineHeight?: string | undefined;
    borderRadius?: string | undefined;
    overflow?: string | undefined;
    whiteSpace?: string | undefined;
    minWidth?: string | undefined;
    maxWidth?: string | undefined;
  } | undefined;
  children?: DomNodeSnapshot[] | undefined;
};

export type CapturePrototypePageInput = {
  url: string;
  outDir: string;
  viewport?: { width: number; height: number } | undefined;
};

export type CaptureResult = {
  screenshotPath?: string | undefined;
  domSnapshotPath?: string | undefined;
  viewport?: { width: number; height: number } | undefined;
  domTree?: DomNodeSnapshot[] | undefined;
  warnings: string[];
};

export type SnapshotSourceKind = 'url' | 'rendered-html' | 'screenshot';

export type PageFactKind = 'source' | 'runtime' | 'screenshot' | 'target';

export type PageCapabilityName =
  | 'source.analyze'
  | 'runtime.capture'
  | 'screenshot.attach'
  | 'target.inspect'
  | 'page.merge'
  | 'ui.plan'
  | 'ui.review'
  | 'ui.validate';

export type SnapshotNodeRole =
  | 'app-bar'
  | 'tab-bar'
  | 'section'
  | 'card'
  | 'list'
  | 'list-item'
  | 'button'
  | 'input'
  | 'image'
  | 'icon'
  | 'bottom-bar'
  | 'modal'
  | 'text'
  | 'unknown';

export type SnapshotComputedStyle = {
  display?: string | undefined;
  position?: string | undefined;
  flexDirection?: string | undefined;
  flexWrap?: string | undefined;
  alignItems?: string | undefined;
  justifyContent?: string | undefined;
  gap?: string | undefined;
  padding?: string | undefined;
  margin?: string | undefined;
  color?: string | undefined;
  backgroundColor?: string | undefined;
  fontFamily?: string | undefined;
  fontSize?: string | undefined;
  fontWeight?: string | undefined;
  lineHeight?: string | undefined;
  borderRadius?: string | undefined;
  border?: string | undefined;
  boxShadow?: string | undefined;
  overflow?: string | undefined;
  whiteSpace?: string | undefined;
  minWidth?: string | undefined;
  maxWidth?: string | undefined;
};

export type PageSnapshotNode = {
  id: string;
  parentId?: string | undefined;
  role: SnapshotNodeRole;
  tag?: string | undefined;
  text?: string | undefined;
  bbox: { x: number; y: number; width: number; height: number };
  computedStyle?: SnapshotComputedStyle | undefined;
  cssVarRefs?: string[] | undefined;
  assetRefs?: string[] | undefined;
  children: string[];
  evidence: string[];
};

export type VisualSection = {
  id: string;
  role: SnapshotNodeRole;
  title?: string | undefined;
  bbox: { x: number; y: number; width: number; height: number };
  nodeIds: string[];
  evidence: string[];
};

export type VisualTokenEvidence = {
  kind: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'border';
  source: string;
  value: string;
  cssVar?: string | undefined;
  usage: string[];
  candidateTarget?: string | undefined;
  confidence: MappingConfidence;
};

export type AssetEvidence = {
  id: string;
  kind: 'image' | 'svg' | 'background' | 'icon' | 'unknown';
  source?: string | undefined;
  nodeId?: string | undefined;
  bbox?: { x: number; y: number; width: number; height: number } | undefined;
  evidence: string[];
};

export type InteractionEvidence = {
  id: string;
  kind: 'tap' | 'input' | 'link' | 'tab' | 'unknown';
  nodeId: string;
  label?: string | undefined;
  evidence: string[];
};

export type OcrTextBox = {
  text: string;
  bbox?: { x: number; y: number; width: number; height: number } | undefined;
  confidence?: number | undefined;
};

export type OcrResult = {
  provider: 'none' | 'external';
  status: 'available' | 'unavailable';
  text: string[];
  boxes: OcrTextBox[];
  warnings: string[];
};

export type DetectedCapabilities = {
  runtimeMetadata: boolean;
  pageList: boolean;
  tabTraversal: boolean;
  assetExtraction: boolean;
  needsOcr: boolean;
  warnings: string[];
};

export type PageEvidenceSource = {
  kind: 'url' | 'route' | 'vue' | 'rendered-html' | 'screenshot' | 'hybrid';
  url?: string | undefined;
  route?: string | undefined;
  vuePath?: string | undefined;
  capturedAt?: string | undefined;
};

export type PageEvidenceProvenance = {
  source:
    | 'dom'
    | 'runtime-metadata'
    | 'page-list'
    | 'ocr'
    | 'heuristic'
    | 'source-analysis'
    | 'runtime-capture'
    | 'screenshot-attach'
    | 'target-inspect'
    | 'page-merge';
  fields: string[];
};

export type PageScreenshotArtifact = {
  name: string;
  path: string;
  width: number;
  height: number;
  kind: 'viewport' | 'full-page' | 'state' | 'unknown';
};

export type PageCanonicalMismatch = {
  kind: 'source-runtime' | 'runtime-visual' | 'ocr-visual' | 'target-convention' | 'route-mapping' | 'unknown';
  message: string;
  severity: 'info' | 'warning' | 'error';
  evidence: string[];
};

export type PageFieldPriorityRule = {
  field: string;
  priority: PageFactKind[];
  reason: string;
};

export type PageManualConfirmation = {
  id: string;
  question: string;
  severity: 'info' | 'warning' | 'error';
  evidence: string[];
  status: 'open' | 'resolved';
};

export type HybridPageSourceFacts = {
  adapter: string;
  root: string;
  route?: string | undefined;
  vuePath?: string | undefined;
  analyzedAt: string;
  analysis: PrototypePageAnalysis;
  migrationContext?: MigrationContext | undefined;
  warnings: string[];
};

export type HybridPageRuntimeFacts = {
  url: string;
  capturedAt?: string | undefined;
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number | undefined;
  } | undefined;
  screenshotPaths: string[];
  sectionCount: number;
  nodeCount: number;
  textCount: number;
  assetCount: number;
  interactionCount: number;
  warnings: string[];
};

export type HybridPageScreenshotFacts = {
  screenshotPaths: string[];
  ocr?: OcrResult | undefined;
  warnings: string[];
};

export type HybridPageTargetFacts = {
  adapter: string;
  root: string;
  inspectedAt: string;
  analysis: FlutterContextAnalysis;
  warnings: string[];
};

export type PageMergeSummary = {
  strategy: 'source-only' | 'runtime-only' | 'source-runtime' | 'screenshot-only' | 'hybrid';
  selectedCapabilities: PageCapabilityName[];
  mergedAt: string;
  sources: Partial<Record<PageFactKind, boolean>>;
  warnings: string[];
  manualConfirmations: PageManualConfirmation[];
  trace?: PageOrchestrationTrace | undefined;
};

export type PageOrchestrationTraceStep = {
  capability: PageCapabilityName;
  status: 'selected' | 'skipped' | 'completed';
  reason: string;
};

export type PageOrchestrationTrace = {
  temporary: true;
  input: {
    hasSource: boolean;
    hasRoute: boolean;
    hasVue: boolean;
    hasUrl: boolean;
    hasScreenshot?: boolean | undefined;
    hasOcr?: boolean | undefined;
    hasTarget: boolean;
    captureRequested: boolean;
    runtimeUrl?: string | undefined;
  };
  steps: PageOrchestrationTraceStep[];
  artifacts: string[];
};

export type PageCanonicalArtifactIndex = {
  rootDir: string;
  pageCanonical: string;
  pageDebugIndex?: string | undefined;
  uiBuildPlan?: string | undefined;
  uiBuildReview?: string | undefined;
  screenshots: PageScreenshotArtifact[];
};

export type PageComponentHint = {
  kind: 'runtime-metadata' | 'page-list' | 'heuristic';
  hint: string;
  confidence: MappingConfidence;
  evidence: string[];
};

export type PageTabState = {
  id: string;
  label?: string | undefined;
  nodeId?: string | undefined;
  state: 'active' | 'inactive' | 'unknown';
  evidence: string[];
};

export type PageCanonical = {
  schemaVersion?: number | undefined;
  id: string;
  pageId: string;
  source: PageEvidenceSource;
  sourceFacts?: HybridPageSourceFacts | undefined;
  runtimeFacts?: HybridPageRuntimeFacts | undefined;
  screenshotFacts?: HybridPageScreenshotFacts | undefined;
  targetFacts?: HybridPageTargetFacts | undefined;
  merge?: PageMergeSummary | undefined;
  orchestrationTrace?: PageOrchestrationTrace | undefined;
  fieldPriority?: PageFieldPriorityRule[] | undefined;
  manualConfirmations?: PageManualConfirmation[] | undefined;
  screenshot?: {
    path?: string | undefined;
    width: number;
    height: number;
  } | undefined;
  screenshots: PageScreenshotArtifact[];
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number | undefined;
  } | undefined;
  page: {
    title?: string | undefined;
    route?: string | undefined;
  };
  cssVariables?: Record<string, string> | undefined;
  sections: VisualSection[];
  nodes: PageSnapshotNode[];
  text: string[];
  assets: AssetEvidence[];
  interactions: InteractionEvidence[];
  tokens?: VisualTokenEvidence[] | undefined;
  componentHints?: PageComponentHint[] | undefined;
  tabStates?: PageTabState[] | undefined;
  capabilities: DetectedCapabilities;
  runtime?: RuntimePageProtocolPayload | undefined;
  ocr?: OcrResult | undefined;
  warnings: string[];
  mismatches: PageCanonicalMismatch[];
  artifacts: PageCanonicalArtifactIndex;
  provenance: PageEvidenceProvenance[];
};

export type PageEvidence = PageCanonical;

export type OcrScreenshotInput = {
  screenshotPath: string;
  outDir: string;
  externalText?: string[] | undefined;
  externalBoxes?: OcrTextBox[] | undefined;
};

export type OcrScreenshotResult = {
  ocr: OcrResult;
  files: {
    ocrResult: string;
  };
};

export type AttachScreenshotOcrInput = OcrScreenshotInput;
export type AttachScreenshotOcrResult = OcrScreenshotResult;

export type CapturePageCanonicalInput = {
  url: string;
  outDir: string;
  viewport?: { width: number; height: number; deviceScaleFactor?: number | undefined } | undefined;
  saveArtifacts?: boolean | undefined;
};

export type CapturePageCanonicalResult = {
  page: PageCanonical;
  capabilities: DetectedCapabilities;
  files: {
    pageCanonical: string;
    pageDebugIndex: string;
    screenshots: string[];
  };
};

export type CapturePageEvidenceInput = CapturePageCanonicalInput;
export type CapturePageEvidenceResult = CapturePageCanonicalResult;
