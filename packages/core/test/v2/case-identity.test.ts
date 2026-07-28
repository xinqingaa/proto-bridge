import { describe, expect, it } from 'vitest';
import { CaseKey, computeCaseId, type ScenarioRef } from '../../src/v2/index.js';

const base = { screenId: 'ledger-planet.task-list', variantId: 'default', themeId: 'light', deviceId: 'iphone-14' };

describe('CaseKey / computeCaseId', () => {
  it('requires all four base dimensions', () => {
    expect(CaseKey.safeParse(base).success).toBe(true);
    const { deviceId: _deviceId, ...missingDevice } = base;
    expect(CaseKey.safeParse(missingDevice).success).toBe(false);
  });

  it('is deterministic and readable for the same Case', () => {
    const id1 = computeCaseId(base);
    const id2 = computeCaseId({ ...base });
    expect(id1).toBe(id2);
    expect(id1).toContain('ledger-planet.task-list');
    expect(id1).toContain('default');
  });

  it('differs when any single dimension differs', () => {
    const id = computeCaseId(base);
    expect(computeCaseId({ ...base, variantId: 'loading' })).not.toBe(id);
    expect(computeCaseId({ ...base, themeId: 'dark' })).not.toBe(id);
    expect(computeCaseId({ ...base, deviceId: 'pixel-7' })).not.toBe(id);
  });

  it('keeps identically named Scenarios from different owner Screens distinct', () => {
    const scenarioOnScreenA: ScenarioRef = { ownerScreenId: 'ledger-planet.task-list', scenarioId: 'checkout', checkpointId: 'confirmed' };
    const scenarioOnScreenB: ScenarioRef = { ownerScreenId: 'ledger-planet.task-detail', scenarioId: 'checkout', checkpointId: 'confirmed' };
    const idA = computeCaseId({ ...base, scenario: scenarioOnScreenA });
    const idB = computeCaseId({ ...base, scenario: scenarioOnScreenB });
    expect(idA).not.toBe(idB);
  });
});
