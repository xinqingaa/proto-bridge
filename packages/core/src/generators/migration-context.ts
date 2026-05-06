import type {
  CaptureResult,
  GenerateMigrationSpecInput,
  MigrationContext,
} from '../types/index.js';
import { defaultAdapterRegistry } from '../adapters/registry.js';
import { capturePrototypePage } from '../capture/playwright-capture.js';

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

  const capture = await maybeCapture(input);
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
    tokenMap,
    target,
    recommendations: targetAdapter.buildRecommendations({
      source,
      tokenMap,
      target,
      capture,
      captureSkipped: Boolean(input.noCapture || !input.prototypeUrl),
    }),
  };
}

async function maybeCapture(input: GenerateMigrationSpecInput): Promise<CaptureResult | undefined> {
  if (input.noCapture || !input.prototypeUrl) return undefined;

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
