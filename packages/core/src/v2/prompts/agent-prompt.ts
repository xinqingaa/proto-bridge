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
## Consumer contract

${sections}

先给出 Evidence 理解摘要。只有任务明确要求确认或存在真实阻塞时才暂停；否则继续完成实现与验证。
`;
}

export function isRiskKind(value: string): value is RiskKind {
  return (RISK_KINDS as readonly string[]).includes(value);
}
