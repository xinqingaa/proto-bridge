import { readFile } from 'node:fs/promises';
import { getFlutterTargetConventions } from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveRuntimeTargetRoot } from '../services/config.js';
import {
  LATEST_ARTIFACTS_URI,
  TOOL_CATALOG_URI,
  WORKFLOW_GUIDE_URI,
  pageCanonicalUri,
  pageDebugIndexUri,
  pageResources,
  pageScreenshotUri,
  uiBuildPlanUri,
  uiBuildReviewUri,
} from '../artifacts/contracts.js';
import { toolsList } from '../tools/registry.js';

export function resourcesList(context: ToolContext): JsonValue[] {
  return [
    {
      uri: WORKFLOW_GUIDE_URI,
      name: 'ProtoBridge UI reconstruction guide',
      mimeType: 'text/markdown',
    },
    {
      uri: TOOL_CATALOG_URI,
      name: 'ProtoBridge tool catalog',
      mimeType: 'application/json',
    },
    {
      uri: LATEST_ARTIFACTS_URI,
      name: 'ProtoBridge latest artifact set',
      mimeType: 'application/json',
    },
    {
      uri: 'proto-bridge://target/conventions',
      name: 'ProtoBridge target conventions',
      mimeType: 'application/json',
    },
    ...context.pages.values().flatMap(pageResources),
  ];
}

export async function readResource(context: ToolContext, params: JsonObject | undefined): Promise<JsonObject> {
  const uri = readString(params, 'uri');
  if (!uri) throw new Error('resources/read requires params.uri');

  if (uri === WORKFLOW_GUIDE_URI) {
    return textContent(uri, 'text/markdown', renderWorkflowGuide());
  }

  if (uri === TOOL_CATALOG_URI) {
    return textContent(uri, 'application/json', JSON.stringify({ tools: toolsList() }, null, 2));
  }

  if (uri === LATEST_ARTIFACTS_URI) {
    const latest = context.pages.latest();
    return textContent(uri, 'application/json', JSON.stringify({
      latestPageId: latest?.id,
      resources: latest ? pageResources(latest) : [],
      files: latest?.files ?? {},
    }, null, 2));
  }

  if (uri === 'proto-bridge://target/conventions') {
    const conventions = await getFlutterTargetConventions({
      flutterRoot: resolveRuntimeTargetRoot(undefined),
    });
    return textContent(uri, 'application/json', JSON.stringify(conventions, null, 2));
  }

  const pageCanonicalMatch = uri.match(/^proto-bridge:\/\/pages\/([^/]+)\/page-canonical$/);
  if (pageCanonicalMatch?.[1]) {
    const page = context.pages.require(pageCanonicalMatch[1]);
    return textContent(uri, 'application/json', await readFile(page.files.pageCanonical, 'utf8'));
  }

  const debugIndexMatch = uri.match(/^proto-bridge:\/\/pages\/([^/]+)\/page-debug-index$/);
  if (debugIndexMatch?.[1]) {
    const page = context.pages.require(debugIndexMatch[1]);
    return textContent(uri, 'application/json', await readFile(page.files.pageDebugIndex, 'utf8'));
  }

  const screenshotMatch = uri.match(/^proto-bridge:\/\/pages\/([^/]+)\/screenshot\/([^/]+)$/);
  if (screenshotMatch?.[1] && screenshotMatch[2]) {
    const page = context.pages.require(screenshotMatch[1]);
    const name = decodeURIComponent(screenshotMatch[2]);
    const screenshot = page.page.screenshots.find((item) => item.name === name);
    if (!screenshot) throw new Error(`Unknown screenshot ${name} for page ${page.id}`);
    return {
      contents: [{
        uri: pageScreenshotUri(page.id, name),
        mimeType: 'image/png',
        blob: await readFile(screenshot.path, 'base64'),
      }],
    };
  }

  const uiPlanMatch = uri.match(/^proto-bridge:\/\/pages\/([^/]+)\/ui-build-plan$/);
  if (uiPlanMatch?.[1]) {
    const page = context.pages.require(uiPlanMatch[1]);
    if (!page.files.uiBuildPlan) throw new Error(`Page ${page.id} has no ui-build-plan artifact.`);
    return textContent(uiBuildPlanUri(page.id), 'application/json', await readFile(page.files.uiBuildPlan, 'utf8'));
  }

  const uiReviewMatch = uri.match(/^proto-bridge:\/\/pages\/([^/]+)\/ui-build-review$/);
  if (uiReviewMatch?.[1]) {
    const page = context.pages.require(uiReviewMatch[1]);
    if (!page.files.uiBuildReview) throw new Error(`Page ${page.id} has no ui-build-review artifact.`);
    return textContent(uiBuildReviewUri(page.id), 'text/markdown', await readFile(page.files.uiBuildReview, 'utf8'));
  }

  throw new Error(`Unknown resource uri: ${uri}`);
}

function textContent(uri: string, mimeType: string, text: string): JsonObject {
  return {
    contents: [{ uri, mimeType, text }],
  };
}

function renderWorkflowGuide(): string {
  return [
    '# ProtoBridge UI Reconstruction',
    '',
    'Canonical flow:',
    '',
    '1. `capture_page_canonical` creates `page-canonical.json`, `page-debug-index.json`, and `screenshots/`.',
    '2. `attach_screenshot_ocr` optionally enriches the page canonical with OCR evidence.',
    '3. `build_ui_plan` creates `ui-build-plan.json` from the page canonical and target conventions.',
    '4. `export_ui_review` creates `ui-build-review.md` for human review and handoff.',
    '5. `validate_ui_build` checks target git changes against the active page plan.',
    '',
    'Use `proto-bridge://artifacts/latest` to discover the latest page-centric artifact set.',
  ].join('\n');
}
