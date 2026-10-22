import { describe, expect, it } from 'vitest';
import { CaseKey, computeCaseId, readCaseIdParts, type ScenarioRef } from '../../src/v2/index.js';

const base = { screenId: 'sample.task-list', variantId: 'default', themeId: 'light', deviceId: 'iphone-14' };

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
    expect(id1).toContain('sample.task-list');
    expect(id1).toContain('default');
  });

  it('differs when any single dimension differs', () => {
    const id = computeCaseId(base);
    expect(computeCaseId({ ...base, variantId: 'loading' })).not.toBe(id);
    expect(computeCaseId({ ...base, themeId: 'dark' })).not.toBe(id);
    expect(computeCaseId({ ...base, deviceId: 'pixel-7' })).not.toBe(id);
  });

  it('separates named themes while keeping legacy IDs byte-for-byte stable', () => {
    expect(computeCaseId(base)).toBe('sample.task-list::default::light::iphone-14');
    expect(computeCaseId({ ...base, theme: 'mechanical' })).not.toBe(computeCaseId({ ...base, theme: 'water' }));
    expect(computeCaseId({ ...base, theme: 'water' })).not.toBe(computeCaseId({ ...base, theme: 'water', themeId: 'dark' }));
  });

  it('reads legacy and themed Scenario qualifiers without relying on their array positions', () => {
    const scenario = { ownerScreenId: 'sample.task-list', scenarioId: 'open.details', checkpointId: 'shown' };
    const key = { ...base, theme: 'water', scenario };
    expect(readCaseIdParts(computeCaseId(key))).toMatchObject({ theme: 'water', scenario: { ref: 'sample.task-list.open.details', checkpointId: 'shown' } });
    expect(readCaseIdParts(computeCaseId(base))).toEqual(base);
    expect(readCaseIdParts('invalid-case')).toBeNull();
    expect(readCaseIdParts(computeCaseId(key) + '@')).toBeNull();
    const long = { ...key, scenario: { ...scenario, ownerScreenId: 'a'.repeat(160), scenarioId: 'b'.repeat(160) } };
    expect(readCaseIdParts(computeCaseId(long))?.scenario?.ref).toBe(long.scenario.ownerScreenId + '.' + long.scenario.scenarioId);
    expect(readCaseIdParts(computeCaseId(key) + '::theme=mechanical')).toBeNull();
  });

  it('keeps identically named Scenarios from different owner Screens distinct', () => {
    const scenarioOnScreenA: ScenarioRef = { ownerScreenId: 'sample.task-list', scenarioId: 'checkout', checkpointId: 'confirmed' };
    const scenarioOnScreenB: ScenarioRef = { ownerScreenId: 'sample.task-detail', scenarioId: 'checkout', checkpointId: 'confirmed' };
    const idA = computeCaseId({ ...base, scenario: scenarioOnScreenA });
    const idB = computeCaseId({ ...base, scenario: scenarioOnScreenB });
    expect(idA).not.toBe(idB);
  });
});
