import type {
  PageCanonical,
  PageSnapshotNode,
  SnapshotNodeRole,
  VueSemanticComponent,
  VueTemplateSection,
} from '../../../types/index.js';

export function parseCssNumber(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function roundCssNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sourceSections(evidence: PageCanonical): VueTemplateSection[] {
  return evidence.sourceFacts?.analysis.sfc?.sections ?? [];
}

export function sourceComponents(evidence: PageCanonical): VueSemanticComponent[] {
  return evidence.sourceFacts?.analysis.sfc?.components ?? [];
}

export function sourceSectionRole(section: VueTemplateSection): SnapshotNodeRole {
  const map: Record<VueTemplateSection['kind'], SnapshotNodeRole> = {
    'app-bar': 'app-bar',
    'tab-bar': 'tab-bar',
    section: 'section',
    list: 'list',
    chart: 'section',
    'bottom-bar': 'bottom-bar',
    modal: 'modal',
    unknown: 'unknown',
  };
  return map[section.kind] ?? 'section';
}

export function sourceComponentRole(component: VueSemanticComponent): SnapshotNodeRole {
  const map: Record<VueSemanticComponent['role'], SnapshotNodeRole> = {
    header: 'app-bar',
    tabs: 'tab-bar',
    'section-tabs': 'tab-bar',
    summary: 'section',
    'content-section': 'section',
    list: 'list',
    chart: 'section',
    'bottom-actions': 'bottom-bar',
    modal: 'modal',
    unknown: 'unknown',
  };
  return map[component.role] ?? 'section';
}

export function sourceSectionHint(section: VueTemplateSection): string {
  return [
    `根据 source semantic section 迁移 ${section.kind} 区块。`,
    section.title ? `标题/语义：${section.title}。` : '',
    section.selector ? `来源 selector：${section.selector}。` : '',
    section.evidence ? `证据：${section.evidence}` : '',
  ].filter(Boolean).join(' ');
}

export function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectStrings(item));
  }
  return [];
}

export function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

export function createPlanId(pageId: string): string {
  return `plan_${pageId.replace(/^evidence_/, '')}_${Date.now().toString(36)}`;
}

export function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(item);
  }
  return result;
}

export function collectDescendants(root: PageSnapshotNode, byId: Map<string, PageSnapshotNode>): PageSnapshotNode[] {
  const result: PageSnapshotNode[] = [];
  const stack = [root];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    result.push(node);
    for (const childId of node.children) {
      const child = byId.get(childId);
      if (child) stack.push(child);
    }
  }
  return result;
}
