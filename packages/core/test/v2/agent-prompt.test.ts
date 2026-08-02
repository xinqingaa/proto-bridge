import { describe, expect, it } from 'vitest';
import {
  buildAgentPrompt,
  riskKindLabel,
} from '../../src/v2/agent-prompt.js';

describe('agent-prompt', () => {
  it('labels known risk kinds in Chinese', () => {
    expect(riskKindLabel('required-unknown')).toBe('存在未证明的必需要素');
    expect(riskKindLabel('partial-coverage')).toBe('覆盖不完整');
  });

  it('embeds fixed Store refs and optional risks into the Agent prompt', () => {
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
    expect(prompt).toContain('read_agent_handoff');
    expect(prompt).toContain('不得切换到 `active`、`latest`');
    expect(prompt).toContain('# Handoff Consumer');
    expect(prompt).toContain('# Target Contract');
    expect(prompt).toContain('# Implementation Discipline');
    expect(prompt).toContain('# Verification');
    expect(prompt).toContain('# Final Report');
    expect(prompt).toContain('Screenshot 必须实际查看');
    expect(prompt).toContain('不得发明证据未支持的容器形态');
    expect(prompt).toContain('不得静默接受会改变构图的组件默认值');
    expect(prompt).toContain('AGENTS.md');
    expect(prompt).toContain('Evidence `componentId/role -> target symbol/import/依据`');
    expect(prompt).toContain('Evidence Case/variant/interaction -> target state/navigation');
    expect(prompt).toContain('不得用外观相似的通用 widget 静默替代');
    expect(prompt).toContain('相对 Screenshot/Fragment 的已知偏差');
    expect(prompt).not.toContain('通用 Flutter 架构');
  });
});
