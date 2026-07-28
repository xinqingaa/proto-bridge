import { describe, expect, it } from 'vitest';
import { AgentHandoff, fixtures } from '../../src/v2/index.js';

const f = fixtures.projectTaskList;

describe('AgentHandoff risk acknowledgement rules', () => {
  it('a Handoff with declared risks but no acknowledgement fails validation', () => {
    const withUnacknowledgedRisk = {
      ...f.HANDOFF,
      coverageStatus: 'partial' as const,
      risks: [{ kind: 'partial-coverage' as const, message: 'Some Cases are missing Evidence.', refs: [] }],
    };
    expect(AgentHandoff.safeParse(withUnacknowledgedRisk).success).toBe(false);
  });

  it('a Handoff with every declared risk kind acknowledged is valid', () => {
    const acknowledged = {
      ...f.HANDOFF,
      coverageStatus: 'partial' as const,
      risks: [{ kind: 'partial-coverage' as const, message: 'Some Cases are missing Evidence.', refs: [] }],
      riskAcknowledgement: { acknowledgedAt: f.T2, acknowledgedRiskKinds: ['partial-coverage' as const] },
    };
    expect(AgentHandoff.safeParse(acknowledged).success).toBe(true);
  });

  it('a Handoff with a partially acknowledged risk set still fails validation', () => {
    const partiallyAcknowledged = {
      ...f.HANDOFF,
      coverageStatus: 'partial' as const,
      risks: [
        { kind: 'partial-coverage' as const, message: 'Some Cases are missing Evidence.', refs: [] },
        { kind: 'stale-evidence' as const, message: 'Some Evidence is stale.', refs: [] },
      ],
      riskAcknowledgement: { acknowledgedAt: f.T2, acknowledgedRiskKinds: ['partial-coverage' as const] },
    };
    expect(AgentHandoff.safeParse(partiallyAcknowledged).success).toBe(false);
  });

  it('a Handoff must select at least one Case; an empty selection is rejected', () => {
    const empty = { ...f.HANDOFF, selectedCases: [] };
    expect(AgentHandoff.safeParse(empty).success).toBe(false);
  });

  it('a Handoff cannot carry Store/Source/target paths or other undeclared fields', () => {
    const withForeignField = { ...f.HANDOFF, storeRootPath: '/Users/me/.proto-bridge/store' };
    expect(AgentHandoff.safeParse(withForeignField).success).toBe(false);
  });
});
