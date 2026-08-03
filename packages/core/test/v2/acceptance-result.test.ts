import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ACCEPTANCE_POLICY,
  evaluateAcceptance,
  type AcceptanceDimension,
  type ReconstructionAcceptanceContract,
} from '../../src/v2/index.js';

function contract(): ReconstructionAcceptanceContract {
  const dimensions = Object.fromEntries(
    (['structure', 'components', 'tokens', 'states', 'interactions'] as const).map(
      (dimension) => [
        dimension,
        [
          {
            requirementId: `${dimension}.required`,
            caseId: 'sample.screen::default::light::phone',
            screenId: 'sample.screen',
            dimension,
            kind: 'test',
            subject: dimension,
            expected: true,
            evidenceRefs: [`sample.${dimension}`],
            critical: true,
          },
        ],
      ],
    ),
  ) as Record<AcceptanceDimension, ReconstructionAcceptanceContract['dimensions'][AcceptanceDimension]>;
  return {
    contractVersion: 1,
    handoffId: 'handoff-sample',
    workspaceId: 'workspace-sample',
    bundleId: 'bundle-sample',
    snapshotId: 'snapshot-sample',
    policy: DEFAULT_ACCEPTANCE_POLICY,
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

describe('Acceptance evaluation', () => {
  it('does not pass missing, unverified or image-unviewed requirements', () => {
    const result = evaluateAcceptance({
      contract: contract(),
      results: [],
      viewedScreenshotBlobIds: [],
    });
    expect(result.status).toBe('failed');
    expect(result.screenshotGate.missingBlobIds).toEqual(['blob-screenshot']);
    expect(result.dimensions.structure.unverified).toBe(1);
    expect(result.criticalFailures).toHaveLength(5);
  });

  it('reaches the target only when every dimension and hard gate passes', () => {
    const result = evaluateAcceptance({
      contract: contract(),
      results: [
        'structure',
        'components',
        'tokens',
        'states',
        'interactions',
      ].map((dimension) => ({
        requirementId: `${dimension}.required`,
        status: 'pass' as const,
        evidence: [`target-test:${dimension}`],
      })),
      viewedScreenshotBlobIds: ['blob-screenshot'],
    });
    expect(result.status).toBe('target-met');
    expect(result.overallScore).toBe(100);
    expect(result.hardGatesPassed).toBe(true);
  });
});
