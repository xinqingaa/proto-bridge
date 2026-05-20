import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { writeJsonFile, writeTextFile } from '../../artifacts/artifact-writer.js';
import {
  analyzeSourceCapability,
  attachScreenshotCapability,
  captureRuntimeCapability,
  inspectTargetCapability,
  mergePageCapability,
  planUiCapability,
  reviewUiCapability,
} from '../../capabilities/index.js';
import type { CaptureResult, PageCapabilityName, PageOrchestrationTrace, PageOrchestrationTraceStep } from '../../types/index.js';
import { renderSourceAwareBrief } from './source-brief.js';
import type { ReconstructPageContextInput, ReconstructPageContextResult } from './types.js';

export async function reconstructPageContext(
  input: ReconstructPageContextInput,
): Promise<ReconstructPageContextResult> {
  const outDir = path.resolve(input.outDir);
  await mkdir(outDir, { recursive: true });
  const runtimeUrl = input.url;
  const shouldCapture = Boolean(runtimeUrl && (input.capture ?? Boolean(input.url)));
  const traceSteps: PageOrchestrationTraceStep[] = [];
  const traceInput = {
    hasSource: Boolean(input.source),
    hasRoute: Boolean(input.route),
    hasVue: Boolean(input.vue),
    hasUrl: Boolean(input.url),
    hasScreenshot: Boolean(input.screenshotPath),
    hasOcr: Boolean(input.ocrText?.length || input.ocrBoxes?.length),
    hasTarget: Boolean(input.target),
    captureRequested: Boolean(input.capture ?? Boolean(input.url)),
    runtimeUrl,
  };

  const sourceInput = input.source;
  const targetInput = input.target;

  const source = sourceInput
    ? await runTraced(traceSteps, 'source.analyze', 'source input was provided', () => analyzeSourceCapability({
      source: sourceInput,
      route: input.route,
      vue: input.vue,
    }))
    : undefined;
  if (!sourceInput) traceSteps.push(skipped('source.analyze', 'source input was not provided'));

  const runtime = shouldCapture && runtimeUrl
    ? await runTraced(traceSteps, 'runtime.capture', 'runtime URL and capture request were provided', () => captureRuntimeCapability({
      url: runtimeUrl,
      outDir,
      viewport: input.viewport,
      saveArtifacts: input.saveArtifacts ?? true,
    }))
    : undefined;
  if (!shouldCapture) {
    traceSteps.push(skipped(
      'runtime.capture',
      runtimeUrl ? 'capture was disabled for the available runtime URL' : 'runtime URL was not provided',
    ));
  }

  const screenshotPath = input.screenshotPath ?? runtime?.files.screenshots[0];
  const shouldAttachScreenshot = Boolean(input.screenshotPath || input.ocrText?.length || input.ocrBoxes?.length);
  const screenshot = shouldAttachScreenshot && screenshotPath
    ? await runTraced(traceSteps, 'screenshot.attach', 'screenshot path or OCR input was provided', () => attachScreenshotCapability({
      screenshotPath,
      outDir,
      externalText: input.ocrText,
      externalBoxes: input.ocrBoxes,
    }))
    : undefined;
  if (!shouldAttachScreenshot) {
    traceSteps.push(skipped('screenshot.attach', 'screenshot/OCR input was not provided'));
  } else if (!screenshotPath) {
    traceSteps.push(skipped('screenshot.attach', 'screenshot/OCR input was provided but no screenshot path was available'));
  }

  const target = targetInput
    ? await runTraced(traceSteps, 'target.inspect', 'target input was provided', () => inspectTargetCapability({
      target: targetInput,
      prototypeModule: source?.source.module,
      screenId: source?.source.screenId,
      route: source?.source.route ?? input.route,
      targetModule: input.targetModule,
    }))
    : undefined;
  if (!targetInput) traceSteps.push(skipped('target.inspect', 'target input was not provided'));

  traceSteps.push(selected('page.merge', 'canonical merge always runs after fact collection'));
  const initialTrace = buildTrace(traceInput, traceSteps, []);

  const merge = await mergePageCapability({
    outDir,
    source,
    runtime,
    screenshot,
    target,
    trace: initialTrace,
  });
  traceSteps.push(completed('page.merge', 'hybrid canonical was written'));

  const sourceBrief = source && target
    ? renderSourceAwareBrief({
      source: source.source,
      target: target.target,
      capture: runtime ? runtimeCaptureToLegacyCapture(runtime) : undefined,
      targetAdapter: input.target?.adapter,
    })
    : undefined;

  const shouldBuildPlan = Boolean(input.buildPlan ?? targetInput);
  const plan = shouldBuildPlan && targetInput
    ? await runTraced(traceSteps, 'ui.plan', 'buildPlan is enabled and target input was provided', () => planUiCapability({
      page: merge.page,
      targetRoot: targetInput.root,
      outDir,
      targetModule: input.targetModule,
      sourceAwareImplementationPlan: sourceBrief?.context.recommendations.implementationPlan,
      sourceReview: sourceBrief?.review,
    }))
    : undefined;
  if (!shouldBuildPlan || !targetInput) {
    traceSteps.push(skipped('ui.plan', !shouldBuildPlan ? 'buildPlan was disabled' : 'target input was not provided'));
  }

  const shouldWriteMigrationSpec = Boolean(sourceBrief && (input.sourceBrief ?? true));
  const migrationSpecPath = shouldWriteMigrationSpec ? path.join(outDir, 'migration-spec.md') : undefined;
  if (migrationSpecPath && sourceBrief) {
    await writeTextFile(migrationSpecPath, sourceBrief.markdown);
  }

  const review = plan && (input.buildReview ?? true)
    ? await runTraced(traceSteps, 'ui.review', 'buildReview is enabled and ui.plan completed', () => reviewUiCapability({
      page: merge.page,
      plan: plan.plan,
      outDir,
      sourceBriefMarkdown: sourceBrief?.markdown,
      sourceReview: sourceBrief?.review,
    }))
    : undefined;
  if (!plan || !(input.buildReview ?? true)) {
    traceSteps.push(skipped('ui.review', !plan ? 'ui.plan did not run' : 'buildReview was disabled'));
  }

  const page = review
    ? {
      ...merge.page,
      artifacts: {
        ...merge.page.artifacts,
        uiBuildPlan: plan?.files.uiBuildPlan,
        uiBuildReview: review.files.uiBuildReview,
      },
    }
    : plan
      ? {
        ...merge.page,
        artifacts: {
          ...merge.page.artifacts,
          uiBuildPlan: plan.files.uiBuildPlan,
        },
      }
      : merge.page;
  const artifacts = [
    merge.files.pageCanonical,
    merge.files.pageDebugIndex,
    ...merge.files.screenshots,
    ...(plan?.files.uiBuildPlan ? [plan.files.uiBuildPlan] : []),
    ...(review?.files.uiBuildReview ? [review.files.uiBuildReview] : []),
    ...(migrationSpecPath ? [migrationSpecPath] : []),
  ];
  const trace = buildTrace(traceInput, traceSteps, artifacts);
  const pageWithTrace = {
    ...page,
    orchestrationTrace: trace,
    merge: page.merge ? {
      ...page.merge,
      trace,
    } : page.merge,
  };
  await writeJsonFile(merge.files.pageCanonical, pageWithTrace);

  const warnings = dedupe([
    ...merge.warnings,
    ...(plan?.warnings ?? []),
    ...(review?.warnings ?? []),
  ]);

  return {
    page: pageWithTrace,
    plan: plan?.plan,
    markdown: review?.markdown,
    capabilities: {
      source,
      runtime,
      screenshot,
      target,
      merge: {
        ...merge,
        page: pageWithTrace,
      },
      plan,
      review,
    },
    files: {
      pageCanonical: merge.files.pageCanonical,
      pageDebugIndex: merge.files.pageDebugIndex,
      screenshots: merge.files.screenshots,
      uiBuildPlan: plan?.files.uiBuildPlan,
      uiBuildReview: review?.files.uiBuildReview,
      migrationSpec: migrationSpecPath,
    },
    warnings,
    nextActions: buildNextActions(Boolean(plan), Boolean(review), Boolean(migrationSpecPath)),
    trace,
  };
}

async function runTraced<T>(
  steps: PageOrchestrationTraceStep[],
  capability: PageCapabilityName,
  reason: string,
  callback: () => Promise<T>,
): Promise<T> {
  steps.push(selected(capability, reason));
  const result = await callback();
  steps.push(completed(capability, 'capability completed successfully'));
  return result;
}

function selected(capability: PageCapabilityName, reason: string): PageOrchestrationTraceStep {
  return { capability, status: 'selected', reason };
}

function completed(capability: PageCapabilityName, reason: string): PageOrchestrationTraceStep {
  return { capability, status: 'completed', reason };
}

function skipped(capability: PageCapabilityName, reason: string): PageOrchestrationTraceStep {
  return { capability, status: 'skipped', reason };
}

function buildTrace(
  input: PageOrchestrationTrace['input'],
  steps: PageOrchestrationTraceStep[],
  artifacts: string[],
): PageOrchestrationTrace {
  return {
    temporary: true,
    input,
    steps,
    artifacts,
  };
}

function runtimeCaptureToLegacyCapture(runtime: NonNullable<ReconstructPageContextResult['capabilities']['runtime']>): CaptureResult {
  return {
    screenshotPath: runtime.files.screenshots[0],
    viewport: runtime.page.viewport,
    warnings: runtime.page.warnings,
  };
}

function buildNextActions(hasPlan: boolean, hasReview: boolean, hasMigrationSpec: boolean): string[] {
  return [
    ...(hasPlan ? ['Use ui-build-plan.json as the machine-readable implementation plan.'] : ['Provide targetRoot to generate ui-build-plan.json.']),
    ...(hasReview ? ['Use ui-build-review.md as a human-readable projection of ui-build-plan.json.'] : ['Build a UI review after generating a plan.']),
    ...(hasMigrationSpec ? ['Use migration-spec.md only as a source-aware reference; target engineering expression is governed by ui-build-plan.json targetConventions and implementationContract.'] : []),
    'Resolve any manualConfirmations before implementing ambiguous source/runtime differences.',
  ];
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}
