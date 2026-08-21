import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { toolImage, toolJson } from '../server/responses.js';
import { getTargetConventionsTool } from './get-target-conventions.js';
import { findTargetExamplesTool } from './find-target-examples.js';
import { validateTargetChangesTool } from './validate-target.js';
import {
  resolveTargetComponentsTool,
  resolveTargetTokensTool,
} from './resolve-target.js';
import {
  inspectEvidenceWorkspaceTool,
  readCaseDeltaTool,
  readEvidenceDetailTool,
  readHandoffIndexTool,
  readReconstructionObligationsTool,
  readScreenPacketTool,
  readImplementationPlanTool,
  readImplementationTrancheTool,
  summarizeReconstructionReviewTool,
  readEvidenceScreenshotTool,
} from './read-evidence.js';
import { inspectTargetReadinessTool } from './inspect-target-readiness.js';

const objectSchema = { type: 'object', additionalProperties: false };
const stringArraySchema = { type: 'array', items: { type: 'string' } };
const outputSchema = { type: 'object', additionalProperties: true };
const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const snapshot = {
  bundleId: { type: 'string' },
  snapshotId: { type: 'string' },
};

function tool(
  name: string,
  title: string,
  description: string,
  properties: JsonObject,
  required: string[] = [],
): JsonObject {
  return {
    name,
    title,
    description,
    annotations: { title, ...readOnly },
    inputSchema: {
      ...objectSchema,
      properties,
      ...(required.length ? { required } : {}),
    },
    outputSchema,
  };
}

const toolDefinitions: JsonValue[] = [
  tool('inspect_evidence_workspace', '检查 Evidence Workspace', '返回 MCP 当前绑定的逻辑 Workspace。', {}),
  tool('read_handoff_index', '读取 Handoff 索引', '默认消费入口：返回固定引用、全部风险、Screen 顺序、Case/Scenario 计数和 Screenshot digest 分组，不展开完整 Facts 或 Acceptance dimensions。', { handoffId: { type: 'string' } }, ['handoffId']),
  tool('read_screen_packet', '读取 Screen 包', '按固定 Handoff 读取单个 Screen 的 Case/Scenario 地图、紧凑 baseline、canonicalBrief（主滚动/状态矩阵/业务数据）、截图分组，以及按组件/Token、regionId、role、slot 和 caseId 聚合的实施 inventory。', { handoffId: { type: 'string' }, screenId: { type: 'string' } }, ['handoffId', 'screenId']),
  tool('read_implementation_plan', '读取实施计划索引（诊断）', '诊断/Review 辅助：按 Screen 返回 Region tranche、父依赖、caseId 和五维 obligation 计数。不是默认实施路径，不得按 tranche 顺序编码。', { handoffId: { type: 'string' }, screenId: { type: 'string' } }, ['handoffId', 'screenId']),
  tool('read_implementation_tranche', '读取实施 tranche（诊断）', '诊断/Review 辅助：展开单个 Region tranche 绑定的 canonical obligations。不是默认实施路径。', { handoffId: { type: 'string' }, screenId: { type: 'string' }, trancheId: { type: 'string' } }, ['handoffId', 'screenId', 'trancheId']),
  tool('read_case_delta', '读取 Case 差量', '返回指定 Case 相对固定 baseline 的 Region/内容/状态/业务 key/交互语义 patch（使用 regionId/caseId）；Fact 级变化只以压缩的 unresolved/provenance 信号保留。', { handoffId: { type: 'string' }, screenId: { type: 'string' }, caseId: { type: 'string' } }, ['handoffId', 'screenId', 'caseId']),
  tool('read_evidence_detail', '按需读取 Evidence 明细', '只返回指定 Screen 与 projection 的 structure/components/tokens/interactions/provenance 明细；可用稳定 continuation 续读，不按响应字节数截断。', {
    handoffId: { type: 'string' },
    screenId: { type: 'string' },
    projection: { type: 'string', enum: ['structure', 'components', 'tokens', 'interactions', 'provenance'] },
    caseId: { type: 'string' },
    regionIds: stringArraySchema,
    componentIds: stringArraySchema,
    tokenIds: stringArraySchema,
    pageSize: { type: 'integer', minimum: 1 },
    cursor: { type: 'string' },
  }, ['handoffId', 'screenId', 'projection']),
  tool('read_reconstruction_obligations', '读取还原义务', '按固定 Handoff、Screen 和可选维度分页读取去重后的五维 Reconstruction Obligations。', {
    handoffId: { type: 'string' },
    screenId: { type: 'string' },
    dimension: { type: 'string', enum: ['structure', 'components', 'tokens', 'states', 'interactions'] },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    cursor: { type: 'string' },
  }, ['handoffId', 'screenId']),
  tool('summarize_reconstruction_review', '汇总重建 Review', '汇总选中 Case、Screenshot、Scenario、已知偏差和未验证事项；不计算还原分数，也不把组件或 Token 映射当作配额。', {
    handoffId: { type: 'string' },
    addressedCaseIds: stringArraySchema,
    viewedScreenshotBlobIds: stringArraySchema,
    replayedScenarioCaseIds: stringArraySchema,
    observations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          requirementId: { type: 'string' },
          status: { type: 'string', enum: ['matched', 'deviation', 'unverified', 'not-applicable'] },
          evidence: stringArraySchema,
          detail: { type: 'string' },
        },
        required: ['requirementId', 'status', 'evidence'],
      },
    },
  }, ['handoffId', 'addressedCaseIds', 'viewedScreenshotBlobIds', 'replayedScenarioCaseIds', 'observations']),
  tool('read_evidence_screenshot', '查看 Evidence Screenshot', '把固定 Snapshot 中的 Screenshot 作为真正的 MCP 图片返回。', { ...snapshot, blobId: { type: 'string' } }, ['bundleId', 'snapshotId', 'blobId']),
  tool('read_target_conventions', '读取目标工程规范', '通过适用的 Target adapter 独立扫描目标工程；结果不进入 Evidence。', { targetRoot: { type: 'string' }, module: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema }),
  tool('find_target_examples', '查找目标工程示例', '通过适用的 Target adapter 查找目标工程既有模式；结果不进入 Evidence。可排除 Control/candidate output，避免实验实现污染示例。', { targetRoot: { type: 'string' }, module: { type: 'string' }, pattern: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema, screenId: { type: 'string' }, limit: { type: 'number' }, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }),
  tool('resolve_target_components', '解析目标组件', '批量解析开放 Evidence component ID；目标文档优先，机器 Contract 不得覆盖政策，resolved 必须通过当前代码校验。省略 targetRoot 时使用 Workspace delivery.targetRoot。', { targetRoot: { type: 'string' }, componentIds: stringArraySchema, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['componentIds']),
  tool('resolve_target_tokens', '解析目标 Token', '批量解析开放 Evidence token ID，并校验 accessor、定义、import 与当前目标 revision；启发式结果最多为 candidate。省略 targetRoot 时使用 Workspace delivery.targetRoot。', { targetRoot: { type: 'string' }, tokenIds: stringArraySchema, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['tokenIds']),
  tool('inspect_target_readiness', '检查 Target readiness', '编辑前读取固定 Handoff inventory，报告组件/Token resolver 覆盖、五维 machine authority、实施 blockers 和未验证边界；缺少实验性 Runtime authority 不要求修改目标工程。省略 targetRoot 时使用 Workspace delivery.targetRoot。', { handoffId: { type: 'string' }, targetRoot: { type: 'string' }, screenId: { type: 'string' }, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['handoffId']),
  tool('validate_target_changes', '验证目标工程变更', '通过适用的 Target adapter 只读验证目标变更，并复核实际采用的 resolved mapping 仍存在；目标仓库无需 ProtoBridge 配置。', { targetRoot: { type: 'string' }, gitBase: { type: 'string' }, allowedPaths: stringArraySchema, expectedFiles: stringArraySchema, resolvedMappings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, kind: { type: 'string', enum: ['component', 'token'] }, symbol: { type: 'string' }, accessor: { type: 'string' }, importPath: { type: 'string' } }, required: ['id', 'kind'] } } }),
];

export function toolsList(): JsonValue[] {
  return toolDefinitions;
}

export function toolCatalog(): JsonObject {
  return { name: 'ProtoBridge Evidence Consumer', tools: toolDefinitions };
}

export async function callTool(
  context: ToolContext,
  params: JsonObject | undefined,
): Promise<JsonObject> {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};
  if (!name) throw new Error('tools/call requires params.name');

  if (name === 'read_evidence_screenshot') {
    const screenshot = await readEvidenceScreenshotTool(context, args);
    return toolImage({
      data: screenshot.data,
      mimeType: screenshot.mimeType,
      metadata: screenshot.metadata,
    });
  }

  const handlers: Record<string, () => Promise<unknown>> = {
    inspect_evidence_workspace: () => inspectEvidenceWorkspaceTool(context),
    read_handoff_index: () => readHandoffIndexTool(context, args),
    read_screen_packet: () => readScreenPacketTool(context, args),
    read_implementation_plan: () => readImplementationPlanTool(context, args),
    read_implementation_tranche: () => readImplementationTrancheTool(context, args),
    read_case_delta: () => readCaseDeltaTool(context, args),
    read_evidence_detail: () => readEvidenceDetailTool(context, args),
    read_reconstruction_obligations: () => readReconstructionObligationsTool(context, args),
    summarize_reconstruction_review: () =>
      summarizeReconstructionReviewTool(context, args),
    read_target_conventions: () => getTargetConventionsTool(context, args),
    find_target_examples: () => findTargetExamplesTool(context, args),
    resolve_target_components: () => resolveTargetComponentsTool(context, args),
    resolve_target_tokens: () => resolveTargetTokensTool(context, args),
    inspect_target_readiness: () => inspectTargetReadinessTool(context, args),
    validate_target_changes: () => validateTargetChangesTool(context, args),
  };
  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return toolJson(await handler());
}
