import type { JsonObject, JsonValue } from '../types.js';
import { readObject, readString } from '../utils/args.js';
import { CONSUMER_GUIDE_URI } from '../consumer-guide.js';

const promptDefinitions = [
  {
    name: 'consume_evidence_handoff',
    description: '按固定 Snapshot/revision 消费 Agent Handoff，实现并验证目标代码。',
    arguments: [
      { name: 'handoffId', description: '持久化 Agent Handoff ID。', required: true },
      { name: 'targetRoot', description: '目标仓库根目录；仓库无需 ProtoBridge 配置。', required: true },
    ],
  },
] satisfies JsonValue[];

export function promptsList(): JsonValue[] {
  return promptDefinitions;
}

export function getPrompt(params: JsonObject | undefined): JsonObject {
  const name = readString(params, 'name');
  const args = readObject(params, 'arguments') ?? {};
  if (name !== 'consume_evidence_handoff') {
    throw new Error(`Unknown prompt: ${name ?? '(missing)'}`);
  }
  const handoffId = readString(args, 'handoffId') ?? '<handoffId>';
  const targetRoot = readString(args, 'targetRoot') ?? '<targetRoot>';
  return {
    description: '按固定 Snapshot/revision 消费 Agent Handoff，实现并验证目标代码。',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: [
            `消费 ProtoBridge Handoff ${handoffId}，目标仓库为 ${targetRoot}。`,
            `先读取 ${CONSUMER_GUIDE_URI} 并严格遵守固定引用顺序。`,
            '调用 inspect_evidence_workspace 和 read_agent_handoff；Workspace 或固定引用不匹配时停止。',
            '编辑前原样报告 mandatoryRiskReport 的全部 risks。',
            '读取 Handoff 固定的 Snapshot、Staleness Report 与具体 revision/Fragment，禁止替换为 active/latest。',
            '读取目标仓库自身规范与既有实现；目标仓库不需要 ProtoBridge 配置。',
            '仅当存在适用 Target adapter/tools 时调用其 conventions/examples 查询；Target 结果不能覆盖或写回 Evidence。',
            '完成实现并运行目标原生检查与测试；仅在适用 adapter 存在时调用其变更校验。',
          ].join('\n'),
        },
      },
    ],
  };
}
