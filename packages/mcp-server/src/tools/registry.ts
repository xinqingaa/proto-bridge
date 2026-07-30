import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { toolJson } from '../server/responses.js';
import { reconstructPageContextTool } from './reconstruct-page-context.js';
import { getTargetConventionsTool } from './get-target-conventions.js';
import { findTargetExamplesTool } from './find-target-examples.js';
import { validateTargetChangesTool } from './validate-target-changes.js';
import { validateTargetV2Tool } from './validate-target-v2.js';
import {
  inspectEvidenceWorkspaceTool,
  listEvidenceHistoryTool,
  listEvidenceBundlesTool,
  readAgentHandoffTool,
  readEvidenceBlobTool,
  readEvidenceCatalogTool,
  readEvidenceCaseTool,
  readEvidenceFragmentTool,
  readEvidenceIssueTool,
  readEvidenceRevisionTool,
  readEvidenceRunTool,
  readEvidenceSnapshotTool,
  readEvidenceStalenessTool,
} from './read-evidence.js';

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

const bundleInput = {
  bundleId: { type: 'string', description: 'Evidence Bundle ID。' },
};

const fixedSnapshotInput = {
  ...bundleInput,
  snapshotId: { type: 'string', description: '必须固定读取的 Snapshot ID。' },
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
    name: 'inspect_evidence_workspace',
    title: '检查 Evidence Workspace',
    description: '返回 MCP 当前绑定的逻辑 Workspace；不返回或接受 Store 物理路径。',
    annotations: {
      title: '检查 Evidence Workspace',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: baseObjectSchema,
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'list_evidence_history',
    title: '列出 Bundle 固定历史',
    description: '列出 Snapshot、Run/Coverage、Catalog revision、Issue、Staleness Report 与 Handoff 的逻辑索引。',
    annotations: {
      title: '列出 Bundle 固定历史',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: bundleInput,
      required: ['bundleId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'list_evidence_bundles',
    title: '列出证据 Bundle',
    description: [
      '只读列出 V2 Evidence Store 中的 Bundle 与当前 active Snapshot。',
      '返回的 active Snapshot 仅用于发现；后续读取必须显式传 snapshotId，避免 Agent 在消费过程中漂移到新证据。',
      '不会触发采集，也不会补造不存在的证据。',
    ].join('\n'),
    annotations: {
      title: '列出证据 Bundle',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: baseObjectSchema,
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_snapshot',
    title: '读取固定证据 Snapshot',
    description: [
      '按明确的 bundleId + snapshotId 读取与 PBWork Evidence Viewer 相同的 Screen/Case 证据模型。',
      '先返回质量消息，再返回执行覆盖、语义覆盖、截图资源、事实值与 provenance。',
      'unknown、冲突和缺失保持原样，不推断或捏造。',
    ].join('\n'),
    annotations: {
      title: '读取固定证据 Snapshot',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...fixedSnapshotInput,
      },
      required: ['bundleId', 'snapshotId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_case',
    title: '读取固定 Snapshot 中的 Case',
    description: [
      '读取一个固定 Snapshot 中的单个 Case，适合 Agent 在实现具体页面、Variant 或 Scenario 前按需取证。',
      '返回截图 resource、事实和 provenance；缺失内容会明确报告。',
    ].join('\n'),
    annotations: {
      title: '读取固定证据 Case',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...fixedSnapshotInput,
        caseId: { type: 'string', description: 'Snapshot 中的稳定 Case ID。' },
      },
      required: ['bundleId', 'snapshotId', 'caseId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_run',
    title: '读取固定 Run 与 Coverage',
    description: '按 Bundle + Run ID 读取不可变 Run、Selection、Attempt 与 Run Coverage。',
    annotations: {
      title: '读取固定 Evidence Run',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...bundleInput,
        runId: { type: 'string' },
      },
      required: ['bundleId', 'runId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_revision',
    title: '读取固定 Evidence Revision',
    description: '仅当具体 revision 可由指定 Snapshot 到达时返回，绝不替换为 active/latest。',
    annotations: {
      title: '读取固定 Evidence Revision',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...fixedSnapshotInput,
        revisionId: { type: 'string' },
      },
      required: ['bundleId', 'snapshotId', 'revisionId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_fragment',
    title: '读取固定 Fragment Evidence',
    description: '从固定 Snapshot/revision 中按稳定 pbId/pbKey 读取 Fragment facts 与 provenance。',
    annotations: {
      title: '读取固定 Fragment Evidence',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...fixedSnapshotInput,
        revisionId: { type: 'string' },
        pbId: { type: 'string' },
        pbKey: { type: 'string' },
      },
      required: ['bundleId', 'snapshotId', 'revisionId', 'pbId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_catalog',
    title: '读取固定 Catalog Revision',
    description: '按明确 Catalog revision ID 读取 Prototype/Navigation/Screen/Component/Token/Asset/Scenario Catalog。',
    annotations: {
      title: '读取固定 Catalog Revision',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...bundleInput,
        catalogRevisionId: { type: 'string' },
      },
      required: ['bundleId', 'catalogRevisionId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_issue',
    title: '读取固定 Evidence Issue',
    description: '按明确 Issue ID 读取 severity、原因、影响范围、refs 与 next action。',
    annotations: {
      title: '读取固定 Evidence Issue',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...bundleInput,
        issueId: { type: 'string' },
      },
      required: ['bundleId', 'issueId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_staleness',
    title: '读取固定 Staleness Report',
    description: '要求 Report 同时匹配明确 Bundle 与 Snapshot，禁止使用其他 freshness 结果替代。',
    annotations: {
      title: '读取固定 Staleness Report',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...fixedSnapshotInput,
        reportId: { type: 'string' },
      },
      required: ['bundleId', 'snapshotId', 'reportId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_agent_handoff',
    title: '读取 Agent Handoff',
    description: '读取固定 Workspace/Snapshot/revision refs，并单独返回 Consumer 必须报告的全部 risks。',
    annotations: {
      title: '读取 Agent Handoff',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: { handoffId: { type: 'string' } },
      required: ['handoffId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'read_evidence_blob',
    title: '读取受控 Evidence Blob',
    description: '读取固定 Snapshot 或明确 Catalog revision 可达的 Blob；Debug/Trace 必须显式 allowDebug=true。',
    annotations: {
      title: '读取受控 Evidence Blob',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        ...fixedSnapshotInput,
        blobId: { type: 'string' },
        catalogRevisionId: { type: 'string' },
        allowDebug: { type: 'boolean' },
      },
      required: ['bundleId', 'snapshotId', 'blobId'],
    },
    outputSchema: readOnlyJsonOutputSchema,
  },
  {
    name: 'validate_target_changes',
    title: '验证目标工程变更',
    description: [
      'V2 独立 Target validation：只读取目标仓库的实际变更、约定和明显风险。',
      '不读取或写入 Evidence Bundle，不依赖目标仓库存在 ProtoBridge 配置。',
    ].join('\n'),
    annotations: {
      title: '验证目标工程变更',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        targetRoot: { type: 'string' },
        gitBase: { type: 'string' },
        allowedPaths: stringArraySchema,
        expectedFiles: stringArraySchema,
      },
    },
    outputSchema: validationOutputSchema,
  },
  {
    name: 'reconstruct_page_context',
    title: '重建页面统一上下文',
    description: [
      'Capability-first UI 重构入口。根据输入自动组合 source.analyze、runtime.capture、target.inspect、page.merge、ui.plan 和 ui.review。',
      '`ui-build-plan.json` 是机器契约；`ui-build-review.md` 是 plan 的人类可读投影；有源码 + target 时 source semantics 写入 `implementationContract.sourceSemantics`。',
      '无源码但有 URL 时退化为 URL/runtime-first，并仍产出统一 `page-canonical.json`、`ui-build-plan.json`、`ui-build-review.md` 和截图。',
      '安全边界：只读取 source/target/URL 并写 artifact，不修改目标 Flutter 应用。',
    ].join('\n'),
    annotations: {
      title: '重建页面统一上下文',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    inputSchema: {
      ...baseObjectSchema,
      properties: {
        sourceRoot: { type: 'string', description: '可选 prototype/source 根目录。有源码时传入；未传时读取 proto-bridge.config.json 的 source.root。' },
        sourceAdapter: { type: 'string', description: 'source adapter。默认读取 config.source.adapter，再回退 vue3-prototype。' },
        targetRoot: { type: 'string', description: '可选目标 Flutter 根目录。未传时读取 config.target.root；没有 target 时只生成 runtime/source evidence。' },
        targetAdapter: { type: 'string', description: 'target adapter。默认读取 config.target.adapter，再回退 flutter-app。' },
        route: { type: 'string', description: '高级 source route 覆盖值。通常只传 url，系统会自动从 url 推导 route。' },
        vuePath: { type: 'string', description: '高级 Vue SFC 覆盖路径。通常只传 url。' },
        vue: { type: 'string', description: 'vuePath 的兼容别名。P5 完成后会删除。' },
        url: { type: 'string', description: '主页面输入。每次调用时传入；有 URL 时默认 capture=true，除非 runtime.capture/tool capture 覆盖。' },
        output: { type: 'string', description: '产物输出目录。默认 config.output.root 下的页面目录；无 config 时使用当前工作目录下的 output。' },
        capture: { type: 'boolean', description: '是否执行 runtime.capture。默认读取 config.runtime.capture，再回退有 url 时 true。' },
        saveArtifacts: { type: 'boolean', description: '是否保存截图 artifact。默认 true。' },
        buildPlan: { type: 'boolean', description: '是否生成 `ui-build-plan.json`。默认 true。' },
        buildReview: { type: 'boolean', description: '是否生成 `ui-build-review.md`。默认 true。' },
        screenshotPath: { type: 'string', description: '可选外部截图路径。用于无 URL 或补充 OCR 的 screenshot.attach。' },
        ocrText: { ...stringArraySchema, description: '可选 OCR 文本，写入 screenshotFacts 并参与 review。' },
        externalText: { ...stringArraySchema, description: 'ocrText 的兼容别名。P5 完成后会删除。' },
        ocrBoxes: { type: 'array', items: { type: 'object' }, description: '可选 OCR 文本框，格式为 `{ text, bbox?, confidence? }`。' },
        externalBoxes: { type: 'array', items: { type: 'object' }, description: 'ocrBoxes 的兼容别名。P5 完成后会删除。' },
        trace: { type: 'boolean', description: '是否在 summary 中返回临时 capability orchestration trace。默认 false；trace 总会写入 page-canonical.json。' },
        targetModule: { type: 'string', description: '可选目标模块覆盖值。' },
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
  name: 'ProtoBridge Capability-first UI 重构',
  currentContract: {
    canonicalArtifact: 'page-canonical.json',
    planArtifact: 'ui-build-plan.json',
    reviewArtifact: 'ui-build-review.md',
    screenshotArtifact: 'screenshots/full-page.png',
    primaryId: 'pageId',
  },
  phases: [
    {
      phase: '统一编排',
      tool: 'reconstruct_page_context',
      requiredInput: ['url；route/vuePath 仅作高级覆盖'],
      emits: ['page-canonical.json', 'ui-build-plan.json', 'ui-build-review.md', 'screenshots/full-page.png'],
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

  if (name === 'inspect_evidence_workspace') {
    return toolJson(await inspectEvidenceWorkspaceTool(context));
  }
  if (name === 'list_evidence_bundles') {
    return toolJson(await listEvidenceBundlesTool(context));
  }
  if (name === 'read_evidence_snapshot') {
    return toolJson(await readEvidenceSnapshotTool(context, args));
  }
  if (name === 'read_evidence_case') {
    return toolJson(await readEvidenceCaseTool(context, args));
  }
  if (name === 'list_evidence_history') {
    return toolJson(await listEvidenceHistoryTool(context, args));
  }
  if (name === 'read_evidence_run') {
    return toolJson(await readEvidenceRunTool(context, args));
  }
  if (name === 'read_evidence_revision') {
    return toolJson(await readEvidenceRevisionTool(context, args));
  }
  if (name === 'read_evidence_fragment') {
    return toolJson(await readEvidenceFragmentTool(context, args));
  }
  if (name === 'read_evidence_catalog') {
    return toolJson(await readEvidenceCatalogTool(context, args));
  }
  if (name === 'read_evidence_issue') {
    return toolJson(await readEvidenceIssueTool(context, args));
  }
  if (name === 'read_evidence_staleness') {
    return toolJson(await readEvidenceStalenessTool(context, args));
  }
  if (name === 'read_agent_handoff') {
    return toolJson(await readAgentHandoffTool(context, args));
  }
  if (name === 'read_evidence_blob') {
    return toolJson(await readEvidenceBlobTool(context, args));
  }
  if (name === 'validate_target_changes') {
    return toolJson(await validateTargetV2Tool(args));
  }
  if (name === 'reconstruct_page_context') return toolJson(await reconstructPageContextTool(context, args));
  if (name === 'read_target_conventions') return toolJson(await getTargetConventionsTool(context, args));
  if (name === 'find_target_examples') return toolJson(await findTargetExamplesTool(context, args));
  if (name === 'validate_ui_build') return toolJson(await validateTargetChangesTool(context, args));

  throw new Error(`Unknown tool: ${name}`);
}
