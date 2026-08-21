import type { JsonObject, JsonValue } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { buildAgentPrompt } from '@proto-bridge/core/v2/prompts/agent-prompt';

const promptDefinitions = [
  {
    name: 'consume_evidence_handoff',
    description: '按固定 Handoff 渐进读取 Screen/Case Evidence，实现并验证目标代码。',
    arguments: [
      { name: 'handoffId', description: '持久化 Agent Handoff ID。', required: true },
      { name: 'targetRoot', description: '目标仓库根目录；省略时使用 MCP 绑定的 delivery.targetRoot。', required: false },
    ],
  },
] satisfies JsonValue[];

export function promptsList(): JsonValue[] {
  return promptDefinitions;
}

export function getPrompt(
  params: JsonObject | undefined,
  boundTargetRoot?: string,
): JsonObject {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};
  if (name !== 'consume_evidence_handoff') {
    throw new Error(`Unknown prompt: ${name ?? '(missing)'}`);
  }
  const handoffId = readString(args, 'handoffId') ?? '<handoffId>';
  const targetRoot =
    readString(args, 'targetRoot') ?? boundTargetRoot ?? '<targetRoot>';
  const text = buildAgentPrompt({
    handoffId,
    workspaceId: '<verify via inspect_evidence_workspace>',
    bundleId: '<read from fixed Handoff>',
    snapshotId: '<read from fixed Handoff>',
    targetRoot,
  });
  return {
    description: '按固定 Handoff 渐进读取 Screen/Case Evidence，实现并验证目标代码。',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text,
        },
      },
    ],
  };
}
