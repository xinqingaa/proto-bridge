import path from 'node:path';
import { writeTextFile } from '../artifacts/artifact-writer.js';
import type { ExportUiReviewInput, ExportUiReviewResult, UiBuildPlan } from '../types/index.js';
import type { UiReviewCapabilityResult } from './types.js';

export async function reviewUiCapability(input: ExportUiReviewInput): Promise<UiReviewCapabilityResult> {
  const result = await exportUiReview(input);
  return {
    ...result,
    capability: 'ui.review',
    warnings: input.page.warnings,
  };
}

async function exportUiReview(input: ExportUiReviewInput): Promise<ExportUiReviewResult> {
  const markdown = renderReviewMarkdown(input.plan);
  const reviewMarkdownPath = path.join(input.outDir, 'ui-build-review.md');
  await writeTextFile(reviewMarkdownPath, markdown);
  return {
    markdown,
    files: {
      uiBuildReview: reviewMarkdownPath,
    },
  };
}

function renderReviewMarkdown(plan: UiBuildPlan): string {
  return [
    `# ${plan.page.title ?? 'Snapshot UI'} 构建审查`,
    '',
    '## 契约权威',
    '',
    `- 计划 ID：\`${plan.id}\``,
    `- 页面 ID：\`${plan.pageId}\``,
    `- 原型路由：${plan.page.route ?? 'unknown'}`,
    `- 目标模块：${plan.target.module ?? 'unknown'}`,
    `- 逻辑来源：${plan.implementationContract.logicalPlanSource}`,
    '- 机器契约只看 `ui-build-plan.json`；本文档只是该 JSON 的中文审查视图。',
    '- 冲突规则：sourceSemantics 负责来源语义；targetConventions 负责工程表达；visualPlan 负责视觉事实。',
    '- 若目标约定未知，不得引入新的 state/routing/i18n/theme 框架，先处理人工确认项。',
    '',
    '## 来源语义',
    '',
    '_JSON 来源：`ui-build-plan.json#/implementationContract/sourceSemantics`_',
    '',
    ...renderSourceSemantics(plan),
    '',
    '## 目标工程扫描结果',
    '',
    '_JSON 来源：`ui-build-plan.json#/targetConventions/architectureProfile`_',
    '',
    ...renderArchitectureProfile(plan),
    '',
    '## 实现契约',
    '',
    '_JSON 来源：`ui-build-plan.json#/implementationContract`_',
    '',
    '### 文件',
    '',
    ...markdownTable(
      ['文件', '职责', '备注'],
      plan.implementationContract.fileTree.map((file) => [
        codeCell(file.path),
        file.responsibility,
        file.notes ?? '',
      ]),
    ),
    '',
    '### Widget 树',
    '',
    ...markdownTable(
      ['Widget', '父级', '角色', '状态访问', '构建提示'],
      plan.implementationContract.widgetTree.map((widget) => [
        widget.name,
        widget.parent ?? '页面入口',
        widget.role,
        stateAccessLabel(widget.stateAccess),
        widget.buildHint,
      ]),
    ),
    '',
    '### 状态与边界',
    '',
    ...markdownTable(
      ['关注点', 'Owner', '建议', '证据'],
      plan.implementationContract.stateStrategy.map((strategy) => [
        strategy.concern,
        ownerLabel(strategy.owner),
        strategy.recommendation,
        strategy.evidence ?? '',
      ]),
    ),
    '',
    ...markdownTable(
      ['边界', '职责', '负责', '避免'],
      plan.implementationContract.controllerBoundaries.map((boundary) => [
        boundary.name,
        boundary.responsibility,
        boundary.owns.join('、') || '无',
        boundary.avoids.join('、') || '无',
      ]),
    ),
    '',
    '### Widget 契约',
    '',
    ...markdownTable(
      ['Widget', '输入', '回调', '状态读取', '备注'],
      plan.implementationContract.widgetContracts.map((contract) => [
        contract.widget,
        contract.inputs.join('、') || '无',
        contract.callbacks.join('、') || '无',
        contract.shouldReadController ? '可读取页面状态边界' : '应通过参数/回调通信',
        contract.notes,
      ]),
    ),
    '',
    '### 契约规则',
    '',
    ...listOrFallback(plan.implementationContract.rules.map((rule) => `- ${translateRule(rule)}`)),
    '',
    '## 视觉计划',
    '',
    '_JSON 来源：`ui-build-plan.json#/visualPlan`、`#/componentMappings`、`#/themeMappings`_',
    '',
    `- 视口：${plan.visualPlan.viewport.width}x${plan.visualPlan.viewport.height}`,
    `- 截图：${plan.visualPlan.screenshotRefs.join('、') || '无'}`,
    '',
    '### 区块证据',
    '',
    ...markdownTable(
      ['角色', '标题/ID', 'bbox', '节点数', '提示'],
      plan.visualPlan.sections.slice(0, 60).map((section) => [
        section.role,
        section.title ?? section.id,
        `${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}`,
        String(section.nodeIds.length),
        section.buildHint ?? '',
      ]),
    ),
    '',
    '### 组件映射',
    '',
    ...markdownTable(
      ['来源角色', '目标组件', '置信度', '节点/来源', '原因'],
      plan.componentMappings.map((mapping) => [
        mapping.sourceRole,
        mapping.targetSymbol ?? '本地 Widget',
        confidenceLabel(mapping.confidence),
        mapping.nodeIds.slice(0, 6).join('、'),
        translateReason(mapping.reason),
      ]),
    ),
    '',
    '### 字体 Token 锁定表',
    '',
    '_JSON 来源：`ui-build-plan.json#/themeMappings[*].lockToken`_',
    '',
    'P0 约束：`lockToken=true` 的字体必须直接使用目标 textStyle token；除非 plan 明确列出来源覆盖证据，不得再覆盖 `fontSize`、`fontWeight`、`height`、`fontFamily`。',
    '',
    ...renderTypographyLockTable(plan),
    '',
    '### 主题映射',
    '',
    ...markdownTable(
      ['类型', '来源', '值', '目标', '匹配', '置信度', '锁定'],
      plan.themeMappings.slice(0, 80).map((mapping) => [
        mapping.kind ?? 'style',
        mapping.source,
        codeCell(mapping.value),
        mapping.target ?? '人工确认',
        mapping.matchedBy ?? 'manual',
        confidenceLabel(mapping.confidence),
        mapping.lockToken ? `是；不得覆盖 ${mapping.doNotOverride?.join('、') || '字体核心字段'}` : '',
      ]),
    ),
    '',
    '## 文案、资源与交互',
    '',
    '_JSON 来源：`ui-build-plan.json#/i18nPlan`、`#/assetPlan`、`#/interactionPlan`_',
    '',
    '### 文案',
    '',
    translateRecommendation(plan.i18nPlan.recommendation),
    '',
    ...markdownTable(
      ['建议 key', '文案', '节点'],
      plan.i18nPlan.texts.slice(0, 60).map((item) => [
        item.suggestedKey ? codeCell(item.suggestedKey) : '待定 key',
        item.text,
        item.nodeIds.slice(0, 6).join('、'),
      ]),
    ),
    '',
    '### 资源',
    '',
    translateRecommendation(plan.assetPlan.recommendation),
    '',
    ...markdownTable(
      ['类型', '来源/节点', '建议'],
      plan.assetPlan.assets.slice(0, 60).map((asset) => [
        asset.kind,
        asset.source ?? asset.nodeId ?? 'inline',
        translateRecommendation(asset.recommendation),
      ]),
    ),
    '',
    '### 交互',
    '',
    ...markdownTable(
      ['类型', '目标/节点', '建议'],
      plan.interactionPlan.map((interaction) => [
        interaction.kind,
        interaction.label ?? interaction.nodeId,
        translateRecommendation(interaction.recommendation),
      ]),
    ),
    '',
    '## 风险与确认',
    '',
    '_JSON 来源：`ui-build-plan.json#/implementationContract/contractWarnings`、`#/businessQuestions`、`#/validationHints`_',
    '',
    '### 契约警告',
    '',
    ...listOrFallback(plan.implementationContract.contractWarnings.map((warning) => `- ${translateWarning(warning)}`)),
    '',
    '### 人工确认',
    '',
    ...listOrFallback([
      ...plan.implementationContract.manualQuestions,
      ...plan.businessQuestions,
    ].map((question) => `- ${translateWarning(question)}`)),
    '',
    '### 风险',
    '',
    ...listOrFallback(plan.risks.map((risk) => `- ${translateWarning(risk)}`)),
    '',
    '### 校验提示',
    '',
    ...listOrFallback(plan.validationHints.map((hint) => `- ${translateWarning(hint)}`)),
    '',
  ].join('\n');
}

function renderSourceSemantics(plan: UiBuildPlan): string[] {
  const semantics = plan.implementationContract.sourceSemantics;
  if (!semantics) return ['- 未提供 source-aware 语义；请以 implementationContract 和 visualPlan 为准。'];
  return [
    '### 摘要',
    '',
    ...listOrFallback(semantics.summary.slice(0, 8).map((item) => `- ${item}`)),
    '',
    '### 业务区块',
    '',
    ...listOrFallback(semantics.businessSections.slice(0, 16).map((section) =>
      `- ${section.name}${section.parent ? ` ← ${section.parent}` : ''}：${section.role}；${section.responsibility}；输入=${section.inputs.join('、') || '无'}；回调=${section.callbacks.join('、') || '无'}`,
    )),
    '',
    '### 状态意图',
    '',
    ...listOrFallback(semantics.stateIntent.slice(0, 12).map((item) =>
      `- ${item.concern}（${ownerLabel(item.owner)}）：${item.recommendation}${item.evidence ? `；证据：${item.evidence}` : ''}`,
    )),
    '',
    '### 路由/生命周期/交互意图',
    '',
    ...listOrFallback([
      ...semantics.routeIntent.slice(0, 8).map((item) => `- 路由 ${item.action}：${[item.target, item.params].filter(Boolean).join(' / ') || '待确认'}${item.evidence ? `；证据：${item.evidence}` : ''}`),
      ...semantics.lifecycleIntent.slice(0, 8).map((item) => `- 生命周期 ${item.hook}：${item.target ?? '待确认'}${item.evidence ? `；证据：${item.evidence}` : ''}`),
      ...semantics.interactionIntent.slice(0, 10).map((item) => `- 交互 ${item.kind}：${item.target ?? '待确认'}${item.evidence ? `；证据：${item.evidence}` : ''}`),
    ]),
    '',
    '### 禁止直译',
    '',
    ...listOrFallback(semantics.doNotTranslate.map((item) => `- ${item}`)),
  ];
}

function renderArchitectureProfile(plan: UiBuildPlan): string[] {
  const profile = plan.targetConventions.architectureProfile;
  return [
    ...markdownTable(
      ['维度', '模式', '置信度', '证据摘要'],
      [
        ['状态 overall', profile.state.pattern, confidenceLabel(profile.state.confidence), profile.state.evidence.join('；')],
        ['状态 package', profile.state.package?.pattern ?? 'unknown', confidenceLabel(profile.state.package?.confidence ?? 'low'), profile.state.package?.evidence.join('；') ?? ''],
        ['状态 global', profile.state.global?.pattern ?? 'unknown', confidenceLabel(profile.state.global?.confidence ?? 'low'), profile.state.global?.evidence.join('；') ?? ''],
        ['状态 page', profile.state.page?.pattern ?? 'unknown', confidenceLabel(profile.state.page?.confidence ?? 'low'), profile.state.page?.evidence.join('；') ?? ''],
        ['路由 overall', profile.routing.pattern, confidenceLabel(profile.routing.confidence), profile.routing.evidence.join('；')],
        ['路由注册', profile.routing.registration?.pattern ?? 'unknown', confidenceLabel(profile.routing.registration?.confidence ?? 'low'), profile.routing.registration?.evidence.join('；') ?? ''],
        ['路由调用', profile.routing.navigation?.pattern ?? 'unknown', confidenceLabel(profile.routing.navigation?.confidence ?? 'low'), profile.routing.navigation?.evidence.join('；') ?? ''],
        ['i18n lookup', profile.i18n.lookup?.pattern ?? profile.i18n.pattern, confidenceLabel(profile.i18n.lookup?.confidence ?? profile.i18n.confidence), profile.i18n.lookup?.evidence.join('；') ?? profile.i18n.evidence.join('；')],
        ['主题', profile.theme.patterns.join('、') || 'unknown', confidenceLabel(profile.theme.confidence), profile.theme.evidence.join('；')],
        ['组件', profile.components.detectedSymbols.join('、') || '未识别', confidenceLabel(profile.components.confidence), profile.components.evidence.join('；')],
        ['文件组织', profile.fileOrganization.pattern, confidenceLabel(profile.fileOrganization.confidence), profile.fileOrganization.evidence.join('；')],
      ],
    ),
    '',
    '### 扫描证据样例',
    '',
    ...markdownTable(
      ['维度', '符号', '文件', '片段'],
      [
        ...profile.state.examples.slice(0, 4).map((item) => evidenceRow('状态', item)),
        ...profile.routing.examples.slice(0, 4).map((item) => evidenceRow('路由', item)),
        ...profile.i18n.examples.slice(0, 4).map((item) => evidenceRow('i18n', item)),
        ...profile.theme.examples.slice(0, 4).map((item) => evidenceRow('主题', item)),
        ...profile.components.examples.slice(0, 8).map((item) => evidenceRow('组件', item)),
        ...profile.fileOrganization.examples.slice(0, 4).map((item) => evidenceRow('文件组织', item)),
      ],
    ),
    '',
    ...(plan.targetConventions.unresolved.length
      ? ['### 未解析项', '', ...plan.targetConventions.unresolved.map((item) => `- ${translateWarning(item)}`)]
      : []),
  ];
}

function evidenceRow(dimension: string, evidence: {
  file: string;
  line?: number | undefined;
  symbol: string;
  snippet: string;
}): string[] {
  return [
    dimension,
    evidence.symbol,
    codeCell(`${evidence.file}${evidence.line ? `:${evidence.line}` : ''}`),
    codeCell(evidence.snippet),
  ];
}

function renderTypographyLockTable(plan: UiBuildPlan): string[] {
  const locked = plan.themeMappings.filter((mapping) => mapping.kind === 'typography' && mapping.lockToken);
  return markdownTable(
    ['Selector', 'Source token', 'Target textStyle', '匹配', '置信度', '不得覆盖'],
    locked.map((mapping) => [
      mapping.sourceSelector ?? mapping.source,
      mapping.sourceMixin ? `@include ${mapping.sourceMixin}` : codeCell(mapping.value),
      mapping.target ?? '人工确认',
      mapping.matchedBy ?? 'manual',
      confidenceLabel(mapping.confidence),
      mapping.doNotOverride?.join('、') || 'fontSize、fontWeight、height、fontFamily',
    ]),
  );
}

function markdownTable(headers: string[], rows: string[][]): string[] {
  if (rows.length === 0) return ['- 无'];
  return [
    `| ${headers.map(escapeMarkdownCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((_, index) => escapeMarkdownCell(row[index] ?? '')).join(' | ')} |`),
  ];
}

function escapeMarkdownCell(value: string): string {
  return String(value)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
}

function codeCell(value: string): string {
  const normalized = String(value).replace(/`/g, '\\`');
  return `\`${normalized}\``;
}

/*
 * Legacy formatter kept for small list contexts. Most review sections should use
 * markdownTable so large artifacts remain scannable.
 */
function stateAccessLabel(access: string): string {
  const labels: Record<string, string> = {
    none: '不直接访问状态',
    props: '通过参数接收',
    controller: '页面入口读取状态边界',
    'controller-slice': '组合层只读取必要状态片段',
    'state-owner': '页面入口读取状态边界',
    'state-slice': '组合层只读取必要状态片段',
  };
  return labels[access] ?? access;
}

function ownerLabel(owner: string): string {
  const labels: Record<string, string> = {
    controller: '页面状态边界',
    'state-boundary': '页面状态边界',
    service: '服务',
    repository: 'Repository / UI model',
    'widget-local': '局部状态',
    'model-adapter': 'Model / Adapter',
    manual: '人工确认',
  };
  return labels[owner] ?? owner;
}

function confidenceLabel(confidence: string): string {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  if (confidence === 'low') return '低';
  return confidence;
}

function translateRule(rule: string): string {
  return translateRecommendation(rule)
    .replace('Do not introduce a new state/routing/i18n/theme framework unless target conventions or user config explicitly support it.', '除非 targetConventions 或用户配置有证据支持，不得引入新的 state/routing/i18n/theme 框架。')
    .replace('Use source-aware widget contracts for decomposition.', '使用 source-aware widget contract 做业务拆分。')
    .replace('Use visualPlan for visible layout and styling evidence.', '可见布局和样式以 visualPlan 为证据。')
    .replace('If target conventions are unknown, report warnings instead of guessing.', '目标约定未知时输出警告，不要猜。');
}

function translateReason(reason: string): string {
  return translateRecommendation(reason)
    .replace(/^Evidence role (.+) can likely use (.+)\.$/, '可见角色 $1 可优先考虑 $2。')
    .replace(/^No clear target component was detected for evidence role (.+); implement with local Widget and target theme\.$/, '角色 $1 未识别到明确目标组件；用本地 Widget 并遵守目标主题。')
    .replace(/^Source component (.+) should become a local widget unless target examples show a reusable component\.$/, '来源组件 $1 默认作为本地 Widget，除非目标示例有可复用组件证据。');
}

function translateRecommendation(value: string): string {
  return value
    .replace('Visible text should use the i18n API detected in targetConventions when available; otherwise keep local constants with TODO for translation keys.', '可见文案应使用 targetConventions 中识别到的 i18n API；若未识别，则先保留本地常量并标记翻译 key TODO。')
    .replace('Prefer existing assets/images, assets/dark_images, assets/svg, and assets/json entries before adding new files.', '新增资源前优先复用现有 assets/images、assets/dark_images、assets/svg、assets/json。')
    .replace(/Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar target example confirms it\./g, 'Phase 1 只实现可见 UI 响应或回调边界；业务行为除非有相似目标示例，否则保留 TODO。')
    .replace(/\(local widget\)/g, '本地 Widget')
    .replace(/\(manual\)/g, '人工确认')
    .replace(/\(none\)/g, '无')
    .replace(/\(unknown\)/g, 'unknown')
    .replace(/\(key TBD\)/g, '待定 key');
}

function translateWarning(value: string): string {
  return translateRecommendation(value)
    .replace('page-level state pattern was not detected from target module or similar module files.', '未从目标模块或相似模块文件识别到页面级状态模式。')
    .replace('i18n pattern was not detected from translations or Dart usage.', '未从翻译文件或 Dart 使用中识别到 i18n 模式。')
    .replace(/only global\/app-level (.+) state evidence was detected; page-level state expression remains unresolved\./, '只识别到全局/应用级 $1 状态证据；页面级状态表达仍未确认。')
    .replace('page-level controller/binding files from the source-aware draft were omitted until target page state conventions are confirmed.', 'source-aware 初稿中的页面级状态边界文件已省略，直到确认目标页面级状态约定。')
    .replace('page-level state-boundary registration files from the source-aware draft were omitted until target page state conventions are confirmed.', 'source-aware 初稿中的页面级状态边界注册文件已省略，直到确认目标页面级状态约定。')
    .replace('i18n pattern is unknown; do not invent translation API.', 'i18n 模式未知；不要发明翻译 API。')
    .replace(/^Confirm target convention: /, '确认目标约定：');
}

function listOrFallback(items: string[]): string[] {
  return items.length > 0 ? items : ['- 无'];
}
