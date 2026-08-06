import { describe, expect, it } from 'vitest';
import {
  analyzeTargetReadiness,
  type TargetResolutionBatch,
} from '../../src/target/index.js';

function batch(kind: 'component' | 'token', statuses: Array<'resolved' | 'candidate'>): TargetResolutionBatch {
  return {
    adapterId: 'synthetic',
    supported: true,
    kind,
    targetRevisionKey: {
      targetRootRealpath: '/tmp/synthetic-target',
      currentRevision: 'head',
      contentDigest: 'sha256:target',
    },
    resolutions: statuses.map((status, index) => ({
      id: `${kind}.${index}`,
      kind,
      status,
      declarationSources: [],
      candidates: [],
      validation: { exists: true, importable: true, signatureCompatible: true, usageFound: true, details: [] },
      reason: status,
      nextQueries: [],
    })),
    policySources: [],
    warnings: [],
  };
}

describe('target readiness analyzer', () => {
  it('separates resolver coverage from machine authority and reports blockers', () => {
    const report = analyzeTargetReadiness({
      adapter: { id: 'synthetic', supported: true, confidence: 'high', reason: 'synthetic adapter' },
      targetRevisionKey: batch('component', ['resolved']).targetRevisionKey,
      components: batch('component', ['resolved']),
      tokens: batch('token', ['candidate']),
      requiredDimensions: ['structure', 'components', 'tokens', 'states', 'interactions'],
      requiredCaseIds: ['case-a'],
      declaredCaseIds: ['case-a'],
      requiredScenarioIds: ['scenario-a'],
      declaredScenarioIds: ['scenario-a'],
      authorities: {
        components: { available: true, authority: 'target-component-occurrence-verifier', reason: 'declared' },
        tokens: { available: true, authority: 'target-token-slot-verifier', reason: 'declared' },
        structure: { available: false, authority: 'target-structure-inspector', reason: 'missing' },
        states: { available: true, authority: 'target-state-inspector', reason: 'declared' },
        interactions: { available: true, authority: 'target-scenario-transition-inspector', reason: 'declared' },
      },
    });
    expect(report.mapping.tokens.byStatus.candidate).toBe(1);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'mapping-candidate', dimension: 'tokens' }),
      expect.objectContaining({ code: 'inspector-missing', dimension: 'structure' }),
    ]));
    expect(report.dimensions.structure.status).toBe('unverified');
    expect(report.authoritativeReviewReady).toBe(false);
  });

  it('blocks undeclared Cases and Scenarios without guessing from code', () => {
    const base = batch('component', []);
    const report = analyzeTargetReadiness({
      adapter: { id: 'synthetic', supported: true, confidence: 'high', reason: 'synthetic adapter' },
      targetRevisionKey: base.targetRevisionKey,
      components: base,
      tokens: { ...base, kind: 'token' },
      requiredDimensions: ['interactions'],
      requiredCaseIds: ['case-a'],
      declaredCaseIds: [],
      requiredScenarioIds: ['scenario-a'],
      declaredScenarioIds: [],
      authorities: { interactions: { available: true, authority: 'target-scenario-transition-inspector', reason: 'declared' } },
    });
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'case-not-declared', ids: ['case-a'] }),
      expect.objectContaining({ code: 'scenario-not-declared', ids: ['scenario-a'] }),
    ]));
  });
});
