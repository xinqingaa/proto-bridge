import { z } from 'zod';
import {
  ACCEPTANCE_DIMENSIONS,
  type AcceptanceDimension,
  type ReconstructionAcceptanceContract,
} from './acceptance-contract.js';

export const ReconstructionReviewObservation = z
  .object({
    requirementId: z.string().min(1),
    status: z.enum(['matched', 'deviation', 'unverified', 'not-applicable']),
    evidence: z.array(z.string().min(1)).default([]),
    detail: z.string().optional(),
  })
  .strict();
export type ReconstructionReviewObservation = z.infer<
  typeof ReconstructionReviewObservation
>;

export type ReconstructionReviewSummary = {
  validationAuthority: 'consumer-reported-review';
  producerReadiness: ReconstructionAcceptanceContract['readiness'];
  coverageStatus: 'complete' | 'partial';
  visualReviewStatus: 'reviewed' | 'partial';
  coverage: {
    selectedCases: number;
    addressedCases: number;
    missingCaseIds: string[];
    requiredScreenshots: number;
    viewedScreenshots: number;
    missingScreenshotBlobIds: string[];
    requiredScenarioCases: number;
    replayedScenarioCases: number;
    missingScenarioCaseIds: string[];
  };
  cases: Array<{
    caseId: string;
    screenId: string;
    variantId: string;
    addressed: boolean;
    screenshotBlobIds: string[];
    screenshotsViewed: boolean;
    scenarioRequired: boolean;
    scenarioReplayed: boolean;
    reportedObservations: number;
    deviations: number;
    unverified: number;
  }>;
  dimensions: Record<
    AcceptanceDimension,
    {
      guidanceReferences: number;
      reported: number;
      matched: number;
      deviations: number;
      unverified: number;
      notApplicable: number;
    }
  >;
  disclosures: {
    deviations: ReconstructionReviewObservation[];
    unverified: ReconstructionReviewObservation[];
  };
  observations: ReconstructionReviewObservation[];
};

function assertKnownValues(
  label: string,
  supplied: string[],
  known: Set<string>,
): void {
  const unknown = [...new Set(supplied)].filter((value) => !known.has(value));
  if (unknown.length > 0) {
    throw new Error(`Unknown ${label}: ${unknown.join(', ')}.`);
  }
}

export function summarizeReconstructionReview(input: {
  contract: ReconstructionAcceptanceContract;
  addressedCaseIds: string[];
  viewedScreenshotBlobIds: string[];
  replayedScenarioCaseIds: string[];
  observations?: ReconstructionReviewObservation[];
}): ReconstructionReviewSummary {
  const requirements = ACCEPTANCE_DIMENSIONS.flatMap(
    (dimension) => input.contract.dimensions[dimension],
  );
  const requirementById = new Map(
    requirements.map((item) => [item.requirementId, item] as const),
  );
  const casesById = new Map(
    input.contract.screenshots.map((item) => [item.caseId, item] as const),
  );
  const screenshotIds = new Set(
    input.contract.screenshots.flatMap((item) => item.blobIds),
  );
  const scenarioCaseIds = new Set(
    input.contract.screenshots
      .filter((item) => item.scenario)
      .map((item) => item.caseId),
  );

  assertKnownValues('Case IDs', input.addressedCaseIds, new Set(casesById.keys()));
  assertKnownValues(
    'Screenshot Blob IDs',
    input.viewedScreenshotBlobIds,
    screenshotIds,
  );
  assertKnownValues(
    'Scenario Case IDs',
    input.replayedScenarioCaseIds,
    scenarioCaseIds,
  );

  const observations = (input.observations ?? []).map((item) => {
    const parsed = ReconstructionReviewObservation.parse(item);
    if (!requirementById.has(parsed.requirementId)) {
      throw new Error(`Unknown review requirement ${parsed.requirementId}.`);
    }
    return parsed;
  });
  const addressed = new Set(input.addressedCaseIds);
  const viewed = new Set(input.viewedScreenshotBlobIds);
  const replayed = new Set(input.replayedScenarioCaseIds);
  const observationsByCase = new Map<string, ReconstructionReviewObservation[]>();
  for (const observation of observations) {
    const caseId = requirementById.get(observation.requirementId)!.caseId;
    observationsByCase.set(caseId, [
      ...(observationsByCase.get(caseId) ?? []),
      observation,
    ]);
  }

  const missingCaseIds = [...casesById.keys()].filter(
    (caseId) => !addressed.has(caseId),
  );
  const missingScreenshotBlobIds = [...screenshotIds].filter(
    (blobId) => !viewed.has(blobId),
  );
  const missingScenarioCaseIds = [...scenarioCaseIds].filter(
    (caseId) => !replayed.has(caseId),
  );
  const dimensions = Object.fromEntries(
    ACCEPTANCE_DIMENSIONS.map((dimension) => {
      const guidance = input.contract.dimensions[dimension];
      const ids = new Set(guidance.map((item) => item.requirementId));
      const reported = observations.filter((item) => ids.has(item.requirementId));
      return [
        dimension,
        {
          guidanceReferences: guidance.length,
          reported: reported.length,
          matched: reported.filter((item) => item.status === 'matched').length,
          deviations: reported.filter((item) => item.status === 'deviation').length,
          unverified: reported.filter((item) => item.status === 'unverified').length,
          notApplicable: reported.filter((item) => item.status === 'not-applicable')
            .length,
        },
      ];
    }),
  ) as ReconstructionReviewSummary['dimensions'];

  return {
    validationAuthority: 'consumer-reported-review',
    producerReadiness: input.contract.readiness,
    coverageStatus:
      missingCaseIds.length === 0 && missingScenarioCaseIds.length === 0
        ? 'complete'
        : 'partial',
    visualReviewStatus:
      screenshotIds.size > 0 && missingScreenshotBlobIds.length === 0
        ? 'reviewed'
        : 'partial',
    coverage: {
      selectedCases: casesById.size,
      addressedCases: casesById.size - missingCaseIds.length,
      missingCaseIds,
      requiredScreenshots: screenshotIds.size,
      viewedScreenshots: screenshotIds.size - missingScreenshotBlobIds.length,
      missingScreenshotBlobIds,
      requiredScenarioCases: scenarioCaseIds.size,
      replayedScenarioCases: scenarioCaseIds.size - missingScenarioCaseIds.length,
      missingScenarioCaseIds,
    },
    cases: [...casesById.values()].map((item) => {
      const reported = observationsByCase.get(item.caseId) ?? [];
      return {
        caseId: item.caseId,
        screenId: item.screenId,
        variantId: item.variantId,
        addressed: addressed.has(item.caseId),
        screenshotBlobIds: item.blobIds,
        screenshotsViewed:
          item.blobIds.length > 0 && item.blobIds.every((blobId) => viewed.has(blobId)),
        scenarioRequired: Boolean(item.scenario),
        scenarioReplayed: !item.scenario || replayed.has(item.caseId),
        reportedObservations: reported.length,
        deviations: reported.filter((entry) => entry.status === 'deviation').length,
        unverified: reported.filter((entry) => entry.status === 'unverified').length,
      };
    }),
    dimensions,
    disclosures: {
      deviations: observations.filter((item) => item.status === 'deviation'),
      unverified: observations.filter((item) => item.status === 'unverified'),
    },
    observations,
  };
}
