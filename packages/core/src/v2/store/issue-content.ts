import { createHash } from 'node:crypto';
import { IssueId } from '../contracts/ids.js';
import type { Issue } from '../contracts/issue.js';
import type { CaseEvidenceRevision } from '../contracts/evidence.js';
import { V2ContractError } from '../contracts/errors.js';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** An opaque Fact.issueRef; the Issue retains its original logical issueId. */
export function issueContentRef(issue: Issue): string {
  const digest = createHash('sha256').update(canonical(issue)).digest('hex');
  return `${issue.issueId}@sha256:${digest}`;
}

/** Validate before using a reference in a filesystem path. Bare IDs are historical refs only. */
export function assertIssueReference(reference: string): void {
  const [id, digest, ...rest] = reference.split('@');
  IssueId.parse(id);
  if (rest.length || (digest !== undefined && !/^sha256:[a-f0-9]{64}$/.test(digest))) {
    throw new V2ContractError('invalid-schema', `Invalid Issue reference ${reference}.`);
  }
}

export function pinIssueReferences(
  revisions: readonly CaseEvidenceRevision[],
  issues: readonly Issue[],
): CaseEvidenceRevision[] {
  const byId = new Map<string, Map<string, Issue>>();
  for (const issue of issues) {
    const versions = byId.get(issue.issueId) ?? new Map<string, Issue>();
    versions.set(issueContentRef(issue), issue);
    byId.set(issue.issueId, versions);
  }
  return revisions.map((revision) => ({
    ...revision,
    facts: revision.facts.map((fact) => {
      const versions = fact.issueRef ? byId.get(fact.issueRef) : undefined;
      if (!versions) return fact;
      const matching = [...versions].filter(([, issue]) =>
        (issue.affectedCaseIds.length === 0 || issue.affectedCaseIds.includes(revision.caseId)) &&
        (issue.evidenceRefs.length === 0 || issue.evidenceRefs.includes(fact.factId)),
      );
      if (matching.length !== 1) {
        throw new V2ContractError('invalid-schema',
          `Issue ${fact.issueRef} must resolve to one content version for ${revision.caseId}/${fact.factId}.`);
      }
      return { ...fact, issueRef: matching[0]![0] };
    }),
  }));
}
