import type { Risk } from './contracts/handoff.js';
import { RISK_KINDS, type RiskKind } from './contracts/vocabulary.js';

export const RISK_KIND_LABELS: Record<RiskKind, string> = {
  'partial-coverage': '覆盖不完整',
  'stale-evidence': '证据可能过期',
  'required-unknown': '存在未证明的必需要素',
  'unresolved-conflict': '存在未解决冲突',
  'evidence-level-limitation': '证据级别受限',
  'manual-promotion': '含人工提升项',
  'interaction-coverage': '交互覆盖不完整',
};

export function riskKindLabel(kind: RiskKind | string): string {
  return RISK_KIND_LABELS[kind as RiskKind] ?? kind;
}

export type BuildAgentPromptInput = {
  handoffId: string;
  workspaceId: string;
  bundleId: string;
  snapshotId: string;
  targetRoot: string;
  /** Optional producer intent echoed into the prompt. */
  implementationIntent?: string;
  /** Risks already fixed on the Handoff; listed for the Agent before edits. */
  risks?: readonly Risk[];
};

/**
 * Builds the markdown Agent prompt for Cursor / Codex consumption.
 * Deliveries are Store indexes only; MCP still reads Evidence
 * from the configured Store via the fixed Handoff / Snapshot IDs below.
 */
export function buildAgentPrompt(input: BuildAgentPromptInput): string {
  const intentBlock = input.implementationIntent?.trim()
    ? `\n实现意图：${input.implementationIntent.trim()}\n`
    : '';
  const riskBlock =
    input.risks && input.risks.length > 0
      ? [
          '',
          '交接已记录的 mandatory risks（编辑前原样报告）：',
          ...input.risks.map(
            (risk) =>
              `- ${riskKindLabel(risk.kind)}（${risk.kind}）：${risk.message}`,
          ),
          '',
        ].join('\n')
      : '';

  return `# ProtoBridge Agent 验收任务

通过已配置的 ProtoBridge MCP 消费固定 Evidence。目标工程是：

\`${input.targetRoot}\`
${intentBlock}
固定引用：

- Workspace：\`${input.workspaceId}\`
- Handoff：\`${input.handoffId}\`
- Bundle：\`${input.bundleId}\`
- Snapshot：\`${input.snapshotId}\`
${riskBlock}
先完成只读阶段，不要立即修改代码：

1. 读取资源 \`proto-bridge://guides/handoff-consumer\`，并遵守其中的实现纪律。
2. 调用 \`inspect_evidence_workspace\` 并核对 Workspace。
3. 调用 \`read_agent_handoff\`，在编辑前原样报告全部 \`mandatoryRiskReport\`。
4. 读取 Handoff 固定的 Snapshot、Staleness Report、Case、revision、Fragment 和 Screenshot；不得切换到 active/latest。Screenshot 必须实际查看，不得只靠文本 facts 推断构图。
5. 调用 \`read_target_conventions\` 与 \`find_target_examples\`，说明会复用哪些目标工程模式；Target 结果不是 Source Evidence，不得覆盖 Screenshot / Fragment。
6. 先给出 Evidence 理解摘要并等待我确认。摘要须包含：结构树、关键区域构图、将实现 / 将不实现（证据不足）、以及拟采用的布局敏感默认值及其依据。

实现纪律（详见 handoff-consumer）：

- 以 Screenshot 与 Fragment 结构/token 为硬约束；不得发明证据未支持的容器形态、文案、交互或状态。
- Evidence 未给出的布局敏感 prop，须对照截图；仍不确定则写入剩余风险，不得 silent 使用会改变构图的组件默认值。
- 允许自行决定文件落点、路由接线和既有 Common*/Theme 映射；不允许用熟悉 UI 套路替换已证明的结构。

确认后进入实现阶段：

1. 只修改与 Handoff 实现范围相关的文件。
2. 使用目标工程现有 Theme、路由和公共组件。
3. 实现后对照 Screenshot / 关键文案 / 场景导航自检，再运行 \`flutter analyze\` 与 \`flutter test\`。
4. 调用 \`validate_target_changes\`。
5. 最终报告固定 Handoff/Snapshot/revision、原始风险、修改文件、测试结果、相对 Evidence 的已知偏差和剩余风险。
`;
}

export function isRiskKind(value: string): value is RiskKind {
  return (RISK_KINDS as readonly string[]).includes(value);
}
