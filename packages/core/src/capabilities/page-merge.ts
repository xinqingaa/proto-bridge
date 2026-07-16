import path from 'node:path';
import { writePageCanonicalFile } from '../artifacts/artifact-writer.js';
import type {
  DetectedCapabilities,
  OcrResult,
  PageCanonical,
  PageCanonicalMismatch,
  PageEvidenceProvenance,
  PageFieldPriorityRule,
  PageManualConfirmation,
  PageScreenshotArtifact,
} from '../types/index.js';
import type { PageMergeCapabilityInput, PageMergeCapabilityResult } from './types.js';

const EMPTY_CAPABILITIES: DetectedCapabilities = {
  runtimeMetadata: false,
  pageList: false,
  tabTraversal: false,
  assetExtraction: false,
  needsOcr: false,
  warnings: [],
};

export const HYBRID_FIELD_PRIORITY: PageFieldPriorityRule[] = [
  {
    field: 'module / screenId / semantic section / interaction intent / state space',
    priority: ['source', 'runtime', 'screenshot', 'target'],
    reason: 'Source is best at expressing design intent, semantic structure, and latent states.',
  },
  {
    field: 'visible / bbox / computed style / actual active state / actual visible text',
    priority: ['runtime', 'screenshot', 'source', 'target'],
    reason: 'Runtime capture reflects the current rendered page and viewport-specific facts.',
  },
  {
    field: 'pixel appearance / OCR text / visual comparison',
    priority: ['screenshot', 'runtime', 'source', 'target'],
    reason: 'Screenshot and OCR are the final visual evidence and text fallback.',
  },
  {
    field: 'component reuse / theme target / file tree / route placement',
    priority: ['target', 'source', 'runtime', 'screenshot'],
    reason: 'Target repo conventions decide what should be reused or where new Flutter code should live.',
  },
];

export async function mergePageCapability(input: PageMergeCapabilityInput): Promise<PageMergeCapabilityResult> {
  const mergedAt = new Date().toISOString();
  const runtimePage = input.runtime?.page;
  const source = input.source?.source;
  const target = input.target?.target;
  const screenshotArtifact = input.screenshot ? buildScreenshotArtifact(input.screenshot.screenshotPath) : undefined;
  const pageId = runtimePage?.pageId ?? createSourcePageId(source?.route ?? source?.vuePath ?? screenshotArtifact?.path ?? target?.suggestedModule ?? 'page', mergedAt);
  const pageCanonicalPath = path.join(input.outDir, 'page-canonical.json');
  const screenshots = mergeScreenshots(runtimePage?.screenshots ?? [], screenshotArtifact);
  const ocr = mergeOcr(runtimePage?.ocr, input.screenshot?.ocr);
  const warnings = dedupe([
    ...(runtimePage?.warnings ?? []),
    ...(input.source?.warnings ?? []),
    ...(input.screenshot?.ocr.warnings ?? []),
    ...(input.target?.warnings ?? []),
  ]);
  const mismatches = buildMismatches(input);
  const manualConfirmations = buildManualConfirmations(mismatches);
  const provenance = buildProvenance(input);
  const selectedCapabilities = [
    ...(input.source ? ['source.analyze' as const] : []),
    ...(input.runtime ? ['runtime.capture' as const] : []),
    ...(input.screenshot ? ['screenshot.attach' as const] : []),
    ...(input.target ? ['target.inspect' as const] : []),
    'page.merge' as const,
  ];
  const strategy = inferMergeStrategy(Boolean(input.source), Boolean(input.runtime), Boolean(input.screenshot));

  const page: PageCanonical = {
    ...(runtimePage ?? emptyPageCanonical(pageId, input.outDir)),
    schemaVersion: 3,
    id: pageId,
    pageId,
    source: {
      kind: input.source && input.runtime ? 'hybrid' : runtimePage?.source.kind ?? (source?.vuePath ? 'vue' : source?.route ? 'route' : 'hybrid'),
      url: runtimePage?.source.url,
      route: source?.route ?? runtimePage?.page.route ?? runtimePage?.source.route,
      vuePath: source?.vuePath,
      capturedAt: runtimePage?.source.capturedAt,
    },
    sourceFacts: source ? {
      adapter: 'vue3-prototype',
      root: source.prototypeRoot,
      route: source.route,
      vuePath: source.vuePath,
      analyzedAt: mergedAt,
      analysis: source,
      warnings: input.source?.warnings ?? [],
    } : undefined,
    runtimeFacts: input.runtime ? {
      url: input.runtime.page.source.url ?? input.runtime.page.source.route ?? '',
      capturedAt: input.runtime.page.source.capturedAt,
      viewport: input.runtime.page.viewport,
      screenshotPaths: screenshots.map((screenshot) => screenshot.path),
      sectionCount: input.runtime.page.sections.length,
      nodeCount: input.runtime.page.nodes.length,
      textCount: input.runtime.page.text.length,
      assetCount: input.runtime.page.assets.length,
      interactionCount: input.runtime.page.interactions.length,
      warnings: input.runtime.page.warnings,
    } : undefined,
    screenshotFacts: screenshots.length > 0 || ocr ? {
      screenshotPaths: screenshots.map((screenshot) => screenshot.path),
      ocr,
      warnings: ocr?.warnings ?? [],
    } : undefined,
    targetFacts: target ? {
      adapter: 'flutter-app',
      root: target.flutterRoot,
      inspectedAt: mergedAt,
      analysis: target,
      warnings: input.target?.warnings ?? [],
    } : undefined,
    page: {
      title: source?.title ?? source?.label ?? runtimePage?.page.title,
      route: source?.route ?? runtimePage?.page.route,
    },
    capabilities: runtimePage?.capabilities ?? EMPTY_CAPABILITIES,
    text: dedupe([...(runtimePage?.text ?? []), ...(input.screenshot?.ocr.text ?? [])]),
    ocr,
    warnings,
    mismatches: [...(runtimePage?.mismatches ?? []), ...mismatches],
    artifacts: {
      rootDir: input.outDir,
      pageCanonical: pageCanonicalPath,
      uiBuildPlan: runtimePage?.artifacts.uiBuildPlan,
      uiBuildReview: runtimePage?.artifacts.uiBuildReview,
      screenshots,
    },
    provenance,
    merge: {
      strategy,
      selectedCapabilities,
      mergedAt,
      sources: {
        source: Boolean(input.source),
        runtime: Boolean(input.runtime),
        screenshot: screenshots.length > 0 || Boolean(input.screenshot),
        target: Boolean(input.target),
      },
      warnings,
      manualConfirmations,
      trace: input.trace,
    },
    orchestrationTrace: input.trace,
    fieldPriority: HYBRID_FIELD_PRIORITY,
    manualConfirmations,
  };

  await writePageCanonicalFile(pageCanonicalPath, page);

  return {
    capability: 'page.merge',
    page,
    files: {
      pageCanonical: pageCanonicalPath,
      screenshots: screenshots.map((screenshot) => screenshot.path),
    },
    warnings,
  };
}

function emptyPageCanonical(pageId: string, outDir: string): PageCanonical {
  return {
    id: pageId,
    pageId,
    source: { kind: 'hybrid' },
    screenshots: [],
    page: {},
    sections: [],
    nodes: [],
    text: [],
    assets: [],
    interactions: [],
    capabilities: EMPTY_CAPABILITIES,
    warnings: [],
    mismatches: [],
    artifacts: {
      rootDir: outDir,
      pageCanonical: path.join(outDir, 'page-canonical.json'),
      screenshots: [],
    },
    provenance: [],
  };
}

function buildProvenance(input: PageMergeCapabilityInput): PageEvidenceProvenance[] {
  return [
    ...(input.source ? [{
      source: 'source-analysis' as const,
      fields: ['sourceFacts', 'page.title', 'page.route', 'semantic structure', 'state space', 'interactions'],
    }] : []),
    ...(input.runtime ? [{
      source: 'runtime-capture' as const,
      fields: ['runtimeFacts', 'sections', 'nodes', 'text', 'tokens', 'assets', 'interactions', 'screenshots'],
    }] : []),
    ...(input.screenshot ? [{
      source: 'screenshot-attach' as const,
      fields: ['screenshotFacts', 'ocr', 'text', 'screenshots'],
    }] : []),
    ...(input.target ? [{
      source: 'target-inspect' as const,
      fields: ['targetFacts', 'module', 'routes', 'theme', 'components', 'examples'],
    }] : []),
    {
      source: 'page-merge' as const,
      fields: ['fieldPriority', 'mismatches', 'manualConfirmations'],
    },
  ];
}

function buildMismatches(input: PageMergeCapabilityInput): PageCanonicalMismatch[] {
  const source = input.source?.source;
  const runtime = input.runtime?.page;
  const mismatches: PageCanonicalMismatch[] = [];
  if (source?.route && runtime?.page.route && normalizeRoute(source.route) !== normalizeRoute(runtime.page.route)) {
    mismatches.push({
      kind: 'source-runtime',
      severity: 'warning',
      message: `Source route (${source.route}) differs from runtime route (${runtime.page.route}).`,
      evidence: ['source.route', 'runtime.page.route'],
    });
  }
  if (source && runtime && runtime.sections.length === 0 && (source.sfc?.sections.length ?? 0) > 0) {
    mismatches.push({
      kind: 'source-runtime',
      severity: 'warning',
      message: 'Source has semantic sections but runtime capture produced no visual sections.',
      evidence: ['source.sfc.sections', 'runtime.sections'],
    });
  }
  if (input.target?.target.suggestedModule && source?.module && input.target.target.suggestedModule !== source.module) {
    mismatches.push({
      kind: 'target-convention',
      severity: 'info',
      message: `Target suggested module (${input.target.target.suggestedModule}) differs from source module (${source.module}).`,
      evidence: ['target.suggestedModule', 'source.module'],
    });
  }
  const routeMapping = input.target?.target.routeMapping;
  if (routeMapping?.unresolved) {
    mismatches.push({
      kind: 'route-mapping',
      severity: 'warning',
      message: `No target route registry entry matched source route (${routeMapping.sourceRoute ?? source?.route ?? 'unknown'}).`,
      evidence: routeMapping.evidence,
    });
  } else if (routeMapping?.targetModule && source?.module && routeMapping.targetModule !== source.module) {
    mismatches.push({
      kind: 'route-mapping',
      severity: 'info',
      message: `Target route module (${routeMapping.targetModule}) differs from source module (${source.module}).`,
      evidence: routeMapping.evidence,
    });
  }
  for (const intentMapping of input.target?.target.routeIntentMappings ?? []) {
    if (!intentMapping.unresolved) continue;
    mismatches.push({
      kind: 'route-mapping',
      severity: 'warning',
      message: `No target route registry entry matched source navigation target (${intentMapping.sourceRoute ?? 'unknown'}).`,
      evidence: intentMapping.evidence,
    });
  }
  return mismatches;
}

function buildManualConfirmations(mismatches: PageCanonicalMismatch[]): PageManualConfirmation[] {
  return mismatches.map((mismatch, index) => ({
    id: `confirm-${index + 1}`,
    question: mismatch.message,
    severity: mismatch.severity,
    evidence: mismatch.evidence,
    status: 'open',
  }));
}

function inferMergeStrategy(
  hasSource: boolean,
  hasRuntime: boolean,
  hasScreenshot: boolean,
): PageMergeCapabilityResult['page']['merge'] extends { strategy: infer T } ? T : never {
  if (hasSource && hasRuntime) return 'source-runtime' as never;
  if (hasSource) return 'source-only' as never;
  if (hasRuntime) return 'runtime-only' as never;
  if (hasScreenshot) return 'screenshot-only' as never;
  return 'hybrid' as never;
}

function buildScreenshotArtifact(screenshotPath: string): PageScreenshotArtifact {
  return {
    name: path.basename(screenshotPath, path.extname(screenshotPath)) || 'attached-screenshot',
    path: screenshotPath,
    width: 0,
    height: 0,
    kind: 'unknown',
  };
}

function mergeScreenshots(
  runtimeScreenshots: PageScreenshotArtifact[],
  attached: PageScreenshotArtifact | undefined,
): PageScreenshotArtifact[] {
  if (!attached) return runtimeScreenshots;
  if (runtimeScreenshots.some((screenshot) => path.resolve(screenshot.path) === path.resolve(attached.path))) {
    return runtimeScreenshots;
  }
  return [...runtimeScreenshots, attached];
}

function mergeOcr(runtimeOcr: OcrResult | undefined, attachedOcr: OcrResult | undefined): OcrResult | undefined {
  if (!runtimeOcr) return attachedOcr;
  if (!attachedOcr) return runtimeOcr;
  return {
    provider: attachedOcr.provider === 'external' ? attachedOcr.provider : runtimeOcr.provider,
    status: runtimeOcr.status === 'available' || attachedOcr.status === 'available' ? 'available' : 'unavailable',
    text: dedupe([...runtimeOcr.text, ...attachedOcr.text]),
    boxes: [...runtimeOcr.boxes, ...attachedOcr.boxes],
    warnings: dedupe([...runtimeOcr.warnings, ...attachedOcr.warnings]),
  };
}

function createSourcePageId(seed: string, timestamp: string): string {
  return `page-${sanitize(seed)}-${timestamp.replace(/[^0-9a-z]/gi, '').slice(0, 14)}`;
}

function sanitize(value: string): string {
  return value
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48)
    || 'page';
}

function normalizeRoute(value: string): string {
  return value.replace(/\/+$/g, '').toLowerCase();
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}
