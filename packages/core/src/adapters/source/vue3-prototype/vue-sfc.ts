import type {
  VueAssetHint,
  VueInteractionHint,
  VueLayoutHint,
  VueLifecycleHint,
  VueRouteHint,
  VueSemanticComponent,
  VueSfcAnalysis,
  VueStateHint,
  VueStyleTokenHint,
  VueTemplateSection,
} from '../../../types/index.js';

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
  const tags = allTags(template);
  const templateSections = inferTemplateSections(template, styleText, tags);
  const interactions = inferInteractions(template, script);
  const state = inferState(script);
  const routes = inferRoutes(template, script);
  const lifecycle = inferLifecycle(script);
  const layout = inferLayout(styleText);
  const assets = inferAssets(template, styleText);
  const styleTokens = inferStyleTokens(styleText);

  return {
    ...sections,
    sections: templateSections,
    interactions,
    components: inferSemanticComponents(templateSections, interactions, layout, styleTokens),
    state,
    routes,
    lifecycle,
    layout,
    assets,
    styleTokens,
    fixedBottom: hasFixedBottomBar(template, styleText),
  };
}

function inferTemplateSections(template: string, styleText: string, tags = allTags(template)): VueTemplateSection[] {
  const sections: VueTemplateSection[] = [];
  const seen = new Set<string>();

  for (const tag of topLevelTags(template, tags)) {
    addSection(sections, seen, sectionFromTag(tag));
  }

  for (const tag of tags.filter((item) => item.attrs.className && /(?:^|[-_\s])(section|card|panel|list|chart|tab|tabs|header|nav|bottom-bar|footer|modal|popup|sheet|quote|price|holding|profile|history|metric)(?:[-_\s]|$)/i.test(item.attrs.className))) {
    addSection(sections, seen, sectionFromTag(tag));
  }

  for (const tag of tags.filter((item) => extractSectionTitle(item.inner) && !/page\b|screen\b/i.test(item.attrs.className ?? ''))) {
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

  return filterNoisySections(sections).slice(0, 18);
}

function inferSemanticComponents(
  sections: VueTemplateSection[],
  interactions: VueInteractionHint[],
  layout: VueLayoutHint[],
  styleTokens: VueStyleTokenHint[],
): VueSemanticComponent[] {
  return sections
    .filter((section) => section.kind !== 'unknown')
    .map((section) => {
      const role = componentRole(section);
      const selectorKey = section.selector?.replace(/^\./, '') ?? section.name;
      return {
        name: section.name,
        role,
        selector: section.selector,
        title: section.title,
        dataHints: inferDataHints(section),
        interactionHints: interactions
          .filter((interaction) => interaction.target && componentMayUseInteraction(section, interaction.target))
          .slice(0, 6)
          .map((interaction) => interaction.evidence),
        tokenHints: styleTokens
          .filter((item) => item.selector.includes(selectorKey) || selectorKey.includes(item.selector.replace(/^\./, '')))
          .slice(0, 8)
          .map((item) => `${item.property}: ${item.token}${item.fallback ? ` fallback ${item.fallback}` : ''}`),
        layoutHints: layout
          .filter((item) => item.selector.includes(selectorKey) || selectorKey.includes(item.selector.replace(/^\./, '')))
          .slice(0, 6)
          .map((item) => item.evidence),
        evidence: section.evidence,
      };
    });
}

function inferStyleTokens(styleText: string): VueStyleTokenHint[] {
  const hints: VueStyleTokenHint[] = [];
  for (const block of cssBlocks(styleText)) {
    const declarations = block.body.split(';').map((item) => item.trim()).filter(Boolean);
    for (const declaration of declarations) {
      const [rawProperty, ...rawValueParts] = declaration.split(':');
      const property = rawProperty?.trim();
      const value = rawValueParts.join(':').trim();
      if (!property || !value) continue;
      const varMatch = value.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^\)]+))?\)/);
      if (varMatch?.[1]) {
        hints.push({
          selector: block.selector,
          property,
          token: varMatch[1],
          fallback: varMatch[2]?.trim(),
          evidence: compactCode(`${block.selector} { ${property}: ${value} }`),
        });
        continue;
      }
      const hexMatch = value.match(/#(?:[0-9a-f]{3,8})\b/i);
      if (hexMatch?.[0] && /(color|background|border|shadow|fill|stroke)/i.test(property)) {
        hints.push({
          selector: block.selector,
          property,
          token: hexMatch[0],
          evidence: compactCode(`${block.selector} { ${property}: ${value} }`),
        });
      }
    }
  }
  return dedupeBy(hints, (item) => `${item.selector}:${item.property}:${item.token}:${item.fallback ?? ''}`).slice(0, 120);
}

function inferState(script: string): VueStateHint[] {
  const hints: VueStateHint[] = [];
  collectMatches(script, /const\s+(\w+)\s*=\s*ref\s*\(([\s\S]*?)\)/g, (match) => ({
    name: match[1] ?? 'unknown',
    kind: 'ref',
    category: categorizeState(match[1] ?? '', match[2] ?? ''),
    evidence: compactCode(match[0]),
    migrationHint: migrationHintForState('ref', categorizeState(match[1] ?? '', match[2] ?? '')),
  }), hints);
  collectMatches(script, /const\s+(\w+)\s*=\s*reactive\s*\(([\s\S]*?)\)/g, (match) => ({
    name: match[1] ?? 'unknown',
    kind: 'reactive',
    category: categorizeState(match[1] ?? '', match[2] ?? ''),
    evidence: compactCode(match[0]),
    migrationHint: migrationHintForState('reactive', categorizeState(match[1] ?? '', match[2] ?? '')),
  }), hints);
  collectMatches(script, /const\s+(\w+)\s*=\s*computed\s*\(/g, (match) => ({
    name: match[1] ?? 'unknown',
    kind: 'computed' as const,
    category: categorizeComputed(match[1] ?? ''),
    evidence: compactCode(match[0]),
    migrationHint: migrationHintForState('computed', categorizeComputed(match[1] ?? '')),
  }), hints);
  collectMatches(script, /const\s+(\w+)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\})/g, (match) => {
    const name = match[1] ?? 'unknown';
    if (/^(seg|item|data|current|target|params?)$/i.test(name)) return undefined;
    return {
      name,
      kind: 'constant',
      category: categorizeConstant(name, match[2] ?? ''),
      evidence: compactCode(`${name} = ${(match[2] ?? '').slice(0, 100)}`),
      migrationHint: migrationHintForState('constant', categorizeConstant(name, match[2] ?? '')),
    };
  }, hints);
  collectMatches(script, /function\s+(\w+)\s*\(/g, (match) => ({
    name: match[1] ?? 'unknown',
    kind: 'function',
    category: categorizeFunction(match[1] ?? ''),
    evidence: compactCode(match[0]),
    migrationHint: migrationHintForState('function', categorizeFunction(match[1] ?? '')),
  }), hints);

  return dedupeBy(hints, (item) => `${item.kind}:${item.name}`).slice(0, 80);
}

function inferRoutes(template: string, script: string): VueRouteHint[] {
  const text = `${template}\n${script}`;
  const routes: VueRouteHint[] = [];
  collectMatches(text, /pushPage\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*([^\)]+))?\)/g, (match) => ({
    action: 'navigate' as const,
    target: match[1],
    params: compactCode(match[2]),
    evidence: compactCode(match[0]),
    migrationHint: `映射到 Get.toNamed/AppRoutes，确认 ${match[1]} 对应 Flutter route 和参数。`,
  }), routes);
  collectMatches(text, /history\.back\s*\(\s*\)/g, (match) => ({
    action: 'back' as const,
    evidence: compactCode(match[0]),
    migrationHint: '迁移为 Get.back() 或 Navigator.pop，确认返回栈和埋点。',
  }), routes);
  collectMatches(text, /route\.query\.(\w+)/g, (match) => ({
    action: 'read-query' as const,
    target: match[1],
    evidence: compactCode(match[0]),
    migrationHint: `从 Get.parameters/Get.arguments 读取 ${match[1]}，确认默认值和来源页面。`,
  }), routes);

  return dedupeBy(routes, (item) => `${item.action}:${item.target ?? ''}:${item.params ?? ''}`).slice(0, 40);
}

function inferLifecycle(script: string): VueLifecycleHint[] {
  const hints: VueLifecycleHint[] = [];
  collectMatches(script, /onMounted\s*\(([\s\S]*?)\n\}\)/g, (match) => ({
    hook: 'onMounted' as const,
    target: lifecycleTarget(match[1] ?? ''),
    evidence: compactCode(`onMounted(${(match[1] ?? '').slice(0, 140)}`),
    migrationHint: '迁移到 Controller.onReady 或页面首帧回调；涉及滚动需绑定 ScrollController 后执行。',
  }), hints);
  collectMatches(script, /onBeforeUnmount\s*\(([\s\S]*?)\n\}\)/g, (match) => ({
    hook: 'onBeforeUnmount' as const,
    target: lifecycleTarget(match[1] ?? ''),
    evidence: compactCode(`onBeforeUnmount(${(match[1] ?? '').slice(0, 140)}`),
    migrationHint: '迁移到 Controller.onClose，释放 ScrollController、listener、timer 等资源。',
  }), hints);
  collectMatches(script, /watch\s*\(([^,]+),/g, (match) => ({
    hook: 'watch' as const,
    target: compactCode(match[1]),
    evidence: compactCode(match[0]),
    migrationHint: '迁移为 ever/worker、Rx 监听或在 setter 中触发副作用。',
  }), hints);
  collectMatches(script, /(addEventListener|removeEventListener)\s*\(\s*['"]([^'"]+)['"]/g, (match) => ({
    hook: 'event-listener' as const,
    target: match[2],
    evidence: compactCode(match[0]),
    migrationHint: match[1] === 'addEventListener' ? 'Flutter 侧用 ScrollController/listener 注册。' : '确保在 onClose/dispose 中移除 listener。',
  }), hints);

  return dedupeBy(hints, (item) => `${item.hook}:${item.target ?? ''}:${item.evidence}`).slice(0, 30);
}

function inferLayout(styleText: string): VueLayoutHint[] {
  const hints: VueLayoutHint[] = [];
  for (const block of cssBlocks(styleText)) {
    const declarations = block.body;
    addLayoutHint(hints, block.selector, declarations, 'fixed', /position\s*:\s*fixed/i, '使用 Stack/Positioned 或 Scaffold.bottomNavigationBar，注意 SafeArea 与内容底部 padding。');
    addLayoutHint(hints, block.selector, declarations, 'sticky', /position\s*:\s*sticky/i, '使用 SliverPersistentHeader、PinnedHeader 或滚动监听实现吸顶。');
    addLayoutHint(hints, block.selector, declarations, 'absolute', /position\s*:\s*absolute/i, '使用 Stack/Positioned，确认父容器尺寸约束。');
    addLayoutHint(hints, block.selector, declarations, 'scroll', /overflow(?:-y|-x)?\s*:\s*(auto|scroll)/i, '使用 SingleChildScrollView/ListView/CustomScrollView，并保留滚动方向。');
    addLayoutHint(hints, block.selector, declarations, 'safe-area', /safe-area-inset|env\(/i, 'Flutter 侧用 SafeArea 或 MediaQuery.padding。');
    addLayoutHint(hints, block.selector, declarations, 'z-index', /z-index\s*:/i, 'Flutter 侧用 Stack 层级顺序控制，避免遮挡 AppBar/BottomBar。');
    addLayoutHint(hints, block.selector, declarations, 'flex', /display\s*:\s*flex|flex-direction|align-items|justify-content/i, '迁移为 Row/Column/Flex，确认主轴、间距和对齐。');
    addLayoutHint(hints, block.selector, declarations, 'grid', /display\s*:\s*grid|grid-template/i, '迁移为 GridView/Wrap 或自定义布局。');
    addLayoutHint(hints, block.selector, declarations, 'spacing', /padding|margin|gap/i, '将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。');
  }
  return dedupeBy(hints, (item) => `${item.selector}:${item.kind}`).slice(0, 80);
}

function inferAssets(template: string, styleText: string): VueAssetHint[] {
  const hints: VueAssetHint[] = [];
  collectMatches(template, /<img\b[^>]*(?:src|:src)\s*=\s*['"]([^'"]+)['"][^>]*>/gi, (match) => ({
    kind: 'image' as const,
    source: match[1],
    evidence: compactCode(match[0]),
    migrationHint: '迁移到 assets/images 或 CommonImage/CommonNetImage，确认暗色图和分辨率。',
  }), hints);
  collectMatches(template, /<svg\b[\s\S]*?<\/svg>/gi, (match) => ({
    kind: 'inline-svg' as const,
    evidence: compactCode((match[0] ?? '').slice(0, 160)),
    migrationHint: '优先抽成 Flutter SvgPicture asset 或 CustomPainter，复杂图表不要逐层照搬来源结构。',
  }), hints);
  collectMatches(template, /class\s*=\s*['"]([^'"]*(?:icon|logo)[^'"]*)['"]/gi, (match) => ({
    kind: /logo/i.test(match[1] ?? '') ? 'image' as const : 'icon' as const,
    selector: `.${firstClass(match[1] ?? '')}`,
    evidence: compactCode(match[0]),
    migrationHint: '确认是否已有 CommonSvg/IconFont/本地 asset 可复用。',
  }), hints);
  collectMatches(styleText, /([^{}]+)\{[^{}]*background(?:-image)?\s*:\s*url\(([^\)]+)\)/gi, (match) => ({
    kind: 'background' as const,
    selector: compactCode(match[1]),
    source: (match[2] ?? '').replace(/['"]/g, '').trim(),
    evidence: compactCode(match[0]),
    migrationHint: '迁移为 DecorationImage 或 Image.asset，确认暗色模式资源。',
  }), hints);

  return dedupeBy(hints, (item) => `${item.kind}:${item.source ?? ''}:${item.selector ?? ''}:${item.evidence}`).slice(0, 80);
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
  if (/section-tabs|section-chip/.test(haystack)) return 'tab-bar';
  if (/tabs?|tab-bar/.test(haystack)) return 'tab-bar';
  if (/chart|kline|donut|bar-chart|trend|indicator/.test(haystack)) return 'chart';
  if (/list|rows?|table|holdings?|order-book|flow/.test(haystack) || /\bv-for\b/.test(tag.raw)) return 'list';
  if (/section|card|panel|profile|objective|history|metrics?|info|quote|price/.test(haystack)) return 'section';
  return 'unknown';
}

function inferInteractions(template: string, script: string): VueInteractionHint[] {
  const interactions: VueInteractionHint[] = [];
  collectMatches(template, /@click(?:\.\w+)*\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'click' as const,
    target: match[1],
    evidence: `@click=\"${match[1]}\"`,
  }), interactions);
  collectMatches(template, /v-model(?::[\w-]+)?\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'model' as const,
    target: match[1],
    evidence: `v-model=\"${match[1]}\"`,
  }), interactions);
  collectMatches(template, /v-if\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'conditional' as const,
    target: match[1],
    evidence: `v-if=\"${match[1]}\"`,
  }), interactions);
  collectMatches(template, /v-for\s*=\s*"([^"]+)"/g, (match) => ({
    kind: 'loop' as const,
    target: match[1],
    evidence: `v-for=\"${match[1]}\"`,
  }), interactions);
  collectMatches(script, /\b(ref|reactive)\s*\(/g, (match) => ({
    kind: 'state' as const,
    target: match[1],
    evidence: `${match[1]}(...)`,
  }), interactions);
  collectMatches<VueInteractionHint>(script, /\bcomputed\s*\(/g, () => ({
    kind: 'computed' as const,
    evidence: 'computed(...)',
  }), interactions);
  collectMatches<VueInteractionHint>(script, /\bwatch\s*\(/g, () => ({
    kind: 'watch' as const,
    evidence: 'watch(...)',
  }), interactions);

  return dedupeInteractions(interactions).slice(0, 80);
}

function componentRole(section: VueTemplateSection): VueSemanticComponent['role'] {
  const text = `${section.name} ${section.selector ?? ''} ${section.title ?? ''}`.toLowerCase();
  if (section.kind === 'app-bar' || /header/.test(text)) return 'header';
  if (section.kind === 'bottom-bar') return 'bottom-actions';
  if (section.kind === 'modal') return 'modal';
  if (/sectiontabs|section-tabs|section-chip/.test(text)) return 'section-tabs';
  if (section.kind === 'tab-bar') return 'tabs';
  if (section.kind === 'chart') return 'chart';
  if (section.kind === 'list') return 'list';
  if (/price|summary|info/.test(text)) return 'summary';
  if (section.kind === 'section') return 'content-section';
  return 'unknown';
}

function inferDataHints(section: VueTemplateSection): string[] {
  const text = `${section.name} ${section.selector ?? ''} ${section.title ?? ''}`.toLowerCase();
  const hints: string[] = [];
  if (/tab/.test(text)) hints.push('active tab key/list');
  if (/price|quote|summary|info/.test(text)) hints.push('quote summary data');
  if (/chart|kline|indicator/.test(text)) hints.push('chart series / indicator data');
  if (/holding/.test(text)) hints.push('holdings list');
  if (/profile/.test(text)) hints.push('fund profile fields');
  if (/history|dividend|nav/.test(text)) hints.push('history rows');
  return hints;
}

function componentMayUseInteraction(section: VueTemplateSection, target: string): boolean {
  const text = `${section.name} ${section.selector ?? ''} ${section.title ?? ''}`.toLowerCase();
  const normalizedTarget = target.toLowerCase();
  if (/tab/.test(text) && /tab|section|scroll/.test(normalizedTarget)) return true;
  if (/chart/.test(text) && /chart|period|indicator|rsi|macd|kdj/.test(normalizedTarget)) return true;
  if (/bottom|trade/.test(text) && /trade|buy|sell|option/.test(normalizedTarget)) return true;
  if (/profile/.test(text) && /profile/.test(normalizedTarget)) return true;
  if (/holding/.test(text) && /stock|ticker|holding/.test(normalizedTarget)) return true;
  return false;
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

function topLevelTags(template: string, tags = allTags(template)): TemplateTag[] {
  const root = tags.find((tag) => tag.start <= firstNonWhitespaceIndex(template) && tag.end >= template.trimEnd().length - 1);
  if (!root) return tags.slice(0, 4);

  return tags.filter((tag) => tag.start > root.start && tag.end < root.end && directChildDepth(template, root, tag) === 1).slice(0, 12);
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

function addLayoutHint(
  hints: VueLayoutHint[],
  selector: string,
  declarations: string,
  kind: VueLayoutHint['kind'],
  regex: RegExp,
  migrationHint: string,
): void {
  const match = declarations.match(regex);
  if (!match) return;
  hints.push({
    selector,
    kind,
    evidence: compactCode(`${selector} { ${extractRelevantDeclarations(declarations, kind)} }`),
    migrationHint,
  });
}

function extractRelevantDeclarations(declarations: string, kind: VueLayoutHint['kind']): string {
  const keysByKind: Record<VueLayoutHint['kind'], string[]> = {
    fixed: ['position', 'left', 'right', 'top', 'bottom', 'height', 'z-index', 'padding'],
    sticky: ['position', 'top', 'z-index', 'background'],
    scroll: ['overflow', 'overflow-y', 'overflow-x', 'height', 'max-height'],
    'safe-area': ['safe-area', 'env', 'padding', 'bottom'],
    'z-index': ['z-index', 'position'],
    absolute: ['position', 'left', 'right', 'top', 'bottom'],
    flex: ['display', 'flex-direction', 'align-items', 'justify-content', 'gap', 'flex'],
    grid: ['display', 'grid-template', 'gap'],
    overflow: ['overflow'],
    spacing: ['padding', 'margin', 'gap'],
  };
  const keys = keysByKind[kind];
  return declarations
    .split(';')
    .map((item) => item.trim())
    .filter((item) => keys.some((key) => item.includes(key)))
    .slice(0, 8)
    .join('; ');
}

function cssBlocks(styleText: string): Array<{ selector: string; body: string }> {
  const blocks: Array<{ selector: string; body: string }> = [];
  const text = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const regex = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const selector = compactCode(match[1]);
    const body = match[2] ?? '';
    if (!selector || selector.includes('from') || selector.includes('to')) continue;
    blocks.push({ selector, body });
  }
  return blocks;
}

function categorizeState(name: string, initializer: string): VueStateHint['category'] {
  const text = `${name} ${initializer}`.toLowerCase();
  if (/tab|expanded|active|selected|open|visible|show|period|indicator/.test(text)) return 'ui-state';
  if (/route|query|anchor|ticker/.test(text)) return 'navigation';
  if (/chart|kline|rsi|macd|kdj|ma\d|donut|bar/.test(text)) return 'chart-data';
  if (/\[|\{|mock|data|list|rows|holdings|sectors|history|metrics|profile|quote|book|flow/.test(text)) return 'mock-data';
  return 'unknown';
}

function categorizeComputed(name: string): VueStateHint['category'] {
  if (/chart|kline|rsi|macd|kdj|ma\d|donut|path|data|limit|min|max/.test(name.toLowerCase())) return 'chart-data';
  return 'derived-data';
}

function categorizeConstant(name: string, initializer: string): VueStateHint['category'] {
  return categorizeState(name, initializer);
}

function categorizeFunction(name: string): VueStateHint['category'] {
  if (/go|push|route|scroll|back|open/.test(name.toLowerCase())) return 'navigation';
  if (/handle|toggle|set/.test(name.toLowerCase())) return 'handler';
  if (/chart|path|calculate|get[xy]|ma|kdj|macd|rsi/.test(name.toLowerCase())) return 'chart-data';
  return 'handler';
}

function migrationHintForState(kind: VueStateHint['kind'], category: VueStateHint['category']): string {
  if (category === 'ui-state') return '放入 GetX Controller 的 Rx 字段，Widget 通过 Obx/GetBuilder 订阅。';
  if (category === 'mock-data') return '不要硬编码到 Widget；确认真实接口、模型字段或临时 fixture。';
  if (category === 'chart-data') return '拆到图表数据 adapter/getter，避免 UI build 中重复计算重数据。';
  if (category === 'navigation') return '迁移为路由参数、ScrollController 或导航方法。';
  if (category === 'lifecycle') return '迁移到 Controller 生命周期并确保释放资源。';
  if (category === 'handler') return '迁移为 Controller 方法或 Widget callback。';
  if (kind === 'computed') return '迁移为 getter/派生状态，确认缓存策略。';
  return '人工确认所属状态模型。';
}

function lifecycleTarget(body: string): string | undefined {
  if (/scroll/i.test(body)) return 'scroll listener';
  if (/route\.query/i.test(body)) return 'route query initialization';
  if (/timer|interval/i.test(body)) return 'timer';
  return undefined;
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

function addLayoutHintIf(hints: VueLayoutHint[], hint: VueLayoutHint | undefined): void {
  if (hint) hints.push(hint);
}

function collectMatches<T>(
  text: string,
  regex: RegExp,
  build: (match: RegExpExecArray) => T | undefined,
  output: T[],
): void {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const item = build(match);
    if (item !== undefined) output.push(item);
  }
}

function dedupeInteractions(interactions: VueInteractionHint[]): VueInteractionHint[] {
  return dedupeBy(interactions, (interaction) => `${interaction.kind}:${interaction.target ?? ''}:${interaction.evidence}`);
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
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

function compactCode(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
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
