import { z } from 'zod';
import {
  ACCEPTANCE_DIMENSIONS,
  type AcceptanceDimension,
  type ReconstructionAcceptanceContract,
} from './acceptance-contract.js';

export const AcceptanceRequirementResult = z
  .object({
    requirementId: z.string().min(1),
    status: z.enum(['pass', 'fail', 'unverified']),
    evidence: z.array(z.string().min(1)).default([]),
    detail: z.string().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === 'pass' && value.evidence.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidence'],
        message: 'A passing requirement must cite concrete validation evidence.',
      });
    }
  });
export type AcceptanceRequirementResult = z.infer<
  typeof AcceptanceRequirementResult
>;

export type AcceptanceEvaluation = {
  validationAuthority: 'evidence-cited-submission';
  status: 'target-met' | 'minimum-met' | 'failed';
  targetScore: number;
  minimumScore: number;
  overallScore: number;
  hardGatesPassed: boolean;
  screenshotGate: {
    required: number;
    viewed: number;
    missingBlobIds: string[];
  };
  criticalFailures: string[];
  dimensions: Record<
    AcceptanceDimension,
    {
      weight: number;
      total: number;
      pass: number;
      fail: number;
      unverified: number;
      score: number;
      floorMet: boolean;
    }
  >;
  results: AcceptanceRequirementResult[];
};

export function evaluateAcceptance(input: {
  contract: ReconstructionAcceptanceContract;
  results: AcceptanceRequirementResult[];
  viewedScreenshotBlobIds: string[];
}): AcceptanceEvaluation {
  const allRequirements = ACCEPTANCE_DIMENSIONS.flatMap(
    (dimension) => input.contract.dimensions[dimension],
  );
  const knownIds = new Set(allRequirements.map((item) => item.requirementId));
  const supplied = new Map(
    input.results.map((result) => {
      const parsed = AcceptanceRequirementResult.parse(result);
      if (!knownIds.has(parsed.requirementId)) {
        throw new Error(`Unknown Acceptance requirement ${parsed.requirementId}.`);
      }
      return [parsed.requirementId, parsed] as const;
    }),
  );
  const results = allRequirements.map(
    (requirement): AcceptanceRequirementResult =>
      supplied.get(requirement.requirementId) ?? {
        requirementId: requirement.requirementId,
        status: 'unverified',
        evidence: [],
        detail: 'No validation result was supplied.',
      },
  );
  const resultById = new Map(
    results.map((result) => [result.requirementId, result] as const),
  );
  const dimensions = Object.fromEntries(
    ACCEPTANCE_DIMENSIONS.map((dimension) => {
      const requirements = input.contract.dimensions[dimension];
      const statuses = requirements.map(
        (requirement) => resultById.get(requirement.requirementId)!.status,
      );
      const pass = statuses.filter((status) => status === 'pass').length;
      const fail = statuses.filter((status) => status === 'fail').length;
      const unverified = statuses.filter(
        (status) => status === 'unverified',
      ).length;
      const score = requirements.length === 0
        ? 0
        : Math.round((pass / requirements.length) * 1000) / 10;
      return [
        dimension,
        {
          weight: input.contract.policy.weights[dimension],
          total: requirements.length,
          pass,
          fail,
          unverified,
          score,
          floorMet: score >= input.contract.policy.minimumDimensionScore,
        },
      ];
    }),
  ) as AcceptanceEvaluation['dimensions'];
  const overallScore =
    Math.round(
      ACCEPTANCE_DIMENSIONS.reduce(
        (total, dimension) =>
          total +
          dimensions[dimension].score *
            (input.contract.policy.weights[dimension] / 100),
        0,
      ) * 10,
    ) / 10;

  const viewed = new Set(input.viewedScreenshotBlobIds);
  const requiredScreenshotIds = [
    ...new Set(input.contract.screenshots.flatMap((item) => item.blobIds)),
  ];
  const missingBlobIds = requiredScreenshotIds.filter(
    (blobId) => !viewed.has(blobId),
  );
  const criticalFailures = allRequirements
    .filter((requirement) => requirement.critical)
    .filter(
      (requirement) =>
        resultById.get(requirement.requirementId)?.status !== 'pass',
    )
    .map((requirement) => requirement.requirementId);
  const hardGatesPassed =
    input.contract.readiness.status === 'ready' &&
    missingBlobIds.length === 0 &&
    criticalFailures.length === 0 &&
    ACCEPTANCE_DIMENSIONS.every(
      (dimension) => dimensions[dimension].floorMet,
    );
  const status =
    hardGatesPassed && overallScore >= input.contract.policy.targetScore
      ? 'target-met'
      : hardGatesPassed && overallScore >= input.contract.policy.minimumScore
        ? 'minimum-met'
        : 'failed';
  return {
    validationAuthority: 'evidence-cited-submission',
    status,
    targetScore: input.contract.policy.targetScore,
    minimumScore: input.contract.policy.minimumScore,
    overallScore,
    hardGatesPassed,
    screenshotGate: {
      required: requiredScreenshotIds.length,
      viewed: requiredScreenshotIds.length - missingBlobIds.length,
      missingBlobIds,
    },
    criticalFailures,
    dimensions,
    results,
  };
}
