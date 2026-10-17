import type { RuntimeSemanticNode } from './protocol.js';

export type ThemeProbeDivergence = {
  nodeId: string;
  fields: string[];
};

function nodeId(node: RuntimeSemanticNode): string {
  return node.fragment.pbKey
    ? `${node.fragment.pbId}#${node.fragment.pbKey}`
    : node.fragment.pbId;
}

function parentId(
  parent: RuntimeSemanticNode['semanticParent'],
): string | undefined {
  if (!parent) return undefined;
  return parent.pbKey ? `${parent.pbId}#${parent.pbKey}` : parent.pbId;
}

function bindingKey(bindings: Record<string, string> | undefined): string {
  const entries = Object.entries(bindings ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return JSON.stringify(entries);
}

/**
 * Compares two semantic snapshots for theme/mode structure only.
 * Coordinates, sizes, text and resolved values are ignored.
 */
export function compareModeSemanticTrees(
  baseline: readonly RuntimeSemanticNode[],
  candidate: readonly RuntimeSemanticNode[],
): ThemeProbeDivergence[] {
  const left = new Map(baseline.map((node) => [nodeId(node), node]));
  const right = new Map(candidate.map((node) => [nodeId(node), node]));
  const ids = [...new Set([...left.keys(), ...right.keys()])].sort();
  const divergences: ThemeProbeDivergence[] = [];
  for (const id of ids) {
    const a = left.get(id);
    const b = right.get(id);
    const fields: string[] = [];
    if (!a || !b) {
      fields.push('presence');
    } else {
      if (a.role !== b.role) fields.push('role');
      if (a.visible !== b.visible) fields.push('visible');
      const aBox = a.bbox.width > 0 && a.bbox.height > 0;
      const bBox = b.bbox.width > 0 && b.bbox.height > 0;
      if (aBox !== bBox) fields.push('bbox');
      if ((a.componentId ?? '') !== (b.componentId ?? '')) {
        fields.push('componentId');
      }
      if (bindingKey(a.tokenBindings) !== bindingKey(b.tokenBindings)) {
        fields.push('tokenBindings');
      }
      if (parentId(a.semanticParent) !== parentId(b.semanticParent)) {
        fields.push('semanticParent');
      }
    }
    if (fields.length > 0) divergences.push({ nodeId: id, fields });
  }
  return divergences;
}
