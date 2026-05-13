import type { JsonObject, JsonValue } from '../types.js';
import { readObject, readString } from '../utils/args.js';

const promptDefinitions = [
  {
    name: 'reconstruct_url_ui',
    description: '运行完整 ProtoBridge capability-first 流程：统一重构上下文、可选 OCR、实现并验证。',
    arguments: [
      { name: 'url', description: '已渲染页面 URL。', required: true },
      { name: 'targetModule', description: '可选目标模块覆盖值，用于 reconstruct_page_context。', required: false },
      { name: 'targetRoot', description: '可选目标 Flutter 根目录。', required: false },
    ],
  },
  {
    name: 'capture_url_evidence',
    description: '只采集 URL evidence，并报告 pageId、文件、resources、warnings 和即时证据质量风险。',
    arguments: [
      { name: 'url', description: '已渲染页面 URL。', required: true },
      { name: 'targetRoot', description: '可选目标 Flutter 根目录。', required: false },
    ],
  },
  {
    name: 'investigate_visual_mismatch',
    description: '按 A/B/C/D 归因链路调查视觉偏差：从截图到 evidence、plan、最终实现。',
    arguments: [
      { name: 'pageId', description: '已采集的页面 ID。', required: false },
      { name: 'issue', description: '简短视觉问题描述。', required: true },
      { name: 'targetRoot', description: '可选目标 Flutter 根目录。', required: false },
    ],
  },
  {
    name: 'implement_from_existing_plan',
    description: '基于已有 pageId / ui-build-plan 实现目标 Flutter UI，不重新采集 URL。',
    arguments: [
      { name: 'pageId', description: '已有 ui-build-plan 的页面 ID。', required: true },
      { name: 'targetRoot', description: '可选目标 Flutter 根目录。', required: false },
    ],
  },
  {
    name: 'validate_ui_reconstruction',
    description: '根据页面 plan 验证目标变更，并报告变更文件、警告、缺失文件和未解决问题。',
    arguments: [
      { name: 'pageId', description: '已有 ui-build-plan 的页面 ID。', required: false },
      { name: 'targetRoot', description: '可选目标 Flutter 根目录。', required: false },
      { name: 'gitBase', description: '用于检测变更文件的可选 git base。', required: false },
    ],
  },
] satisfies JsonValue[];

export function promptsList(): JsonValue[] {
  return promptDefinitions;
}

export function getPrompt(params: JsonObject | undefined): JsonObject {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};

  if (name === 'reconstruct_url_ui') return promptResponse(name, reconstructUrlUiPrompt(args));
  if (name === 'capture_url_evidence') return promptResponse(name, captureUrlEvidencePrompt(args));
  if (name === 'investigate_visual_mismatch') return promptResponse(name, investigateVisualMismatchPrompt(args));
  if (name === 'implement_from_existing_plan') return promptResponse(name, implementFromExistingPlanPrompt(args));
  if (name === 'validate_ui_reconstruction') return promptResponse(name, validateUiReconstructionPrompt(args));

  throw new Error(`Unknown prompt: ${name ?? '(missing)'}`);
}

function reconstructUrlUiPrompt(args: JsonObject): string[] {
  const url = readString(args, 'url') ?? '<url>';
  const targetModule = readString(args, 'targetModule');
  const targetRoot = readString(args, 'targetRoot');
  return [
    `使用 ProtoBridge 将 ${url} 的可见 UI 还原到目标 Flutter 应用中。`,
    targetRoot ? `所有 ProtoBridge 工具调用都使用 targetRoot=${targetRoot}。` : '除非用户另行指定，否则使用当前 targetRoot。',
    '先调用 `reconstruct_page_context`，传入 url，并保存返回的 `pageId`。',
    '如果页面存在可见文字缺失、图片/canvas 文字重要，或 OCR 相关 warning，请把 screenshotPath、ocrText 或 ocrBoxes 直接传给 `reconstruct_page_context` 重新生成上下文。',
    targetModule ? `调用 reconstruct_page_context 时使用 targetModule=${targetModule}。` : '除非 evidence 表明自动模块推断错误，否则让 ProtoBridge 自动推断目标模块。',
    '优先读取 `ui-build-review.md` 作为人类可读交接文档，读取 `ui-build-plan.json` 作为机器可读实现计划。',
    '根据 `ui-build-plan.json` 实现 Dart UI，重点关注视觉结构、文案、组件映射、主题、i18n 和资产。',
    '字体、CSS 颜色、间距和布局属于 P0 视觉保真要求。优先使用精确 evidence 和 node-level mapping，避免过早使用宽泛 theme family 猜测。',
    '不要编造 API、权限、风控、埋点或隐藏业务行为；未确认内容保留 TODO 或人工确认项。',
    '尽可能运行格式化/静态检查，然后用 pageId 调用 `validate_ui_build`，报告变更文件、验证结果、warnings 和未解决业务问题。',
  ];
}

function captureUrlEvidencePrompt(args: JsonObject): string[] {
  const url = readString(args, 'url') ?? '<url>';
  const targetRoot = readString(args, 'targetRoot');
  return [
    `为 ${url} 采集 ProtoBridge evidence。`,
    targetRoot ? `使用 targetRoot=${targetRoot}。` : '除非用户另行指定，否则使用当前 targetRoot。',
    '只调用 `reconstruct_page_context`，传入 url、buildPlan=false、buildReview=false。',
    '采集后读取或总结 `proto-bridge://artifacts/latest`，报告 pageId、files、resources、warnings、截图路径、section/node/text 数量，以及是否可能需要 OCR。',
    '除非用户要求进入下一阶段，否则不要生成 UI plan、不要实现代码、不要验证目标变更。',
  ];
}

function investigateVisualMismatchPrompt(args: JsonObject): string[] {
  const pageId = readString(args, 'pageId') ?? '<pageId>';
  const issue = readString(args, 'issue') ?? '<visual issue>';
  const targetRoot = readString(args, 'targetRoot');
  return [
    `调查这个视觉偏差：${issue}`,
    `如果 pageId=${pageId} 可用，就使用它；否则先要求提供 pageId 或先采集 evidence。`,
    targetRoot ? `需要检查目标工程时使用 targetRoot=${targetRoot}。` : '需要检查目标工程时使用当前 targetRoot。',
    '按归因链路排查：截图区域 -> section -> node ids -> node style facts -> theme/component mappings -> widget tree -> target implementation。',
    '将问题归类为 A capture/evidence 缺失、B plan 压缩或映射歧义、C target component 默认样式带偏、D Flutter 实现问题。',
    '优先使用页面 resources：page-canonical、page-debug-index、ui-build-plan、ui-build-review。只有当目标组件行为相关时才使用 `find_target_examples` 或 `read_target_conventions`。',
    '返回具体 artifact 引用、归因标签，以及最小下一步修复建议。',
  ];
}

function implementFromExistingPlanPrompt(args: JsonObject): string[] {
  const pageId = readString(args, 'pageId') ?? '<pageId>';
  const targetRoot = readString(args, 'targetRoot');
  return [
    `根据 pageId=${pageId} 的已有 ProtoBridge plan 实现目标 Flutter UI。`,
    targetRoot ? `使用 targetRoot=${targetRoot}。` : '除非用户另行指定，否则使用当前 targetRoot。',
    '读取 `proto-bridge://pages/{pageId}/ui-build-plan`，如有 `proto-bridge://pages/{pageId}/ui-build-review` 也一起读取。',
    '创建新的本地模式前，先用 `find_target_examples` 查找相似模块/页面/组件模式。',
    '只实现可见 UI 和已确认的 callback 边界。业务数据、API 字段、权限、风控和埋点除非由目标示例确认，否则保留 TODO。',
    '编辑后尽可能运行格式化/静态检查，并用 pageId 调用 `validate_ui_build`。',
  ];
}

function validateUiReconstructionPrompt(args: JsonObject): string[] {
  const pageId = readString(args, 'pageId') ?? '<pageId>';
  const targetRoot = readString(args, 'targetRoot');
  const gitBase = readString(args, 'gitBase');
  return [
    `验证 pageId=${pageId} 的 UI 还原结果。`,
    targetRoot ? `使用 targetRoot=${targetRoot}。` : '除非用户另行指定，否则使用当前 targetRoot。',
    gitBase ? `使用 gitBase=${gitBase} 检测变更文件。` : '除非用户提供 gitBase，否则使用默认变更文件检测。',
    '调用 `validate_ui_build`，检查 changed files、allowed paths、缺失的预期文件、placeholder、TODO 和 validation hints。',
    '先按严重程度报告 findings；如有文件引用则附上。最后补充剩余风险和仍需人工确认的业务问题。',
  ];
}

function promptResponse(name: string, lines: string[]): JsonObject {
  return {
    description: promptDefinitions.find((prompt) => prompt.name === name)?.description ?? name,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: lines.join('\n'),
        },
      },
    ],
  };
}
