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

const stringArraySchema = { type: 'array', items: { type: 'string' } };

const artifactResourceSchema = {
  type: 'object',
  properties: {
    uri: { type: 'string' },
    name: { type: 'string' },
    mimeType: { type: 'string' },
  },
  required: ['uri', 'name', 'mimeType'],
  additionalProperties: false,
};

const artifactToolOutputSchema = {
  type: 'object',
  properties: {
    pageId: { type: 'string', description: '稳定的页面级 ID。后续 plan/review/validate 调用以及页面资源读取都优先使用它。' },
    artifactSetId: { type: 'string', description: '本次工具调用及其产物集合的不透明 ID。' },
    planId: { type: 'string', description: '当工具创建或使用 UI build plan 时返回。' },
    files: { type: 'object', description: '本次工具产生或更新的本地 artifact 绝对路径。' },
    resources: { type: 'array', items: artifactResourceSchema, description: '本次工具调用后可继续读取的 MCP resources。' },
    warnings: stringArraySchema,
    nextActions: stringArraySchema,
    summary: { type: 'object' },
  },
  required: ['pageId', 'artifactSetId', 'files', 'resources', 'warnings', 'nextActions', 'summary'],
  additionalProperties: false,
};

const readOnlyJsonOutputSchema = {
  type: 'object',
  description: '以工具文本形式返回的只读 JSON 数据。',
};

const validationOutputSchema = {
  type: 'object',
  properties: {
    targetRoot: { type: 'string' },
    changedFiles: stringArraySchema,
    allowedPaths: stringArraySchema,
    issues: { type: 'array', items: { type: 'object' } },
    warnings: stringArraySchema,
  },
  additionalProperties: true,
};

const toolDefinitions: JsonValue[] = [
  {
    name: 'capture_page_canonical',
    title: '采集页面标准上下文',
    description: [
      'URL-first UI 还原的第 1 步。使用 Playwright 打开已渲染 URL，并写入页面标准产物集。',
      '在输出目录下生成 `page-canonical.json`、`page-debug-index.json` 和 `screenshots/full-page.png`。',
      '从 URL 开始时先调用它。返回的 `pageId` 是后续 `build_ui_plan`、`export_ui_review`、`validate_ui_build` 的主句柄。',
      '安全边界：只读取 URL 并写本地 artifact，不修改目标 Flutter 应用。',
    ].join('\n'),
    annotations: {
      title: '采集页面标准上下文',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      ...baseObjectSchema,
      required: ['url'],
      properties: {
        url: { type: 'string', description: '要采集的已渲染页面 URL。必填。' },
        targetRoot: { type: 'string', description: '目标 Flutter 根目录，用于解析相对输出路径。默认当前工作目录。' },
        output: { type: 'string', description: '产物输出目录。默认 `<targetRoot>/.proto-bridge/pages/<page>-<timestamp>`。' },
        viewport: {
          type: 'object',
          description: '采集 viewport。默认 width=390、height=844、deviceScaleFactor=1。',
          additionalProperties: false,
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
            deviceScaleFactor: { type: 'number' },
          },
        },
        saveArtifacts: { type: 'boolean', description: '是否保存截图 artifact。JSON artifact 总会持久化。默认 true。' },
      },
    },
    outputSchema: artifactToolOutputSchema,
  },
  {
    name: 'build_ui_plan',
    title: '生成 UI 构建计划',
    description: [
      'URL-first UI 还原的第 2 步。读取 page canonical 与目标 Flutter 规范，然后写入 `ui-build-plan.json`。',
      '同一 MCP session 内优先使用 `capture_page_canonical` 返回的 `pageId`；从文件恢复时使用 `pageCanonicalPath`。',
      '该 plan 是实现指导，不是生成好的 Dart 代码；它保留文件树、widget 拆分、组件映射、主题映射、i18n、资产、交互、风险和验证提示。',
      '安全边界：只读取目标规范并写 plan artifact，不修改目标 Flutter 应用。',
    ].join('\n'),
    annotations: {
      title: '生成 UI 构建计划',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        pageId: { type: 'string', description: '来自 `capture_page_canonical` 的页面 ID。有它时优先使用。' },
        pageCanonicalPath: { type: 'string', description: '当页面不在 MCP 内存中时，可直接传入 `page-canonical.json` 路径作为 fallback。' },
        targetRoot: { type: 'string', description: '目标 Flutter 根目录。默认当前工作目录。' },
        targetModule: { type: 'string', description: '可选目标模块覆盖值。用于自动模块推断错误或不明确时。' },
        output: { type: 'string', description: '产物输出目录。默认与 `page-canonical.json` 同目录。' },
      },
    },
    outputSchema: artifactToolOutputSchema,
  },
  {
    name: 'attach_screenshot_ocr',
    title: '附加截图 OCR 证据',
    description: [
      '可选证据增强步骤。把外部 OCR 文本/框信息附加到已有 page canonical artifact。',
      '当截图文字缺失、canvas/图片文字重要，或 page canonical 提示需要 OCR 时使用。',
      '默认读取该页面记录的第一张截图。如果 OCR 来自 ProtoBridge 外部，可传入 `externalText` 或 `externalBoxes`。',
      '安全边界：会更新 `page-canonical.json` 并写入 `ocr-result.json`，不修改目标 Flutter 应用。',
    ].join('\n'),
    annotations: {
      title: '附加截图 OCR 证据',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      required: ['pageId'],
      properties: {
        pageId: { type: 'string', description: '要附加 OCR 证据的页面 ID。必填。' },
        screenshotPath: { type: 'string', description: '可选截图路径覆盖值。默认使用页面记录的第一张截图。' },
        targetRoot: { type: 'string', description: '目标 Flutter 根目录，用于解析相对路径。默认当前工作目录。' },
        output: { type: 'string', description: '`ocr-result.json` 的输出目录。默认与截图同目录。' },
        externalText: { ...stringArraySchema, description: '要追加到页面文本证据中的 OCR 文本。' },
        externalBoxes: { type: 'array', items: { type: 'object' }, description: 'OCR 文本框，格式为 `{ text, bbox?, confidence? }`。' },
      },
    },
    outputSchema: artifactToolOutputSchema,
  },
  {
    name: 'export_ui_review',
    title: '导出 UI Review',
    description: [
      '第 3 步交付产物。根据 page canonical 和 UI build plan 导出 `ui-build-review.md`。',
      '在 `build_ui_plan` 之后使用；当实现、评审或调试需要人类可读摘要时尤其有用。',
      'Review 会列出视觉区块、计划文件、widget tree、组件/主题映射、i18n/资产/交互、风险、provenance 和验证提示。',
      '安全边界：只写 Markdown artifact，不修改目标 Flutter 应用。',
    ].join('\n'),
    annotations: {
      title: '导出 UI Review',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      required: ['pageId'],
      properties: {
        pageId: { type: 'string', description: '已有 UI build plan 的页面 ID。必填。' },
        targetRoot: { type: 'string', description: '目标 Flutter 根目录。默认当前工作目录。' },
        output: { type: 'string', description: '输出目录。默认与 `ui-build-plan.json` 同目录。' },
      },
    },
    outputSchema: artifactToolOutputSchema,
  },
  {
    name: 'read_target_conventions',
    title: '读取目标工程规范',
    description: [
      '只读目标上下文工具。检查 Flutter 模块、路由、翻译文件、资产目录、可复用组件和主题使用情况。',
      '当需要理解目标工程规范，或检查某个模块/组件/主题 token 建议是否合理时调用。',
      '安全边界：只读；扫描目标 Flutter repo 并返回 JSON。',
    ].join('\n'),
    annotations: {
      title: '读取目标工程规范',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        targetRoot: { type: 'string', description: '目标 Flutter 根目录。默认当前工作目录。' },
        module: { type: 'string', description: '可选模块名，用于聚焦规范分析。' },
        roles: { ...stringArraySchema, description: '可选组件角色优先级，例如 page-base、app-bar、button、image、sheet、refresh、theme、i18n。' },
        symbols: { ...stringArraySchema, description: '可选 symbol 名称，用于搜索可复用目标组件。' },
      },
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'find_target_examples',
    title: '查找目标工程示例',
    description: [
      '只读目标示例搜索。按模块、页面模式、角色、symbol 或 screen id 查找相似 Flutter 文件/片段。',
      '根据 UI build plan 实现时使用，避免重复发明目标应用中已经存在的本地模式。',
      '安全边界：只读；扫描目标 Flutter repo 并返回 JSON 引用/片段。',
    ].join('\n'),
    annotations: {
      title: '查找目标工程示例',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        targetRoot: { type: 'string', description: '目标 Flutter 根目录。默认当前工作目录。' },
        module: { type: 'string', description: '优先搜索的可选模块。' },
        pattern: { type: 'string', description: '可选页面模式，例如 list、form、dashboard、detail。' },
        roles: { ...stringArraySchema, description: '要搜索的可选组件角色。' },
        symbols: { ...stringArraySchema, description: '要搜索的可选 symbol 名称。' },
        screenId: { type: 'string', description: '可选 source/prototype screen id，用于命名或模块提示。' },
        limit: { type: 'number', description: '最多返回的示例数量。默认由 target adapter 决定。' },
      },
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'validate_ui_build',
    title: '验证 UI 实现',
    description: [
      '实现后的验证工具。检查目标 git 变更范围、占位 UI、TODO、缺失的预期文件，以及是否符合当前 UI build plan。',
      '编辑目标 Flutter 应用后调用。如果 plan 仍在 MCP 内存中，传入 `pageId` 以便推导预期文件和允许变更路径。',
      '安全边界：对目标 repo 只读；运行 git/文件扫描并返回验证结果。',
    ].join('\n'),
    annotations: {
      title: '验证 UI 实现',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        targetRoot: { type: 'string', description: '目标 Flutter 根目录。默认当前工作目录。' },
        pageId: { type: 'string', description: '可选页面 ID，要求 MCP 内存中已有对应 UI build plan。' },
        gitBase: { type: 'string', description: '用于 `git diff --name-only` 的可选 git base ref。' },
        allowedPaths: { ...stringArraySchema, description: '可选的显式允许变更路径前缀。有 pageId 时默认从页面 plan 推导。' },
      },
    },
    outputSchema: validationOutputSchema,
  },
];

const workflowCatalog: JsonObject = {
  name: 'ProtoBridge URL-first UI 还原',
  currentContract: {
    canonicalArtifact: 'page-canonical.json',
    debugArtifact: 'page-debug-index.json',
    planArtifact: 'ui-build-plan.json',
    reviewArtifact: 'ui-build-review.md',
    screenshotArtifact: 'screenshots/full-page.png',
    primaryId: 'pageId',
  },
  phases: [
    {
      phase: '采集',
      tool: 'capture_page_canonical',
      requiredInput: ['url'],
      emits: ['page-canonical.json', 'page-debug-index.json', 'screenshots/full-page.png'],
      next: ['build_ui_plan', 'attach_screenshot_ocr'],
    },
    {
      phase: '增强',
      tool: 'attach_screenshot_ocr',
      requiredInput: ['pageId'],
      optional: true,
      emits: ['ocr-result.json', '更新后的 page-canonical.json'],
      next: ['build_ui_plan'],
    },
    {
      phase: '计划',
      tool: 'build_ui_plan',
      requiredInput: ['pageId 或 pageCanonicalPath'],
      emits: ['ui-build-plan.json'],
      next: ['export_ui_review', '实现'],
    },
    {
      phase: '评审',
      tool: 'export_ui_review',
      requiredInput: ['pageId'],
      emits: ['ui-build-review.md'],
      next: ['实现', 'validate_ui_build'],
    },
    {
      phase: '验证',
      tool: 'validate_ui_build',
      requiredInput: ['targetRoot，可选 pageId'],
      emits: ['验证结果'],
      next: ['报告变更文件、警告和未解决问题'],
    },
  ],
  tools: toolDefinitions,
};

export function toolsList(): JsonValue[] {
  return toolDefinitions;
}

export function toolCatalog(): JsonObject {
  return workflowCatalog;
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
