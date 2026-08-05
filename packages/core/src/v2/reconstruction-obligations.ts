import { sha1Hex } from './contracts/hash-sha1.js';
import type {
  AcceptanceDimension,
  ReconstructionAcceptanceContract,
} from './acceptance-contract.js';

export const RECONSTRUCTION_OBLIGATION_CONTRACT_VERSION = 1 as const;

export type ReconstructionObligation = {
  obligationId: string;
  dimension: AcceptanceDimension;
  screenId: string;
  caseIds: string[];
  kind: string;
  subject: string;
  expected: unknown;
  evidenceRefs: string[];
};

type PendingObligation = Omit<ReconstructionObligation, 'obligationId' | 'caseIds' | 'evidenceRefs'> & {
  caseIds: Set<string>;
  evidenceRefs: Set<string>;
};

/** Compiles repeated per-Case requirements into a fixed, target-independent Review set. */
export function compileReconstructionObligations(
  contract: ReconstructionAcceptanceContract,
): ReconstructionObligation[] {
  const byIdentity = new Map<string, PendingObligation>();

  for (const dimension of Object.keys(contract.dimensions).sort() as AcceptanceDimension[]) {
    for (const requirement of contract.dimensions[dimension]) {
      const expected = canonicalValue(requirement.expected);
      const identity = canonicalSerialize({
        dimension: requirement.dimension,
        screenId: requirement.screenId,
        kind: requirement.kind,
        subject: requirement.subject,
        expected,
      });
      const existing = byIdentity.get(identity);
      if (existing) {
        existing.caseIds.add(requirement.caseId);
        for (const ref of requirement.evidenceRefs) existing.evidenceRefs.add(ref);
        continue;
      }
      byIdentity.set(identity, {
        dimension: requirement.dimension,
        screenId: requirement.screenId,
        kind: requirement.kind,
        subject: requirement.subject,
        expected,
        caseIds: new Set([requirement.caseId]),
        evidenceRefs: new Set(requirement.evidenceRefs),
      });
    }
  }

  return [...byIdentity.entries()]
    .map(([identity, obligation]) => ({
      obligationId: `obligation-sha1:${sha1Hex(identity)}`,
      dimension: obligation.dimension,
      screenId: obligation.screenId,
      caseIds: [...obligation.caseIds].sort(),
      kind: obligation.kind,
      subject: obligation.subject,
      expected: obligation.expected,
      evidenceRefs: [...obligation.evidenceRefs].sort(),
    }))
    .sort((a, b) =>
      a.screenId.localeCompare(b.screenId)
      || a.dimension.localeCompare(b.dimension)
      || a.kind.localeCompare(b.kind)
      || a.subject.localeCompare(b.subject)
      || a.obligationId.localeCompare(b.obligationId));
}

export function canonicalReconstructionValue(value: unknown): unknown {
  return canonicalValue(value);
}

function canonicalSerialize(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalValue(item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value === undefined ? null : value;
}
