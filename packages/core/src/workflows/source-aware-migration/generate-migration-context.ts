import path from 'node:path';
import type {
  CaptureResult,
  CapturePageEvidenceResult,
  GenerateMigrationSpecInput,
  MigrationContext,
} from '../../types/index.js';
import { defaultAdapterRegistry } from '../../adapters/registry.js';
import { capturePrototypePage } from '../../snapshot/browser-capture/capture-rendered-page.js';
import { capturePageEvidence } from '../ui-reconstruction/capture-page-evidence.js';

const DEFAULT_SOURCE_ADAPTER = 'vue3-prototype';
const DEFAULT_TARGET_ADAPTER = 'flutter-app';

export async function createMigrationContext(input: GenerateMigrationSpecInput): Promise<MigrationContext> {
  const sourceAdapter = defaultAdapterRegistry.getSource(input.source.adapter ?? DEFAULT_SOURCE_ADAPTER);
  const targetAdapter = defaultAdapterRegistry.getTarget(input.target.adapter ?? DEFAULT_TARGET_ADAPTER);

  const source = await sourceAdapter.analyze({
    prototypeRoot: input.source.root,
    route: input.route,
    vue: input.vue,
  });

  const [capture, pageCapture] = await Promise.all([
    maybeCapture(input),
    maybeCapturePageEvidence(input),
  ]);
  const tokenMap = targetAdapter.mapTokens({
    sourceCode: source.sourceCode,
  });
  const target = await targetAdapter.analyze({
    flutterRoot: input.target.root,
    prototypeModule: source.module,
    screenId: source.screenId,
    route: source.route,
  });

  return {
    source,
    capture,
    pageEvidence: pageCapture?.evidence,
    tokenMap,
    target,
    recommendations: targetAdapter.buildRecommendations({
      source,
      tokenMap,
      target,
      capture,
      pageEvidence: pageCapture?.evidence,
      captureSkipped: Boolean(!input.capture || !input.prototypeUrl),
    }),
  };
}

async function maybeCapture(input: GenerateMigrationSpecInput): Promise<CaptureResult | undefined> {
  if (!input.capture || !input.prototypeUrl) return undefined;

  try {
    return await capturePrototypePage({
      url: input.prototypeUrl,
      outDir: input.outDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      warnings: [`Playwright capture failed: ${message}`],
    };
  }
}

async function maybeCapturePageEvidence(input: GenerateMigrationSpecInput): Promise<CapturePageEvidenceResult | undefined> {
  if (!input.capture || !input.prototypeUrl) return undefined;

  try {
    return await capturePageEvidence({
      url: input.prototypeUrl,
      outDir: path.join(input.outDir, 'page-evidence'),
      saveArtifacts: true,
    });
  } catch {
    return undefined;
  }
}
