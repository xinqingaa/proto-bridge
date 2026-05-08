import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { toolJson } from '../server/responses.js';
import { capturePageSnapshotTool } from './capture-page-snapshot.js';
import { buildUiImplementationPlanTool } from './build-ui-implementation-plan.js';
import { ocrScreenshotTool } from './ocr-screenshot.js';
import { exportReviewMarkdownTool } from './export-review-markdown.js';
import { getTargetConventionsTool } from './get-target-conventions.js';
import { findTargetExamplesTool } from './find-target-examples.js';
import { validateTargetChangesTool } from './validate-target-changes.js';

export function toolsList(): JsonValue[] {
  return [
    {
      name: 'capture_page_snapshot',
      description: 'Capture a rendered URL into page-snapshot.json and screenshot artifacts for UI reconstruction.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Rendered page URL to capture.' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          output: { type: 'string', description: 'Override output directory. Defaults to .proto-bridge/snapshots/<page>.' },
          viewport: {
            type: 'object',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' },
              deviceScaleFactor: { type: 'number' },
            },
          },
          saveArtifacts: { type: 'boolean', description: 'Save screenshot and page-snapshot.json. Defaults to true.' },
        },
      },
    },
    {
      name: 'build_ui_implementation_plan',
      description: 'Build ui-implementation-plan.json from a captured page snapshot and YouFi target conventions.',
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string' },
          snapshotPath: { type: 'string', description: 'Direct page-snapshot.json path fallback.' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          targetModule: { type: 'string', description: 'Optional YouFi module override.' },
          output: { type: 'string', description: 'Override output directory. Defaults beside the page snapshot.' },
        },
      },
    },
    {
      name: 'ocr_screenshot',
      description: 'Persist OCR evidence for a screenshot. Phase 2 stores external OCR input or returns a clear provider warning.',
      inputSchema: {
        type: 'object',
        properties: {
          screenshotPath: { type: 'string' },
          snapshotId: { type: 'string' },
          snapshotPath: { type: 'string' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          output: { type: 'string', description: 'Override output directory. Defaults beside the screenshot.' },
          externalText: { type: 'array', items: { type: 'string' } },
          externalBoxes: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'export_review_markdown',
      description: 'Export a human-readable UI review Markdown file from a page snapshot and UI implementation plan.',
      inputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
          planPath: { type: 'string' },
          snapshotId: { type: 'string' },
          snapshotPath: { type: 'string' },
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          output: { type: 'string', description: 'Override output directory. Defaults beside the plan.' },
        },
      },
    },
    {
      name: 'get_target_conventions',
      description: 'Read YouFi Flutter target conventions, common components, routes, i18n, assets, and theme usage.',
      inputSchema: {
        type: 'object',
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
      description: 'Find similar YouFi Flutter examples and snippets by module, page pattern, roles, and symbols.',
      inputSchema: {
        type: 'object',
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
      name: 'validate_target_changes',
      description: 'Inspect target git changes for scope, obvious placeholder UI, TODOs, and ProtoBridge checklist alignment.',
      inputSchema: {
        type: 'object',
        properties: {
          targetRoot: { type: 'string', description: 'Target Flutter root. Defaults to current working directory.' },
          planId: { type: 'string' },
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

  if (name === 'capture_page_snapshot') return toolJson(await capturePageSnapshotTool(context, args));
  if (name === 'build_ui_implementation_plan') return toolJson(await buildUiImplementationPlanTool(context, args));
  if (name === 'ocr_screenshot') return toolJson(await ocrScreenshotTool(context, args));
  if (name === 'export_review_markdown') return toolJson(await exportReviewMarkdownTool(context, args));
  if (name === 'get_target_conventions') return toolJson(await getTargetConventionsTool(context, args));
  if (name === 'find_target_examples') return toolJson(await findTargetExamplesTool(context, args));
  if (name === 'validate_target_changes') return toolJson(await validateTargetChangesTool(context, args));

  throw new Error(`Unknown tool: ${name}`);
}
