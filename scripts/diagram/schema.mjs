export const diagramKinds = new Set(['architecture', 'workflow', 'artifact-loop', 'cover']);

export function createDiagram({
  kind = 'architecture',
  title = 'Untitled diagram',
  subtitle = '',
  nodes = [],
  edges = [],
  groups = [],
  notes = [],
  style = 'proto-bridge',
  metadata = {},
} = {}) {
  return {
    schemaVersion: 1,
    kind: diagramKinds.has(kind) ? kind : 'architecture',
    title,
    subtitle,
    style,
    nodes: nodes.map(normalizeNode),
    edges: edges.map(normalizeEdge),
    groups,
    notes,
    metadata,
  };
}

export function validateDiagram(diagram) {
  const issues = [];
  if (!diagram || typeof diagram !== 'object') issues.push('diagram must be an object');
  if (!diagramKinds.has(diagram?.kind)) issues.push(`unsupported diagram kind: ${diagram?.kind}`);
  if (!Array.isArray(diagram?.nodes)) issues.push('nodes must be an array');
  if (!Array.isArray(diagram?.edges)) issues.push('edges must be an array');

  const ids = new Set();
  for (const node of diagram?.nodes ?? []) {
    if (!node.id) issues.push('node is missing id');
    if (ids.has(node.id)) issues.push(`duplicate node id: ${node.id}`);
    ids.add(node.id);
  }

  for (const edge of diagram?.edges ?? []) {
    if (!ids.has(edge.from)) issues.push(`edge references missing from node: ${edge.from}`);
    if (!ids.has(edge.to)) issues.push(`edge references missing to node: ${edge.to}`);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function normalizeNode(node, index) {
  return {
    id: node.id ?? `node-${index + 1}`,
    title: node.title ?? 'Untitled',
    subtitle: node.subtitle ?? '',
    group: node.group ?? '',
    kind: node.kind ?? 'step',
    tags: Array.isArray(node.tags) ? node.tags : [],
    weight: Number.isFinite(node.weight) ? node.weight : 1,
  };
}

function normalizeEdge(edge) {
  return {
    from: edge.from,
    to: edge.to,
    label: edge.label ?? '',
    kind: edge.kind ?? 'flow',
  };
}
