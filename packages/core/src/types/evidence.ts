import type { RuntimePageProtocolPayload } from '../shared/protocols/runtime-page.js';
import type { MappingConfidence } from './common.js';

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
  kind: 'url' | 'route' | 'vue' | 'rendered-html' | 'screenshot';
  url?: string | undefined;
  route?: string | undefined;
  vuePath?: string | undefined;
  capturedAt?: string | undefined;
};

export type PageEvidenceProvenance = {
  source: 'dom' | 'runtime-metadata' | 'page-list' | 'ocr' | 'heuristic';
  fields: string[];
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

export type PageEvidence = {
  id: string;
  source: PageEvidenceSource;
  screenshot?: {
    path?: string | undefined;
    width: number;
    height: number;
  } | undefined;
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
  provenance: PageEvidenceProvenance[];
};

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

export type CapturePageEvidenceInput = {
  url: string;
  outDir: string;
  viewport?: { width: number; height: number; deviceScaleFactor?: number | undefined } | undefined;
  saveArtifacts?: boolean | undefined;
};

export type CapturePageEvidenceResult = {
  evidence: PageEvidence;
  capabilities: DetectedCapabilities;
  files: {
    pageEvidence: string;
    screenshot?: string | undefined;
  };
};
