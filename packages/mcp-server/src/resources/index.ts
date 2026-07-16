import { readFile } from 'node:fs/promises';
import { getFlutterTargetConventions } from '@proto-bridge/core/target/flutter-app';
import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readString } from '../utils/args.js';
import { resolveProjectRoot, resolveRuntimeConfig, resolveRuntimeTargetRoot } from '../services/config.js';
import {
  LATEST_ARTIFACTS_URI,
  TOOL_CATALOG_URI,
  WORKFLOW_GUIDE_URI,
  pageCanonicalUri,
  pageResources,
  pageScreenshotUri,
  uiBuildPlanUri,
  uiBuildReviewUri,
} from '../artifacts/contracts.js';
import { toolCatalog } from '../tools/registry.js';

export function resourceTemplatesList(): JsonValue[] {
  return [
    {
      uriTemplate: 'proto-bridge://pages/{pageId}/page-canonical',
      name: '页面标准上下文',
      description: '读取指定 pageId 的 `page-canonical.json`，用于查看完整 evidence、节点、样式、资产和 provenance。',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'proto-bridge://pages/{pageId}/screenshot/{name}',
      name: '页面截图',
      description: '读取指定 pageId 的截图资源。常用 name 为 `full-page`。',
      mimeType: 'image/png',
    },
    {
      uriTemplate: 'proto-bridge://pages/{pageId}/ui-build-plan',
      name: 'UI 构建计划',
      description: '读取指定 pageId 的 `ui-build-plan.json`，用于实现、复核 component/theme mapping 与 widget tree。',
      mimeType: 'application/json',
    },
    {
      uriTemplate: 'proto-bridge://pages/{pageId}/ui-build-review',
      name: 'UI Review 文档',
      description: '读取指定 pageId 的 `ui-build-review.md`，用于人类 review 或实现交接。',
      mimeType: 'text/markdown',
    },
  ];
}

export function resourcesList(context: ToolContext): JsonValue[] {
  return [
    {
      uri: WORKFLOW_GUIDE_URI,
      name: 'ProtoBridge UI 还原指南',
      mimeType: 'text/markdown',
    },
    {
      uri: TOOL_CATALOG_URI,
      name: 'ProtoBridge 工具目录',
      mimeType: 'application/json',
    },
    {
      uri: LATEST_ARTIFACTS_URI,
      name: 'ProtoBridge 最新产物集',
      mimeType: 'application/json',
    },
    {
      uri: 'proto-bridge://target/conventions',
      name: 'ProtoBridge 目标工程规范',
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
    return textContent(uri, 'application/json', JSON.stringify(toolCatalog(), null, 2));
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
    const config = await resolveRuntimeConfig(context.options);
    const configTargetRoot = resolveProjectRoot(config?.target, context.options.configDir);
    const conventions = await getFlutterTargetConventions({
      flutterRoot: resolveRuntimeTargetRoot(configTargetRoot),
    });
    return textContent(uri, 'application/json', JSON.stringify(conventions, null, 2));
  }

  const pageCanonicalMatch = uri.match(/^proto-bridge:\/\/pages\/([^/]+)\/page-canonical$/);
  if (pageCanonicalMatch?.[1]) {
    const page = context.pages.require(pageCanonicalMatch[1]);
    return textContent(uri, 'application/json', await readFile(page.files.pageCanonical, 'utf8'));
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
    '# ProtoBridge UI 还原',
    '',
    '本文档说明 ProtoBridge MCP server 当前暴露的 capability-first UI 重构工作流。',
    '',
    '## 产物契约',
    '',
    '- 主 ID：`pageId`',
    '- 标准上下文产物：`page-canonical.json`',
    '- UI 构建计划产物：`ui-build-plan.json`',
    '- 人类可读评审产物：`ui-build-review.md`',
    '- 截图产物：`screenshots/full-page.png`',
    '',
    '使用 `proto-bridge://artifacts/latest` 查询当前 MCP session 中最新的 page-centric 产物集。',
    '',
    '## 标准流程（推荐）',
    '',
    '1. 统一编排：优先调用 `reconstruct_page_context`。',
    '   - 默认只传 `url`；系统会从 URL 推导 route。',
    '   - 有源码时传 `sourceRoot` 或在 config 中配置 `source.root`，用于自动补充 source evidence。',
    '   - 有目标工程时传 `targetRoot` 或在 config 中配置 `target.root`，用于 target.inspect、ui.plan 和 ui.review。',
    '   - 没有 target 时只产出 evidence 类 artifact；不会强行生成 Flutter 实现计划。',
    '   - 有 source + target facts 时，source semantics 会进入 `ui-build-plan.json#/implementationContract/sourceSemantics`，并由 `ui-build-review.md` 展示。',
    '   - 实现时先读 `ui-build-review.md` 与截图，再按需读取 `ui-build-plan.json` 的 `implementationContract`、`visualPlan` 与 `stylePlan`；只有证据冲突时读取 canonical。',
    '',
    '2. 可选截图/OCR 输入：当可见文字缺失、图片/canvas 文字重要时，把 `screenshotPath`、`ocrText` 或 `ocrBoxes` 直接传给 `reconstruct_page_context`。',
    '   - 这些证据会进入 `screenshotFacts` 和 `page-canonical.json`。',
    '',
    '3. 验证：目标代码修改后，使用 `pageId` 和 `targetRoot` 调用 `validate_ui_build`。',
    '   - 报告变更文件、范围问题、占位实现、缺失的预期文件、architecture contract violations，以及 plan 对齐风险。',
    '',
    '## Resource 映射',
    '',
    '- `resources/templates/list`：读取可参数化 resource 模板，capture 前也能知道 page artifact URI 形态。',
    '- `proto-bridge://workflow/tool-catalog`：结构化工具目录，包含阶段、schema、annotations 和 outputSchema。',
    '- `proto-bridge://artifacts/latest`：最新 page id、文件路径和 resource 描述。',
    '- `proto-bridge://pages/{pageId}/page-canonical`：页面标准上下文 JSON。',
    '- `proto-bridge://pages/{pageId}/screenshot/{name}`：截图图片，通常为 `full-page`。',
    '- `proto-bridge://pages/{pageId}/ui-build-plan`：UI 构建计划 JSON。',
    '- `proto-bridge://pages/{pageId}/ui-build-review`：人类可读的 review Markdown。',
    '',
    '## 问题归因',
    '',
    '视觉输出不正确时，先归因再改代码：',
    '',
    '- A. capture / evidence 缺失：关键事实没有进入 `page-canonical.json`。',
    '- B. plan 压缩或映射歧义：事实存在于 page canonical，但在 `ui-build-plan.json` 中缺失或被弱化。',
    '- C. target component 默认样式带偏：plan 指向的可复用组件默认样式与源页面不一致。',
    '- D. Flutter 实现问题：evidence 和 plan 足够，但目标代码没有照着落地。',
    '',
    '推荐链路：review 摘要 -> 截图区域 -> visualPlan section / representative unit -> stylePlan facts -> implementationContract widget tree -> target implementation。',
    '',
    '## 边界',
    '',
    '- ProtoBridge 提供 evidence、plan、review、示例和验证提示；Dart 代码仍由 coding agent 实现。',
    '- 不要引入 `targetConventions` 没有证据支持的新 state/routing/i18n/theme 框架。',
    '- 不要从视觉证据中编造 API、权限、风控、埋点或隐藏业务行为。',
    '- CLI `generate` 和 MCP `reconstruct_page_context` 都调用统一 orchestrator；CLI/MCP 只是入口。',
  ].join('\n');
}
