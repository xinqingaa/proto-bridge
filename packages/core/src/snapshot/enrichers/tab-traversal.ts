import type { PageEvidencePatch } from '../../shared/evidence/types.js';
import type { PageEvidence, PageTabState } from '../../types/index.js';

export function buildTabTraversalEvidence(input: {
  evidence: PageEvidence;
  existingTabStates?: PageTabState[] | undefined;
}): PageEvidencePatch {
  const current = new Set((input.existingTabStates ?? []).map((item) => item.id));
  const inferred = input.evidence.interactions
    .filter((interaction) => interaction.kind === 'tab')
    .map((interaction, index) => {
      const node = input.evidence.nodes.find((item) => item.id === interaction.nodeId);
      const label = interaction.label ?? node?.text;
      const id = node?.id ?? `tab_${index + 1}`;
      return {
        id,
        ...(label ? { label } : {}),
        ...(node?.id ? { nodeId: node.id } : {}),
        state: 'unknown' as const,
        evidence: ['tab interaction heuristic'],
      };
    })
    .filter((item) => !current.has(item.id));

  if (inferred.length === 0) return {};
  return {
    tabStates: inferred,
    provenance: [
      {
        source: 'heuristic',
        fields: ['tabStates'],
      },
    ],
  };
}
