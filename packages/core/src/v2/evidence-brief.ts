import {
  ACCEPTANCE_DIMENSIONS,
  type AcceptanceDimension,
  type AcceptanceRequirement,
  type ReconstructionAcceptanceContract,
} from './acceptance-contract.js';

export type EvidenceBriefScreenshotGroup = {
  digest: string;
  path: string;
  blobIds: string[];
  cases: Array<{
    caseId: string;
    screenId: string;
    variantId: string;
    checkpointId?: string;
  }>;
};

function compact(value: unknown): string {
  return JSON.stringify(value).replace(/`/g, '\\`');
}

function groupedRequirements(
  requirements: AcceptanceRequirement[],
): Array<AcceptanceRequirement & { caseIds: string[] }> {
  const groups = new Map<
    string,
    AcceptanceRequirement & { caseIds: string[] }
  >();
  for (const requirement of requirements) {
    const key = compact({
      screenId: requirement.screenId,
      kind: requirement.kind,
      subject: requirement.subject,
      expected: requirement.expected,
    });
    const existing = groups.get(key);
    if (existing) {
      if (!existing.caseIds.includes(requirement.caseId)) {
        existing.caseIds.push(requirement.caseId);
      }
    } else {
      groups.set(key, { ...requirement, caseIds: [requirement.caseId] });
    }
  }
  return [...groups.values()];
}

function dimensionSection(
  dimension: AcceptanceDimension,
  requirements: AcceptanceRequirement[],
): string[] {
  const grouped = groupedRequirements(requirements);
  if (grouped.length === 0) return [`## ${dimension}`, '', '- No captured references.', ''];
  const byScreen = new Map<string, typeof grouped>();
  for (const requirement of grouped) {
    byScreen.set(requirement.screenId, [
      ...(byScreen.get(requirement.screenId) ?? []),
      requirement,
    ]);
  }
  return [
    `## ${dimension}`,
    '',
    ...[...byScreen].flatMap(([screenId, items]) => [
      `### ${screenId}`,
      '',
      ...items.map(
        (item) =>
          `- \`${item.subject}\` (${item.kind}) → \`${compact(item.expected)}\`; Cases: ${item.caseIds.map((caseId) => `\`${caseId}\``).join(', ')}`,
      ),
      '',
    ]),
  ];
}

export function reconstructionEvidenceBriefMarkdown(input: {
  contract: ReconstructionAcceptanceContract;
  screenshotGroups: EvidenceBriefScreenshotGroup[];
}): string {
  const duplicateGroups = input.screenshotGroups.filter(
    (group) => group.cases.length > 1,
  );
  const lines = [
    '# Evidence Implementation Brief',
    '',
    `- Handoff: \`${input.contract.handoffId}\``,
    `- Snapshot: \`${input.contract.snapshotId}\``,
    `- Cases with fixed Screenshot references: ${input.contract.screenshots.length}`,
    `- Distinct Screenshot contents: ${input.screenshotGroups.length}`,
    '',
    'This is a compact projection of fixed Evidence for implementation planning. It is not a score, quota, or replacement for reading the Screenshot ImageContent and referenced Facts.',
    '',
    '## Cases and Screenshots',
    '',
    ...input.screenshotGroups.flatMap((group) => [
      `- \`${group.digest}\` → \`${group.path}\``,
      ...group.cases.map(
        (item) =>
          `  - \`${item.caseId}\` (${item.screenId}/${item.variantId}${item.checkpointId ? `/${item.checkpointId}` : ''})`,
      ),
    ]),
    '',
    ...(duplicateGroups.length > 0
      ? [
          '## Identical Screenshot groups',
          '',
          'The following Cases produced byte-identical PNG content. One physical image is retained and all Case references remain explicit. Confirm during planning whether the identical visual state is expected.',
          '',
          ...duplicateGroups.map(
            (group) =>
              `- \`${group.digest}\`: ${group.cases.map((item) => `\`${item.caseId}\``).join(', ')}`,
          ),
          '',
        ]
      : []),
    ...ACCEPTANCE_DIMENSIONS.flatMap((dimension) =>
      dimensionSection(dimension, input.contract.dimensions[dimension]),
    ),
    ...(input.contract.readiness.blockers.length > 0
      ? [
          '## Producer readiness notes',
          '',
          ...input.contract.readiness.blockers.map((blocker) => `- ${blocker}`),
          '',
        ]
      : []),
  ];
  return `${lines.join('\n')}\n`;
}
