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
  listEvidenceHistoryTool,
  listEvidenceBundlesTool,
  readAgentHandoffTool,
  readAcceptanceContractTool,
  readCaseDeltaTool,
  readEvidenceDetailTool,
  readHandoffIndexTool,
  readReconstructionObligationsTool,
  readScreenPacketTool,
  summarizeReconstructionReviewTool,
  readEvidenceBlobTool,
  readEvidenceCatalogTool,
  readEvidenceCaseTool,
  readEvidenceFragmentTool,
  readEvidenceIssueTool,
  readEvidenceRevisionTool,
  readEvidenceRunTool,
  readEvidenceScreenshotTool,
  readEvidenceSnapshotTool,
  readEvidenceStalenessTool,
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
const bundle = { bundleId: { type: 'string' } };
const snapshot = {
  ...bundle,
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
  tool('list_evidence_bundles', '列出 Evidence Bundle', '列出 Bundle 与 active Snapshot；后续读取仍必须固定 snapshotId。', {}),
  tool('list_evidence_history', '列出 Bundle 历史', '列出固定 Snapshot、Run、Catalog、Issue、Staleness 与 Handoff。', bundle, ['bundleId']),
  tool('read_evidence_snapshot', '读取固定 Snapshot', '按 bundleId + snapshotId 读取固定证据，不回退到 latest。', snapshot, ['bundleId', 'snapshotId']),
  tool('read_evidence_case', '读取固定 Case', '读取固定 Snapshot 中的 Case、Facts、provenance 与截图引用。', { ...snapshot, caseId: { type: 'string' } }, ['bundleId', 'snapshotId', 'caseId']),
  tool('read_evidence_run', '读取固定 Run', '读取不可变 Run、Selection、Attempt 与 Coverage。', { ...bundle, runId: { type: 'string' } }, ['bundleId', 'runId']),
  tool('read_evidence_revision', '读取固定 revision', '只读取指定 Snapshot 可达的 Evidence revision。', { ...snapshot, revisionId: { type: 'string' } }, ['bundleId', 'snapshotId', 'revisionId']),
  tool('read_evidence_fragment', '读取固定 Fragment', '按稳定 pbId/pbKey 读取 Fragment Facts。', { ...snapshot, revisionId: { type: 'string' }, pbId: { type: 'string' }, pbKey: { type: 'string' } }, ['bundleId', 'snapshotId', 'revisionId', 'pbId']),
  tool('read_evidence_catalog', '读取 Catalog revision', '读取固定 Snapshot 可达的 Catalog revision。', { ...snapshot, catalogRevisionId: { type: 'string' } }, ['bundleId', 'snapshotId', 'catalogRevisionId']),
  tool('read_evidence_issue', '读取 Evidence Issue', '读取固定 Issue 与 next action。', { ...bundle, issueId: { type: 'string' } }, ['bundleId', 'issueId']),
  tool('read_evidence_staleness', '读取 Staleness Report', '读取同时匹配 Bundle 与 Snapshot 的固定报告。', { ...snapshot, reportId: { type: 'string' } }, ['bundleId', 'snapshotId', 'reportId']),
  tool('read_agent_handoff', '读取 Agent Handoff', '读取固定 Workspace/Snapshot/revision refs 与全部 risks。', { handoffId: { type: 'string' } }, ['handoffId']),
  tool('read_handoff_index', '读取 Handoff 索引', '默认消费入口：返回固定引用、全部风险、Screen 顺序、Case/Scenario 计数和 Screenshot digest 分组，不展开完整 Facts 或 Acceptance dimensions。', { handoffId: { type: 'string' } }, ['handoffId']),
  tool('read_screen_packet', '读取 Screen 包', '按固定 Handoff 读取单个 Screen 的 Case/Scenario 地图、baseline、截图分组及可继续查询的结构摘要。', { handoffId: { type: 'string' }, screenId: { type: 'string' } }, ['handoffId', 'screenId']),
  tool('read_case_delta', '读取 Case 差量', '返回指定 Case 相对该 Screen 固定 baseline 的 Fact 与 Screenshot 差量；保留 unknown/conflict 和 Scenario 语义。', { handoffId: { type: 'string' }, screenId: { type: 'string' }, caseId: { type: 'string' } }, ['handoffId', 'screenId', 'caseId']),
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
  tool('read_acceptance_contract', '读取重建 Review 合同', '读取固定 Handoff 派生的选中 Case、Screenshot 与结构、组件、Token、状态、交互证据指引；不包含分数或自动通过判定。', { handoffId: { type: 'string' } }, ['handoffId']),
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
  tool('read_evidence_blob', '读取 Evidence Blob', '读取固定 Snapshot 或 Catalog 可达的 Blob。', { ...snapshot, blobId: { type: 'string' }, catalogRevisionId: { type: 'string' }, allowDebug: { type: 'boolean' } }, ['bundleId', 'snapshotId', 'blobId']),
  tool('read_evidence_screenshot', '查看 Evidence Screenshot', '把固定 Snapshot 中的 Screenshot 作为真正的 MCP 图片返回；传 reviewRunId 时仅在图片读取成功后写入 authoritative viewed receipt。', { ...snapshot, blobId: { type: 'string' }, reviewRunId: { type: 'string' } }, ['bundleId', 'snapshotId', 'blobId']),
  tool('read_target_conventions', '读取目标工程规范', '通过适用的 Target adapter 独立扫描目标工程；结果不进入 Evidence。', { targetRoot: { type: 'string' }, module: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema }),
  tool('find_target_examples', '查找目标工程示例', '通过适用的 Target adapter 查找目标工程既有模式；结果不进入 Evidence。可排除 Control/candidate output，避免实验实现污染示例。', { targetRoot: { type: 'string' }, module: { type: 'string' }, pattern: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema, screenId: { type: 'string' }, limit: { type: 'number' }, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }),
  tool('resolve_target_components', '解析目标组件', '批量解析开放 Evidence component ID；目标文档优先，机器 Contract 不得覆盖政策，resolved 必须通过当前代码校验。', { targetRoot: { type: 'string' }, componentIds: stringArraySchema, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['targetRoot', 'componentIds']),
  tool('resolve_target_tokens', '解析目标 Token', '批量解析开放 Evidence token ID，并校验 accessor、定义、import 与当前目标 revision；启发式结果最多为 candidate。', { targetRoot: { type: 'string' }, tokenIds: stringArraySchema, gitBase: { type: 'string' }, excludePaths: stringArraySchema, candidateOutputRoot: { type: 'string' } }, ['targetRoot', 'tokenIds']),
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
  reviewTool('replay_target_scenario', '回放 Target Scenario', '运行目标工程声明的单 Scenario driver 并记录实际 receipt。', { reviewRunId: { type: 'string' }, caseId: { type: 'string' } }, ['reviewRunId', 'caseId']),
  reviewTool('compare_target_artifacts', '比较 Target artifacts', '生成可视 diff/overlay 和 normalized stop signature；不输出综合分数。', { reviewRunId: { type: 'string' }, attemptId: { type: 'string' }, sourceDigest: { type: 'string' }, targetDigest: { type: 'string' } }, ['reviewRunId', 'attemptId', 'sourceDigest', 'targetDigest']),
  reviewTool('verify_target_claims', '验证 Target Claims', '把固定 obligation 绑定到 Target Structure IR 或精确 Dart occurrence，并记录机器 verifier receipt；不接受 Agent 自填 expected。', {
    reviewRunId: { type: 'string' },
    claims: { type: 'array', minItems: 1, maxItems: 100, items: { oneOf: [
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'structure' }, caseId: { type: 'string' } }, required: ['obligationId', 'dimension', 'caseId'] },
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'components' }, symbol: { type: 'string' }, occurrence: targetOccurrenceSchema, ownerSymbol: { type: 'string' }, targetSlot: { type: 'string' } }, required: ['obligationId', 'dimension', 'symbol', 'occurrence'] },
      { type: 'object', additionalProperties: false, properties: { obligationId: { type: 'string' }, dimension: { const: 'tokens' }, accessor: { type: 'string' }, occurrence: targetOccurrenceSchema, ownerSymbol: { type: 'string' }, targetSlot: { type: 'string' } }, required: ['obligationId', 'dimension', 'accessor', 'occurrence', 'ownerSymbol', 'targetSlot'] },
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
    list_evidence_bundles: () => listEvidenceBundlesTool(context),
    list_evidence_history: () => listEvidenceHistoryTool(context, args),
    read_evidence_snapshot: () => readEvidenceSnapshotTool(context, args),
    read_evidence_case: () => readEvidenceCaseTool(context, args),
    read_evidence_run: () => readEvidenceRunTool(context, args),
    read_evidence_revision: () => readEvidenceRevisionTool(context, args),
    read_evidence_fragment: () => readEvidenceFragmentTool(context, args),
    read_evidence_catalog: () => readEvidenceCatalogTool(context, args),
    read_evidence_issue: () => readEvidenceIssueTool(context, args),
    read_evidence_staleness: () => readEvidenceStalenessTool(context, args),
    read_agent_handoff: () => readAgentHandoffTool(context, args),
    read_handoff_index: () => readHandoffIndexTool(context, args),
    read_screen_packet: () => readScreenPacketTool(context, args),
    read_case_delta: () => readCaseDeltaTool(context, args),
    read_evidence_detail: () => readEvidenceDetailTool(context, args),
    read_reconstruction_obligations: () => readReconstructionObligationsTool(context, args),
    read_acceptance_contract: () => readAcceptanceContractTool(context, args),
    summarize_reconstruction_review: () =>
      summarizeReconstructionReviewTool(context, args),
    read_evidence_blob: () => readEvidenceBlobTool(context, args),
    read_target_conventions: () => getTargetConventionsTool(args),
    find_target_examples: () => findTargetExamplesTool(args),
    resolve_target_components: () => resolveTargetComponentsTool(args),
    resolve_target_tokens: () => resolveTargetTokensTool(args),
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
