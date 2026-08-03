import type { JsonObject, JsonValue, ToolContext } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { toolImage, toolJson } from '../server/responses.js';
import { getTargetConventionsTool } from './get-target-conventions.js';
import { findTargetExamplesTool } from './find-target-examples.js';
import { validateTargetChangesTool } from './validate-target.js';
import {
  inspectEvidenceWorkspaceTool,
  listEvidenceHistoryTool,
  listEvidenceBundlesTool,
  readAgentHandoffTool,
  readAcceptanceContractTool,
  evaluateAcceptanceTool,
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

const objectSchema = { type: 'object', additionalProperties: false };
const stringArraySchema = { type: 'array', items: { type: 'string' } };
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
  tool('read_acceptance_contract', '读取五维验收合同', '读取固定 Handoff 派生的结构、组件、Token、状态、交互验收要求与 90/85 门槛。', { handoffId: { type: 'string' } }, ['handoffId']),
  tool('evaluate_acceptance', '计算五维验收结果', '根据固定 Acceptance Contract 计算五维得分；缺少结果自动记为 unverified，critical unverified 不能通过。', {
    handoffId: { type: 'string' },
    viewedScreenshotBlobIds: stringArraySchema,
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          requirementId: { type: 'string' },
          status: { type: 'string', enum: ['pass', 'fail', 'unverified'] },
          evidence: stringArraySchema,
          detail: { type: 'string' },
        },
        required: ['requirementId', 'status', 'evidence'],
      },
    },
  }, ['handoffId', 'viewedScreenshotBlobIds', 'results']),
  tool('read_evidence_blob', '读取 Evidence Blob', '读取固定 Snapshot 或 Catalog 可达的 Blob。', { ...snapshot, blobId: { type: 'string' }, catalogRevisionId: { type: 'string' }, allowDebug: { type: 'boolean' } }, ['bundleId', 'snapshotId', 'blobId']),
  tool('read_evidence_screenshot', '查看 Evidence Screenshot', '把固定 Snapshot 中的 Screenshot 作为真正的 MCP 图片返回；视觉实现必须使用本工具，不得把 Blob metadata 或 base64 文本当作图片。', { ...snapshot, blobId: { type: 'string' } }, ['bundleId', 'snapshotId', 'blobId']),
  tool('read_target_conventions', '读取目标工程规范', '通过适用的 Target adapter 独立扫描目标工程；结果不进入 Evidence。', { targetRoot: { type: 'string' }, module: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema }),
  tool('find_target_examples', '查找目标工程示例', '通过适用的 Target adapter 查找目标工程既有模式；结果不进入 Evidence。', { targetRoot: { type: 'string' }, module: { type: 'string' }, pattern: { type: 'string' }, roles: stringArraySchema, symbols: stringArraySchema, screenId: { type: 'string' }, limit: { type: 'number' } }),
  tool('validate_target_changes', '验证目标工程变更', '通过适用的 Target adapter 只读验证目标变更；目标仓库无需 ProtoBridge 配置。', { targetRoot: { type: 'string' }, gitBase: { type: 'string' }, allowedPaths: stringArraySchema, expectedFiles: stringArraySchema }),
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
    read_acceptance_contract: () => readAcceptanceContractTool(context, args),
    evaluate_acceptance: () => evaluateAcceptanceTool(context, args),
    read_evidence_blob: () => readEvidenceBlobTool(context, args),
    read_target_conventions: () => getTargetConventionsTool(args),
    find_target_examples: () => findTargetExamplesTool(args),
    validate_target_changes: () => validateTargetChangesTool(args),
  };
  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return toolJson(await handler());
}
