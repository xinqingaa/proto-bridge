import { describe, expect, it } from 'vitest';
import {
  analyzeTargetReadiness,
  type TargetResolutionBatch,
} from '../../src/target/index.js';

function batch(kind: 'component' | 'token', statuses: Array<'resolved' | 'candidate' | 'pending'>): TargetResolutionBatch {
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
      ...(status === 'pending' ? { pending: { notice: 'Target 待实现' as const, reason: `${kind}.${index} 未实现` } } : {}),
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

  it('counts pending entries as not ready and lists them apart from unresolved and conflict', () => {
    const report = analyzeTargetReadiness({
      adapter: { id: 'synthetic', supported: true, confidence: 'high', reason: 'synthetic adapter' },
      targetRevisionKey: batch('component', ['resolved']).targetRevisionKey,
      components: batch('component', ['resolved', 'pending']),
      tokens: batch('token', ['pending', 'resolved', 'pending']),
      requiredDimensions: [],
      requiredCaseIds: [],
      authorities: {},
    });
    expect(report.mapping.components.byStatus).toMatchObject({ resolved: 1, pending: 1, unresolved: 0, conflict: 0 });
    expect(report.mapping.tokens.byStatus).toMatchObject({ resolved: 1, pending: 2, unresolved: 0, conflict: 0 });
    expect(report.mapping.tokens.pendingIds).toEqual(['token.0', 'token.2']);
    expect(report.mapping.tokens.unresolvedIds).toEqual([]);
    expect(report.mapping.tokens.conflictIds).toEqual([]);
    expect(report.pending).toEqual({
      count: 3,
      notice: 'Target 待实现',
      items: [
        { id: 'component.1', kind: 'component', reason: 'component.1 未实现' },
        { id: 'token.0', kind: 'token', reason: 'token.0 未实现' },
        { id: 'token.2', kind: 'token', reason: 'token.2 未实现' },
      ],
    });
    expect(report.blockers).toEqual([
      expect.objectContaining({ code: 'mapping-pending', dimension: 'components', ids: ['component.1'] }),
      expect.objectContaining({ code: 'mapping-pending', dimension: 'tokens', ids: ['token.0', 'token.2'] }),
    ]);
    expect(report.implementationReady).toBe(false);
  });

  it('reports an empty pending list when nothing is pending', () => {
    const report = analyzeTargetReadiness({
      adapter: { id: 'synthetic', supported: true, confidence: 'high', reason: 'synthetic adapter' },
      targetRevisionKey: batch('component', []).targetRevisionKey,
      components: batch('component', ['resolved']),
      tokens: batch('token', ['resolved']),
      requiredDimensions: [],
      requiredCaseIds: [],
      authorities: {},
    });
    expect(report.pending).toMatchObject({ count: 0, items: [] });
    expect(report.blockers).toEqual([]);
    expect(report.implementationReady).toBe(true);
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

  it('keeps implementation ready when mappings resolve but runtime inspectors are absent', () => {
    const components = batch('component', ['resolved']);
    const tokens = batch('token', ['resolved']);
    const report = analyzeTargetReadiness({
      adapter: { id: 'synthetic', supported: true, confidence: 'high', reason: 'synthetic adapter' },
      targetRevisionKey: components.targetRevisionKey,
      components,
      tokens,
      requiredDimensions: ['structure', 'components', 'tokens', 'states', 'interactions'],
      requiredCaseIds: ['case-a'],
      authorities: {
        components: { available: true, authority: 'target-component-occurrence-verifier', reason: 'declared' },
        tokens: { available: true, authority: 'target-token-slot-verifier', reason: 'declared' },
        structure: { available: false, authority: 'target-structure-inspector', reason: 'missing' },
        states: { available: false, authority: 'target-state-inspector', reason: 'missing' },
        interactions: { available: false, authority: 'target-scenario-transition-inspector', reason: 'missing' },
      },
    });

    expect(report.implementationReady).toBe(true);
    expect(report.authoritativeReviewReady).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'inspector-missing', dimension: 'structure' }),
      expect.objectContaining({ code: 'inspector-missing', dimension: 'states' }),
      expect.objectContaining({ code: 'inspector-missing', dimension: 'interactions' }),
    ]));
    expect(report.blockers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'case-not-declared' }),
      expect.objectContaining({ code: 'scenario-not-declared' }),
    ]));
  });
});
