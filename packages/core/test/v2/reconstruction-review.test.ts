import { describe, expect, it } from 'vitest';
import {
  summarizeReconstructionReview,
  type AcceptanceDimension,
  type ReconstructionAcceptanceContract,
} from '../../src/v2/index.js';

function contract(): ReconstructionAcceptanceContract {
  const dimensions = Object.fromEntries(
    (['structure', 'components', 'tokens', 'states', 'interactions'] as const).map(
      (dimension) => [
        dimension,
        dimension === 'interactions'
          ? []
          : [
              {
                requirementId: `${dimension}.reference`,
                caseId: 'sample.screen::default::light::phone',
                screenId: 'sample.screen',
                dimension,
                kind: 'test-reference',
                subject: dimension,
                expected: true,
                evidenceRefs: [`sample.${dimension}`],
              },
            ],
      ],
    ),
  ) as Record<
    AcceptanceDimension,
    ReconstructionAcceptanceContract['dimensions'][AcceptanceDimension]
  >;
  return {
    contractVersion: 1,
    handoffId: 'handoff-sample',
    workspaceId: 'workspace-sample',
    bundleId: 'bundle-sample',
    snapshotId: 'snapshot-sample',
    readiness: { status: 'ready', blockers: [] },
    screenshots: [
      {
        caseId: 'sample.screen::default::light::phone',
        screenId: 'sample.screen',
        variantId: 'default',
        blobIds: ['blob-screenshot'],
      },
    ],
    dimensions,
  };
}

describe('Reconstruction review summary', () => {
  it('reports omitted Cases and Screenshots without inventing a fidelity score', () => {
    const result = summarizeReconstructionReview({
      contract: contract(),
      addressedCaseIds: [],
      viewedScreenshotBlobIds: [],
      replayedScenarioCaseIds: [],
    });
    expect(result.coverageStatus).toBe('partial');
    expect(result.visualReviewStatus).toBe('partial');
    expect(result.coverage.missingCaseIds).toEqual([
      'sample.screen::default::light::phone',
    ]);
    expect(result.coverage.missingScreenshotBlobIds).toEqual([
      'blob-screenshot',
    ]);
    expect(result.dimensions.interactions.guidanceReferences).toBe(0);
    expect(result).not.toHaveProperty('overallScore');
    expect(result).not.toHaveProperty('hardGatesPassed');
  });

  it('keeps an unverified Token as a disclosure instead of failing Case coverage', () => {
    const result = summarizeReconstructionReview({
      contract: contract(),
      addressedCaseIds: ['sample.screen::default::light::phone'],
      viewedScreenshotBlobIds: ['blob-screenshot'],
      replayedScenarioCaseIds: [],
      observations: [
        {
          requirementId: 'tokens.reference',
          status: 'unverified',
          evidence: [],
          detail: 'No exact target Theme token was found.',
        },
      ],
    });
    expect(result.coverageStatus).toBe('complete');
    expect(result.visualReviewStatus).toBe('reviewed');
    expect(result.dimensions.tokens.unverified).toBe(1);
    expect(result.disclosures.unverified).toHaveLength(1);
  });
});
