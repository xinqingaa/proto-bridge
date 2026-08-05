import { describe, expect, it } from 'vitest';
import {
  ACCEPTANCE_DIMENSIONS,
  type AcceptanceDimension,
  type AcceptanceRequirement,
  type ReconstructionAcceptanceContract,
} from '../../src/v2/acceptance-contract.js';
import { compileReconstructionObligations } from '../../src/review/obligations.js';

function contract(requirements: AcceptanceRequirement[]): ReconstructionAcceptanceContract {
  const dimensions = Object.fromEntries(
    ACCEPTANCE_DIMENSIONS.map((dimension) => [
      dimension,
      requirements.filter((item) => item.dimension === dimension),
    ]),
  ) as Record<AcceptanceDimension, AcceptanceRequirement[]>;
  return {
    contractVersion: 1,
    handoffId: 'handoff-test',
    workspaceId: 'workspace-test',
    bundleId: 'bundle-test',
    snapshotId: 'snapshot-test',
    readiness: { status: 'ready', blockers: [] },
    screenshots: [],
    dimensions,
  };
}

function requirement(input: Partial<AcceptanceRequirement> & Pick<AcceptanceRequirement, 'dimension'>): AcceptanceRequirement {
  return {
    requirementId: input.requirementId ?? `requirement-${input.dimension}`,
    caseId: input.caseId ?? 'screen::default',
    screenId: input.screenId ?? 'screen',
    dimension: input.dimension,
    kind: input.kind ?? `${input.dimension}-kind`,
    subject: input.subject ?? `${input.dimension}-subject`,
    expected: input.expected ?? { value: input.dimension },
    evidenceRefs: input.evidenceRefs ?? [`fact.${input.dimension}`],
  };
}

describe('canonical Reconstruction Obligations', () => {
  it('deduplicates equivalent requirements and preserves every Case and Evidence reference', () => {
    const obligations = compileReconstructionObligations(contract([
      requirement({ dimension: 'structure', caseId: 'screen::a', expected: { parent: 'root', order: 1 }, evidenceRefs: ['fact.a'] }),
      requirement({ dimension: 'structure', caseId: 'screen::b', expected: { order: 1, parent: 'root' }, evidenceRefs: ['fact.b', 'fact.a'] }),
    ]));

    expect(obligations).toHaveLength(1);
    expect(obligations[0]).toMatchObject({
      dimension: 'structure',
      caseIds: ['screen::a', 'screen::b'],
      evidenceRefs: ['fact.a', 'fact.b'],
      expected: { order: 1, parent: 'root' },
    });
  });

  it('produces stable IDs and ordering independent of requirement input order', () => {
    const requirements = ACCEPTANCE_DIMENSIONS.map((dimension) => requirement({ dimension }));
    expect(compileReconstructionObligations(contract(requirements)))
      .toEqual(compileReconstructionObligations(contract([...requirements].reverse())));
  });

  it('emits an obligation for every acceptance dimension', () => {
    const obligations = compileReconstructionObligations(contract(
      ACCEPTANCE_DIMENSIONS.map((dimension) => requirement({ dimension })),
    ));
    expect(new Set(obligations.map((item) => item.dimension)))
      .toEqual(new Set(ACCEPTANCE_DIMENSIONS));
  });
});
