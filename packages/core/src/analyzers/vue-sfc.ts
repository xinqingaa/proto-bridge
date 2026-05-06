import type { VueInteractionHint, VueSfcAnalysis, VueTemplateSection } from '../types/index.js';

export type VueSfcSections = {
  template?: string | undefined;
  script?: string | undefined;
  styleBlocks: string[];
};

export function extractVueSfcSections(sourceCode: string | undefined): VueSfcSections {
  if (!sourceCode) return { styleBlocks: [] };

  return {
    template: firstBlock(sourceCode, 'template'),
    script: firstBlock(sourceCode, 'script'),
    styleBlocks: allBlocks(sourceCode, 'style'),
  };
}

export function analyzeVueSfc(sourceCode: string | undefined): VueSfcAnalysis {
  const sections = extractVueSfcSections(sourceCode);
  const template = sections.template ?? '';
  const script = sections.script ?? '';
  const styleText = sections.styleBlocks.join('\n');

  return {
    ...sections,
    sections: inferTemplateSections(template, styleText),
    interactions: inferInteractions(template, script),
    fixedBottom: hasFixedBottomBar(template, styleText),
  };
}

function inferTemplateSections(template: string, styleText: string): VueTemplateSection[] {
  const sections: VueTemplateSection[] = [];
  const seen = new Set<string>();

  for (const tag of topLevelTags(template)) {
    addSection(sections, seen, sectionFromTag(tag));
  }

  for (const tag of tagsWithClass(template, /(?:^|[-_\s])(section|card|panel|list|chart|tab|tabs|header|nav|bottom-bar|footer|modal|popup|sheet)(?:[-_\s]|$)/i)) {
    addSection(sections, seen, sectionFromTag(tag));
  }

  for (const tag of tagsWithTitle(template)) {
    addSection(sections, seen, sectionFromTag(tag));
  }

  if (hasFixedBottomBar(template, styleText)) {
    addSection(sections, seen, {
      name: 'BottomBar',
      kind: 'bottom-bar',
      selector: findBottomSelector(template, styleText),
      evidence: 'template/style contains an explicit fixed bottom action area',
    });
  }

  return filterNoisySections(sections).slice(0, 12);
}

function sectionFromTag(tag: TemplateTag): VueTemplateSection {
  const className = tag.attrs.className;
  const title = extractSectionTitle(tag.inner);
  const kind = inferSectionKind(tag, title);
  const name = title ? toPascalCase(title) : selectorToName(className ?? tag.name);
  const selector = className ? `.${firstClass(className)}` : tag.name;

  return {
    name: ensureSectionSuffix(name, kind),
    kind,
    selector,
    title,
    evidence: evidenceFor(tag, title),
  };
}

function inferSectionKind(tag: TemplateTag, title: string | undefined): VueTemplateSection['kind'] {
  const haystack = `${tag.name} ${tag.attrs.className ?? ''} ${title ?? ''}`.toLowerCase();
  if (/page\b|screen\b/.test(haystack)) return 'unknown';
  if (/section-title|divider|kv-(?:row|label|value|group)/.test(haystack)) return 'unknown';
  if (/bottom-bar|footer/.test(haystack)) return 'bottom-bar';
  if (/modal|popup|sheet|dialog/.test(haystack)) return 'modal';
  if (/app-bar|navbar|nav-bar|header|toolbar/.test(haystack)) return 'app-bar';
  if (/tabs?|tab-bar/.test(haystack)) return 'tab-bar';
  if (/chart|kline|donut|bar-chart|trend/.test(haystack)) return 'chart';
  if (/list|rows?|table|holdings?/.test(haystack) || /\bv-for\b/.test(tag.raw)) return 'list';
  if (/section|card|panel|profile|objective|history|metrics?|info/.test(haystack)) return 'section';
  return 'unknown';
}

function inferInteractions(template: string, script: string): VueInteractionHint[] {
  const interactions: VueInteractionHint[] = [];
  collectMatches(template, /@click(?:\.\w+)*\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'click',
    target: match[1],
    evidence: `@click=\"${match[1]}\"`,
  }), interactions);
  collectMatches(template, /v-model(?::[\w-]+)?\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'model',
    target: match[1],
    evidence: `v-model=\"${match[1]}\"`,
  }), interactions);
  collectMatches(template, /v-if\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'conditional',
    target: match[1],
    evidence: `v-if=\"${match[1]}\"`,
  }), interactions);
  collectMatches(template, /v-for\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'loop',
    target: match[1],
    evidence: `v-for=\"${match[1]}\"`,
  }), interactions);
  collectMatches(script, /\b(ref|reactive)\s*\(/g, (match) => ({
    kind: 'state',
    target: match[1],
    evidence: `${match[1]}(...)`,
  }), interactions);
  collectMatches(script, /\bcomputed\s*\(/g, () => ({
    kind: 'computed',
    evidence: 'computed(...)',
  }), interactions);
  collectMatches(script, /\bwatch\s*\(/g, () => ({
    kind: 'watch',
    evidence: 'watch(...)',
  }), interactions);

  return dedupeInteractions(interactions).slice(0, 40);
}

function hasFixedBottomBar(template: string, styleText: string): boolean {
  if (/class\s*=\s*"[^"]*(?:bottom-bar|footer-action|fixed-footer|trade-action)[^"]*"/i.test(template)) return true;
  return /\.(?:[\w-]*bottom-bar|[\w-]*footer-action|[\w-]*fixed-footer|[\w-]*trade-action)[\s\S]*?position\s*:\s*fixed[\s\S]*?bottom\s*:\s*0/i.test(styleText);
}

function findBottomSelector(template: string, styleText: string): string | undefined {
  const classMatch = template.match(/class\s*=\s*"([^"]*(?:bottom-bar|footer-action|fixed-footer|trade-action)[^"]*)"/i);
  if (classMatch?.[1]) return `.${firstClass(classMatch[1])}`;
  const styleMatch = styleText.match(/\.([\w-]*(?:bottom-bar|footer-action|fixed-footer|trade-action)[\w-]*)/i);
  return styleMatch?.[1] ? `.${styleMatch[1]}` : undefined;
}

function tagsWithClass(template: string, classPattern: RegExp): TemplateTag[] {
  return allTags(template).filter((tag) => tag.attrs.className && classPattern.test(tag.attrs.className));
}

function tagsWithTitle(template: string): TemplateTag[] {
  return allTags(template).filter((tag) => extractSectionTitle(tag.inner) && !/page\b|screen\b/i.test(tag.attrs.className ?? ''));
}

function topLevelTags(template: string): TemplateTag[] {
  const tags = allTags(template);
  const root = tags.find((tag) => tag.start <= firstNonWhitespaceIndex(template) && tag.end >= template.trimEnd().length - 1);
  if (!root) return tags.slice(0, 4);

  return tags.filter((tag) => tag.start > root.start && tag.end < root.end && directChildDepth(template, root, tag) === 1).slice(0, 8);
}

function allTags(template: string): TemplateTag[] {
  const tags: TemplateTag[] = [];
  const stack: Array<{ name: string; attrsText: string; start: number; openEnd: number }> = [];
  const regex = /<\/?([a-z][\w-]*)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template))) {
    const raw = match[0] ?? '';
    const name = match[1] ?? 'div';
    const attrsText = match[2] ?? '';
    if (raw.startsWith('</')) {
      const openIndex = findLastOpenTag(stack, name);
      if (openIndex < 0) continue;
      const open = stack.splice(openIndex, 1)[0];
      if (!open) continue;
      const end = match.index + raw.length;
      tags.push({
        name,
        raw: template.slice(open.start, end),
        attrs: parseAttrs(open.attrsText),
        inner: template.slice(open.openEnd, match.index),
        start: open.start,
        end,
      });
      continue;
    }

    if (raw.endsWith('/>')) continue;
    stack.push({ name, attrsText, start: match.index, openEnd: match.index + raw.length });
  }
  return tags.sort((left, right) => left.start - right.start || right.end - left.end);
}

function findLastOpenTag(stack: Array<{ name: string }>, name: string): number {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.name.toLowerCase() === name.toLowerCase()) return index;
  }
  return -1;
}

function directChildDepth(template: string, parent: TemplateTag, child: TemplateTag): number {
  const between = template.slice(parent.start, child.start);
  const openCount = (between.match(/<([a-z][\w-]*)\b[^/>]*>/gi) ?? []).length;
  const closeCount = (between.match(/<\/([a-z][\w-]*)>/gi) ?? []).length;
  return Math.max(0, openCount - closeCount);
}

function parseAttrs(attrs: string): TemplateTag['attrs'] {
  return {
    className: attrValue(attrs, 'class'),
    id: attrValue(attrs, 'id'),
  };
}

function attrValue(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i'))?.[1];
}

function extractSectionTitle(inner: string): string | undefined {
  const titleClass = inner.match(/class\s*=\s*"[^"]*(?:section-title|title)[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1];
  const heading = inner.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
  return cleanText(titleClass ?? heading);
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/<[^>]+>/g, ' ').replace(/{{[\s\S]*?}}/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text || undefined;
}

function evidenceFor(tag: TemplateTag, title: string | undefined): string {
  const pieces = [tag.name];
  if (tag.attrs.className) pieces.push(`class=\"${tag.attrs.className}\"`);
  if (title) pieces.push(`title=\"${title}\"`);
  return pieces.join(' ');
}

function addSection(sections: VueTemplateSection[], seen: Set<string>, section: VueTemplateSection): void {
  const key = `${section.kind}:${section.selector ?? section.name}:${section.title ?? ''}`;
  if (seen.has(key)) return;
  if (section.kind === 'unknown' && sections.some((item) => item.name === section.name)) return;
  seen.add(key);
  sections.push(section);
}

function filterNoisySections(sections: VueTemplateSection[]): VueTemplateSection[] {
  const hasTitledDataSection = sections.some((section) => Boolean(section.title) && ['section', 'list'].includes(section.kind));
  return sections.filter((section) => {
    if (section.kind === 'unknown') return false;
    if (hasTitledDataSection && section.selector === '.kv-list') return false;
    if (/SectionTitle|Divider|Kv(?:Row|Label|Value)/.test(section.name)) return false;
    return true;
  });
}

function collectMatches(
  text: string,
  regex: RegExp,
  build: (match: RegExpExecArray) => VueInteractionHint,
  output: VueInteractionHint[],
): void {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) output.push(build(match));
}

function dedupeInteractions(interactions: VueInteractionHint[]): VueInteractionHint[] {
  const seen = new Set<string>();
  return interactions.filter((interaction) => {
    const key = `${interaction.kind}:${interaction.target ?? ''}:${interaction.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectorToName(selector: string): string {
  return toPascalCase(firstClass(selector));
}

function firstClass(className: string): string {
  return className.trim().split(/\s+/)[0] ?? className;
}

function ensureSectionSuffix(name: string, kind: VueTemplateSection['kind']): string {
  if (kind === 'bottom-bar') return /BottomBar$/.test(name) ? name : `${name}BottomBar`;
  if (kind === 'app-bar') return /AppBar$/.test(name) ? name : `${name}AppBar`;
  if (kind === 'tab-bar') return /TabBar$/.test(name) ? name : `${name}TabBar`;
  if (kind === 'modal') return /(?:Modal|Sheet|Dialog)$/.test(name) ? name : `${name}Modal`;
  if (kind === 'list') return /List$/.test(name) ? name : `${name}List`;
  if (kind === 'chart') return /Chart$/.test(name) ? name : `${name}Chart`;
  return /Section$/.test(name) ? name : `${name}Section`;
}

function toPascalCase(value: string): string {
  const normalized = value.replace(/['’]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!normalized) return 'Section';
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function firstNonWhitespaceIndex(value: string): number {
  const match = value.match(/\S/);
  return match?.index ?? 0;
}

function firstBlock(sourceCode: string, tag: string): string | undefined {
  return allBlocks(sourceCode, tag)[0];
}

function allBlocks(sourceCode: string, tag: string): string[] {
  const blocks: string[] = [];
  const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceCode))) {
    blocks.push(match[1]?.trim() ?? '');
  }
  return blocks;
}

type TemplateTag = {
  name: string;
  raw: string;
  attrs: {
    className?: string | undefined;
    id?: string | undefined;
  };
  inner: string;
  start: number;
  end: number;
};
