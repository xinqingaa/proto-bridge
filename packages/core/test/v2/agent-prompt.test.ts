import { describe, expect, it } from 'vitest';
import {
  buildAgentPrompt,
  riskKindLabel,
} from '../../src/v2/prompts/agent-prompt.js';

describe('agent-prompt', () => {
  it('labels known risk kinds in Chinese', () => {
    expect(riskKindLabel('required-unknown')).toBe('存在未证明的必需要素');
    expect(riskKindLabel('partial-coverage')).toBe('覆盖不完整');
  });

  it('embeds fixed refs and risks without embedding legacy full-read payloads', () => {
    const prompt = buildAgentPrompt({
      handoffId: 'handoff-1',
      workspaceId: 'pbwork-local',
      bundleId: 'bundle-1',
      snapshotId: 'snapshot-1',
      targetRoot: '/tmp/flutter_pb_app',
      implementationIntent: '还原任务列表',
      risks: [
        {
          kind: 'required-unknown',
          message: '1 facts remain unknown in revision-1.',
          refs: ['fact-1'],
        },
      ],
    });

    expect(prompt).toContain('handoff-1');
    expect(prompt).toContain('snapshot-1');
    expect(prompt).toContain('/tmp/flutter_pb_app');
    expect(prompt).toContain('还原任务列表');
    expect(prompt).toContain('存在未证明的必需要素');
    expect(prompt).toContain('read_handoff_index');
    expect(prompt).toContain('不得切换到 `active`、`latest`');
    expect(prompt).toContain('# Handoff Consumer');
    expect(prompt).toContain('# Target Contract');
    expect(prompt).toContain('# Implementation Discipline');
    expect(prompt).toContain('# Verification');
    expect(prompt).toContain('# Final Report');
    expect(prompt).toContain('read_evidence_screenshot');
    expect(prompt).toContain('# ProtoBridge Evidence 驱动的页面实现');
    expect(prompt).toContain('当前阶段：只读分析与实现计划');
    expect(prompt).toContain('本阶段不得修改目标工程');
    expect(prompt).not.toContain('read_acceptance_contract');
    expect(prompt).toContain('不得直接进入实施');
    expect(prompt).toContain('Screenshot 是最终可见结果的首要依据');
    expect(prompt).toContain('不要凭经验补造 Evidence 未支持的容器');
    expect(prompt).toContain('仍不确定时记录风险');
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).toContain('adapter 不从 pubspec 或 Dart 用法推断状态库');
    expect(prompt).toContain(
      'Evidence `componentId/role -> target symbol/import/依据`',
    );
    expect(prompt).toContain(
      'Evidence Case/variant/interaction -> target state/navigation',
    );
    expect(prompt).toContain('优先复用目标工程已声明或扫描确认的组件');
    expect(prompt).toContain('相对 Screenshot/Fragment 的已知偏差');
    expect(prompt).toContain('summarize_reconstruction_review');
    expect(prompt).not.toMatch(/目标总分|最低总分|不得低于 80|加权分数/);
    expect(prompt).not.toContain('通用 Flutter 架构');
  });
});
