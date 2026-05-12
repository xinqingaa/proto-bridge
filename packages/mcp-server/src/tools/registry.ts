import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { toolJson } from '../server/responses.js';
import { capturePageCanonicalTool } from './capture-page-canonical.js';
import { buildUiPlanTool } from './build-ui-plan.js';
import { attachScreenshotOcrTool } from './attach-screenshot-ocr.js';
import { exportUiReviewTool } from './export-ui-review.js';
import { getTargetConventionsTool } from './get-target-conventions.js';
import { findTargetExamplesTool } from './find-target-examples.js';
import { validateTargetChangesTool } from './validate-target-changes.js';

const baseObjectSchema = {
  type: 'object',
  additionalProperties: false,
};

export function toolsList(): JsonValue[] {
  return [
    {
      name: 'capture_page_canonical',
      description: 'Capture a rendered URL into page-canonical.json, page-debug-index.json, and screenshots/ artifacts.',
      inputSchema: {
        ...baseObjectSchema,
        required: ['url'],
        properties: {
          url: { type: 'string', description: 'Rendered page URL to capture.' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          output: { type: 'string', description: 'Output directory. Defaults to .proto-bridge/pages/<page>.' },
          viewport: {
            type: 'object',
            additionalProperties: false,
            properties: {
              width: { type: 'number' },
              height: { type: 'number' },
              deviceScaleFactor: { type: 'number' },
            },
          },
          saveArtifacts: { type: 'boolean', description: 'Save screenshot artifacts. JSON artifacts are always persisted. Defaults to true.' },
        },
      },
    },
    {
      name: 'build_ui_plan',
      description: 'Build ui-build-plan.json from a page canonical artifact and target conventions.',
      inputSchema: {
        ...baseObjectSchema,
        properties: {
          pageId: { type: 'string', description: 'Captured page id from capture_page_canonical.' },
          pageCanonicalPath: { type: 'string', description: 'Direct page-canonical.json path fallback.' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          targetModule: { type: 'string', description: 'Optional target module override.' },
          output: { type: 'string', description: 'Output directory. Defaults beside page-canonical.json.' },
        },
      },
    },
    {
      name: 'attach_screenshot_ocr',
      description: 'Attach OCR evidence to a page canonical artifact, using a stored page screenshot by default.',
      inputSchema: {
        ...baseObjectSchema,
        required: ['pageId'],
        properties: {
          pageId: { type: 'string' },
          screenshotPath: { type: 'string', description: 'Optional screenshot override. Defaults to the first screenshot on the page.' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          output: { type: 'string', description: 'Output directory for ocr-result.json. Defaults beside the screenshot.' },
          externalText: { type: 'array', items: { type: 'string' } },
          externalBoxes: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'export_ui_review',
      description: 'Export ui-build-review.md from a page canonical artifact and its UI build plan.',
      inputSchema: {
        ...baseObjectSchema,
        required: ['pageId'],
        properties: {
          pageId: { type: 'string' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          output: { type: 'string', description: 'Output directory. Defaults beside ui-build-plan.json.' },
        },
      },
    },
    {
      name: 'read_target_conventions',
      description: 'Read Flutter target conventions, common components, routes, i18n, assets, and theme usage.',
      inputSchema: {
        ...baseObjectSchema,
        properties: {
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          module: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'find_target_examples',
      description: 'Find similar Flutter examples and snippets by module, page pattern, roles, and symbols.',
      inputSchema: {
        ...baseObjectSchema,
        properties: {
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          module: { type: 'string' },
          pattern: { type: 'string' },
          roles: { type: 'array', items: { type: 'string' } },
          symbols: { type: 'array', items: { type: 'string' } },
          screenId: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'validate_ui_build',
      description: 'Inspect target git changes for scope, placeholder UI, TODOs, and UI build plan alignment.',
      inputSchema: {
        ...baseObjectSchema,
        properties: {
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          pageId: { type: 'string' },
          gitBase: { type: 'string', description: 'Optional git base ref for diff --name-only.' },
          allowedPaths: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ];
}

export async function callTool(context: ToolContext, params: JsonObject | undefined): Promise<JsonObject> {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};
  if (!name) throw new Error('tools/call requires params.name');

  if (name === 'capture_page_canonical') return toolJson(await capturePageCanonicalTool(context, args));
  if (name === 'build_ui_plan') return toolJson(await buildUiPlanTool(context, args));
  if (name === 'attach_screenshot_ocr') return toolJson(await attachScreenshotOcrTool(context, args));
  if (name === 'export_ui_review') return toolJson(await exportUiReviewTool(context, args));
  if (name === 'read_target_conventions') return toolJson(await getTargetConventionsTool(context, args));
  if (name === 'find_target_examples') return toolJson(await findTargetExamplesTool(context, args));
  if (name === 'validate_ui_build') return toolJson(await validateTargetChangesTool(context, args));

  throw new Error(`Unknown tool: ${name}`);
}
