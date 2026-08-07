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
import {
  compareTargetArtifactsTool,
  finalizeTargetReviewTool,
  readTargetReviewTool,
  readReviewObligationsTool,
  recordReviewFindingsTool,
  recordReviewAssessmentsTool,
  recordScreenshotViewedTool,
  renderTargetCaseTool,
  replayTargetScenarioTool,
  requestReviewTrancheTool,
  startTargetReviewTool,
  verifyTargetClaimsTool,
} from './target-review.js';
import { inspectTargetReadinessTool } from './inspect-target-readiness.js';

const objectSchema = { type: 'object', additionalProperties: false };
const stringArraySchema = { type: 'array', items: { type: 'string' } };
const targetOccurrenceSchema = { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, line: { type: 'integer', minimum: 1 }, column: { type: 'integer', minimum: 1 } }, required: ['path', 'line'] };
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

function reviewTool(name: string, title: string, description: string, properties: JsonObject, required: string[]): JsonObject {
  return {
    name, title, description,
    annotations: { title, readOnlyHint: name === 'read_target_review', destructiveHint: false, idempotentHint: name === 'read_target_review', openWorldHint: true },
    inputSchema: { ...objectSchema, properties, required },
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
  tool('read_evidence_screenshot', '查看 Evidence Screenshot', '把固定 Snapshot 中的 Screenshot 作为真正的 MCP 图片返回；传 reviewRunId 时仅在图片读取成功后写入 authoritative viewed receipt。', { ...snapshot, blobId: { type: 'string' }, reviewRunId: { type: 'string' } }, ['bundleId', 'snapshotId', 'blobId']),
  tool('read_target_conventions', '读取目标工程规范', '通过适用的 Target adapter 独立扫描目标工程；结果不进入 Evidence。', { targetRoot: { type: 'string' }, module: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema }),
  tool('find_target_examples', '查找目标工程示例', '通过适用的 Target adapter 查找目标工程既有模式；结果不进入 Evidence。可排除 Control/candidate output，避免实验实现污染示例。', { targetRoot: { type: 'string' }, module: { type: 'string' }, pattern: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema, screenId: { type: 'string' }, limit: { type: 'number' }, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }),
  tool('resolve_target_components', '解析目标组件', '批量解析开放 Evidence component ID；目标文档优先，机器 Contract 不得覆盖政策，resolved 必须通过当前代码校验。', { targetRoot: { type: 'string' }, componentIds: stringArraySchema, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['targetRoot', 'componentIds']),
  tool('resolve_target_tokens', '解析目标 Token', '批量解析开放 Evidence token ID，并校验 accessor、定义、import 与当前目标 revision；启发式结果最多为 candidate。', { targetRoot: { type: 'string' }, tokenIds: stringArraySchema, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['targetRoot', 'tokenIds']),
  tool('inspect_target_readiness', '检查 Target readiness', '编辑前读取固定 Handoff inventory，报告组件/Token resolver 覆盖、五维 inspector authority、只能 unverified 的维度、Case/Scenario 声明缺口和 Review blockers。', { handoffId: { type: 'string' }, targetRoot: { type: 'string' }, screenId: { type: 'string' }, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['handoffId', 'targetRoot']),
  tool('validate_target_changes', '验证目标工程变更', '通过适用的 Target adapter 只读验证目标变更，并复核实际采用的 resolved mapping 仍存在；目标仓库无需 ProtoBridge 配置。', { targetRoot: { type: 'string' }, gitBase: { type: 'string' }, allowedPaths: stringArraySchema, expectedFiles: stringArraySchema, resolvedMappings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, kind: { type: 'string', enum: ['component', 'token'] }, symbol: { type: 'string' }, accessor: { type: 'string' }, importPath: { type: 'string' } }, required: ['id', 'kind'] } } }),
  reviewTool('start_target_review', '开始 Target Review', '从固定 Handoff 派生独立 authoritative Review Session；必须由 Local Service 持久化。', { handoffId: { type: 'string' }, targetRoot: { type: 'string' }, targetBaselineCommit: { type: 'string' }, targetRevision: { type: 'string' }, reviewRunId: { type: 'string' } }, ['handoffId', 'targetRoot', 'targetBaselineCommit', 'targetRevision']),
  reviewTool('read_target_review', '读取 Target Review', '从 Local Service 恢复并校验 append-only Review event chain。', { reviewRunId: { type: 'string' } }, ['reviewRunId']),
  reviewTool('read_review_obligations', '读取 Review 义务', '按 Screen、维度和 assessment 状态分页读取固定 Review obligations；Review 摘要不内嵌完整验收分母。', {
    reviewRunId: { type: 'string' },
    screenId: { type: 'string' },
    dimension: { type: 'string', enum: ['structure', 'components', 'tokens', 'states', 'interactions'] },
    status: { type: 'string', enum: ['unassessed', 'matched', 'deviation', 'unverified', 'not-applicable'] },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    cursor: { type: 'string' },
  }, ['reviewRunId']),
  reviewTool('render_target_case', '渲染 Target Case', '运行目标工程声明的单 Case Flutter launcher，并记录固定设备与 screenshot receipt。', { reviewRunId: { type: 'string' }, caseId: { type: 'string' }, sourceDigest: { type: 'string' }, tranche: { type: 'integer', minimum: 1 }, round: { type: 'integer', minimum: 1, maximum: 3 }, attemptId: { type: 'string' } }, ['reviewRunId', 'caseId', 'sourceDigest', 'tranche', 'round']),
  reviewTool('replay_target_scenario', '回放 Target Scenario', '运行目标工程声明的单 Scenario driver，并记录 typed pre/action/post/visible-result receipt。', { reviewRunId: { type: 'string' }, caseId: { type: 'string' } }, ['reviewRunId', 'caseId']),
  reviewTool('compare_target_artifacts', '比较 Target artifacts', '生成可视 diff/overlay 和 normalized stop signature；不输出综合分数。', { reviewRunId: { type: 'string' }, attemptId: { type: 'string' }, sourceDigest: { type: 'string' }, targetDigest: { type: 'string' } }, ['reviewRunId', 'attemptId', 'sourceDigest', 'targetDigest']),
  reviewTool('verify_target_claims', '验证 Target Claims', '把固定 obligation 绑定到 Target Structure/State/Scenario IR 或精确 Dart occurrence，并记录机器 verifier receipt；不接受 Agent 自填 expected。', {
    reviewRunId: { type: 'string' },
    claims: { type: 'array', minItems: 1, maxItems: 100, items: { oneOf: [
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'structure' }, caseId: { type: 'string' } }, required: ['obligationId', 'dimension', 'caseId'] },
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'components' }, symbol: { type: 'string' }, occurrence: targetOccurrenceSchema, ownerSymbol: { type: 'string' }, targetSlot: { type: 'string' } }, required: ['obligationId', 'dimension', 'symbol', 'occurrence'] },
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'tokens' }, accessor: { type: 'string' }, occurrence: targetOccurrenceSchema, ownerSymbol: { type: 'string' }, targetSlot: { type: 'string' } }, required: ['obligationId', 'dimension', 'accessor', 'occurrence', 'ownerSymbol', 'targetSlot'] },
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'states' }, caseId: { type: 'string' } }, required: ['obligationId', 'dimension', 'caseId'] },
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'interactions' }, caseId: { type: 'string' } }, required: ['obligationId', 'dimension', 'caseId'] },
    ] } },
  }, ['reviewRunId', 'claims']),
  reviewTool('record_review_findings', '记录 Review findings', '记录 Agent finding；Agent 不能自证 Accepted deviation 或人工完成。', { reviewRunId: { type: 'string' }, findings: { type: 'array', items: { type: 'object', additionalProperties: true } } }, ['reviewRunId', 'findings']),
  reviewTool('record_review_assessments', '核验还原义务', '逐项记录固定还原义务的 matched/deviation/unverified 结论；matched 必须引用 verify_target_claims 返回的成功 verifier receipt。', {
    reviewRunId: { type: 'string' },
    assessments: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, status: { type: 'string', enum: ['matched', 'deviation', 'unverified'] }, detail: { type: 'string' }, evidenceDigests: stringArraySchema, verifierReceiptDigest: { type: 'string' }, targetBasis: { type: 'string' } }, required: ['obligationId', 'status', 'detail', 'evidenceDigests'] } },
  }, ['reviewRunId', 'assessments']),
  reviewTool('request_review_tranche', '应用 Review tranche 授权', '消费由 PBWork/CLI/operator 或 MCP host approval 预先签发的一次性 token；普通参数不能自证授权。', { reviewRunId: { type: 'string' }, approvalToken: { type: 'string' } }, ['reviewRunId', 'approvalToken']),
  reviewTool('finalize_target_review', '人工完成 Target Review', '消费人工一次性确认 token；Reducer 会重新检查全部完成门禁。', { reviewRunId: { type: 'string' }, confirmationToken: { type: 'string' } }, ['reviewRunId', 'confirmationToken']),
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
    await recordScreenshotViewedTool(context, args, screenshot);
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
    read_target_conventions: () => getTargetConventionsTool(args),
    find_target_examples: () => findTargetExamplesTool(args),
    resolve_target_components: () => resolveTargetComponentsTool(args),
    resolve_target_tokens: () => resolveTargetTokensTool(args),
    inspect_target_readiness: () => inspectTargetReadinessTool(context, args),
    validate_target_changes: () => validateTargetChangesTool(args),
    start_target_review: () => startTargetReviewTool(context, args),
    read_target_review: () => readTargetReviewTool(context, args),
    read_review_obligations: () => readReviewObligationsTool(context, args),
    render_target_case: () => renderTargetCaseTool(context, args),
    replay_target_scenario: () => replayTargetScenarioTool(context, args),
    compare_target_artifacts: () => compareTargetArtifactsTool(context, args),
    verify_target_claims: () => verifyTargetClaimsTool(context, args),
    record_review_findings: () => recordReviewFindingsTool(context, args),
    record_review_assessments: () => recordReviewAssessmentsTool(context, args),
    request_review_tranche: () => requestReviewTrancheTool(context, args),
    finalize_target_review: () => finalizeTargetReviewTool(context, args),
  };
  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return toolJson(await handler());
}
