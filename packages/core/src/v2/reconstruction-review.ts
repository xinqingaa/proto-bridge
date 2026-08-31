import { z } from 'zod';
import {
  ACCEPTANCE_DIMENSIONS,
  type AcceptanceDimension,
  type AcceptanceRequirement,
  type ReconstructionAcceptanceContract,
} from './acceptance-contract.js';

export const ReconstructionReviewObservation = z
  .object({
    requirementId: z.string().min(1),
    status: z.enum(['matched', 'deviation', 'unverified', 'not-applicable']),
    evidence: z.array(z.string().trim().min(1)),
    detail: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((observation, context) => {
    if (
      (observation.status === 'matched' || observation.status === 'deviation') &&
      observation.evidence.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidence'],
        message: `${observation.status} observations require supporting evidence.`,
      });
    }
    if (
      observation.status !== 'matched' &&
      observation.detail === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['detail'],
        message: `${observation.status} observations require a reason.`,
      });
    }
  });
export type ReconstructionReviewObservation = z.infer<
  typeof ReconstructionReviewObservation
>;

export type ReconstructionReviewSummary = {
  validationAuthority: 'consumer-reported-review';
  producerReadiness: ReconstructionAcceptanceContract['readiness'];
  coverageStatus: 'complete' | 'partial';
  visualReviewStatus: 'reviewed' | 'partial';
  reviewCompleteness: {
    status: 'complete' | 'partial';
    requiredObservations: number;
    reportedObservations: number;
    missingRequirementIds: string[];
  };
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
      missingRequirementIds: string[];
    }
  >;
  disclosures: {
    deviations: ReconstructionReviewObservation[];
    unverified: ReconstructionReviewObservation[];
  };
  observations: ReconstructionReviewObservation[];
  humanVerification: {
    screens: Array<{
      screenId: string;
      caseIds: string[];
      screenshotBlobIds: string[];
      findings: Array<{
        requirementId: string;
        caseId: string;
        dimension: AcceptanceDimension;
        status: 'deviation' | 'unverified';
        expected: unknown;
        evidence: string[];
        detail: string;
      }>;
      stateChecks: Array<{
        requirementId: string;
        caseId: string;
        subject: string;
        expected: unknown;
      }>;
    }>;
  };
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
  observations: ReconstructionReviewObservation[];
}): ReconstructionReviewSummary {
  const requirements = ACCEPTANCE_DIMENSIONS.flatMap(
    (dimension) => input.contract.dimensions[dimension],
  );
  const duplicateContractRequirementIds = duplicateValues(
    requirements.map((item) => item.requirementId),
  );
  if (duplicateContractRequirementIds.length > 0) {
    throw new Error(
      `Duplicate contract requirements: ${duplicateContractRequirementIds.join(', ')}.`,
    );
  }
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

  const observations = input.observations.map((item) => {
    const parsed = ReconstructionReviewObservation.parse(item);
    if (!requirementById.has(parsed.requirementId)) {
      throw new Error(`Unknown review requirement ${parsed.requirementId}.`);
    }
    return parsed;
  });
  const duplicateRequirementIds = duplicateValues(
    observations.map((item) => item.requirementId),
  );
  if (duplicateRequirementIds.length > 0) {
    throw new Error(
      `Duplicate review observations: ${duplicateRequirementIds.join(', ')}.`,
    );
  }
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
  const reportedRequirementIds = new Set(
    observations.map((item) => item.requirementId),
  );
  const missingRequirementIds = requirements
    .map((item) => item.requirementId)
    .filter((requirementId) => !reportedRequirementIds.has(requirementId));
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
          missingRequirementIds: guidance
            .map((item) => item.requirementId)
            .filter((requirementId) => !reportedRequirementIds.has(requirementId)),
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
    reviewCompleteness: {
      status:
        missingCaseIds.length === 0 &&
        missingScreenshotBlobIds.length === 0 &&
        missingScenarioCaseIds.length === 0 &&
        missingRequirementIds.length === 0
          ? 'complete'
          : 'partial',
      requiredObservations: requirements.length,
      reportedObservations: observations.length,
      missingRequirementIds,
    },
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
    humanVerification: {
      screens: buildHumanVerificationScreens(
        input.contract,
        requirementById,
        observations,
      ),
    },
  };
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function buildHumanVerificationScreens(
  contract: ReconstructionAcceptanceContract,
  requirementById: ReadonlyMap<string, AcceptanceRequirement>,
  observations: ReconstructionReviewObservation[],
): ReconstructionReviewSummary['humanVerification']['screens'] {
  const screenIds = [
    ...new Set(contract.screenshots.map((item) => item.screenId)),
  ].sort();
  return screenIds.map((screenId) => {
    const screenshots = contract.screenshots.filter(
      (item) => item.screenId === screenId,
    );
    const findings = observations.flatMap((observation) => {
      if (
        observation.status !== 'deviation' &&
        observation.status !== 'unverified'
      ) {
        return [];
      }
      const requirement = requirementById.get(observation.requirementId)!;
      if (requirement.screenId !== screenId) return [];
      return [
        {
          requirementId: requirement.requirementId,
          caseId: requirement.caseId,
          dimension: requirement.dimension,
          status: observation.status,
          expected: requirement.expected,
          evidence: observation.evidence,
          detail: observation.detail!,
        },
      ];
    });
    return {
      screenId,
      caseIds: [...new Set(screenshots.map((item) => item.caseId))].sort(),
      screenshotBlobIds: [
        ...new Set(screenshots.flatMap((item) => item.blobIds)),
      ].sort(),
      findings,
      stateChecks: contract.dimensions.states
        .filter((requirement) => requirement.screenId === screenId)
        .map((requirement) => ({
          requirementId: requirement.requirementId,
          caseId: requirement.caseId,
          subject: requirement.subject,
          expected: humanStateExpected(requirement.expected),
        })),
    };
  });
}

function humanStateExpected(expected: unknown): unknown {
  const value = objectValue(expected);
  if (!value) return expected;
  return {
    ...(value.shell ? { shell: value.shell } : {}),
    ...(value.keyedCollections
      ? { keyedCollections: value.keyedCollections }
      : {}),
    ...(value.values ? { values: value.values } : {}),
  };
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
