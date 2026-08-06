import type { Risk } from '../contracts/handoff.js';
import { RISK_KINDS, type RiskKind } from '../contracts/vocabulary.js';
import { PROMPT_ASSETS } from './generated-assets.js';

export const RISK_KIND_LABELS: Record<RiskKind, string> = {
  'partial-coverage': '覆盖不完整',
  'stale-evidence': '证据可能过期',
  'required-unknown': '存在未证明的必需要素',
  'unresolved-conflict': '存在未解决冲突',
  'evidence-level-limitation': '证据级别受限',
  'manual-promotion': '含人工提升项',
  'interaction-coverage': '交互覆盖不完整',
  'reconstruction-readiness': '高保真重建合同不完整',
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
  const sections = [
    PROMPT_ASSETS['handoff-consumer'],
    PROMPT_ASSETS['target-contract'],
    PROMPT_ASSETS['implementation-discipline'],
    PROMPT_ASSETS['verification'],
    PROMPT_ASSETS['final-report'],
  ].join('\n\n');

  return `# ProtoBridge Evidence 驱动的页面实现

通过已配置的 ProtoBridge MCP 消费固定 Evidence。目标工程是：

\`${input.targetRoot}\`
${intentBlock}
固定引用：

- Workspace：\`${input.workspaceId}\`
- Handoff：\`${input.handoffId}\`
- Bundle：\`${input.bundleId}\`
- Snapshot：\`${input.snapshotId}\`
${riskBlock}
## 当前阶段：只读分析与实现计划

本阶段不得修改目标工程、生成代码或执行会改变目标工程状态的命令。完成 Evidence 阅读、目标工程扫描后，按 Screen 用简短散文给出 Evidence 理解摘要，并附实现计划，然后必须暂停，等待用户明确批准。摘要与计划应覆盖主结构与滚动边界、组件与 Token 落点意向、状态与交互覆盖、预计修改文件、验证方式和剩余风险；用白话说明，不要写成评分表、逐项配额或固定模版。

用户批准后，在同一任务中继续实施与验证，并始终使用下面固定的 Handoff/Snapshot。

## Consumer contract

${sections}

当前轮只输出按 Screen 的 Evidence 理解摘要和实现计划，然后暂停等待用户确认；不得直接进入实施。
`;
}

export function isRiskKind(value: string): value is RiskKind {
  return (RISK_KINDS as readonly string[]).includes(value);
}
