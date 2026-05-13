import path from 'node:path';
import type { ExportUiReviewInput, ExportUiReviewResult } from '../../types/index.js';
import { writeTextFile } from '../../artifacts/artifact-writer.js';

export async function exportUiReview(input: ExportUiReviewInput): Promise<ExportUiReviewResult> {
  const markdown = renderReviewMarkdown(input);
  const reviewMarkdownPath = path.join(input.outDir, 'ui-build-review.md');
  await writeTextFile(reviewMarkdownPath, markdown);
  return {
    markdown,
    files: {
      uiBuildReview: reviewMarkdownPath,
    },
  };
}

export const exportReviewMarkdown = exportUiReview;

function renderReviewMarkdown(input: ExportUiReviewInput): string {
  const { page, plan } = input;
  return [
    `# ${plan.page.title ?? page.page.title ?? 'Snapshot UI'} Review`,
    '',
    ...renderHybridSummary(page),
    ...renderSourceAwareProjection(input),
    '## 重构摘要',
    '',
    `- Page: \`${page.pageId}\``,
    `- Plan: \`${plan.id}\``,
    `- Route: ${plan.page.route ?? page.page.route ?? '(unknown)'}`,
    `- Target module: ${plan.target.module ?? '(unresolved)'}`,
    `- Viewport: ${plan.page.viewport.width}x${plan.page.viewport.height}`,
    '',
    plan.page.summary,
    '',
    '## 视觉区块',
    '',
    ...listOrFallback(page.sections.slice(0, 24).map((section) =>
      `- ${section.role}: ${section.title ?? section.id} (${section.bbox.x}, ${section.bbox.y}, ${section.bbox.width}, ${section.bbox.height})`,
    )),
    '',
    '## 计划文件',
    '',
    ...listOrFallback(plan.fileTree.map((file) => `- \`${file.path}\`: ${file.responsibility}${file.notes ? ` (${file.notes})` : ''}`)),
    '',
    '## Widget 树',
    '',
    ...listOrFallback(plan.widgetTree.map((widget) =>
      `- ${widget.name}${widget.parent ? ` -> ${widget.parent}` : ''}: ${widget.role}; ${widget.buildHint}`,
    )),
    '',
    '## 组件映射',
    '',
    ...listOrFallback(plan.componentMappings.map((mapping) =>
      `- ${mapping.sourceRole}: ${mapping.targetSymbol ?? '(local widget)'} [${mapping.confidence}] - ${mapping.reason}`,
    )),
    '',
    '## 主题映射',
    '',
    ...listOrFallback(plan.themeMappings.slice(0, 40).map((mapping) =>
      [
        `- ${mapping.kind ?? 'style'} ${mapping.source} = \`${mapping.value}\` -> ${mapping.target ?? '(manual)'}`,
        `[${mapping.confidence}${mapping.matchedBy ? `, ${mapping.matchedBy}` : ''}]`,
        mapping.nodeIds?.length ? `(nodes=${mapping.nodeIds.length})` : '',
        mapping.candidateTargets?.length && mapping.candidateTargets.length > 1
          ? `candidates: ${mapping.candidateTargets.join(', ')}`
          : '',
      ].filter(Boolean).join(' '),
    )),
    '',
    '## 文案 / i18n',
    '',
    plan.i18nPlan.recommendation,
    '',
    ...listOrFallback(plan.i18nPlan.texts.slice(0, 40).map((item) =>
      `- ${item.suggestedKey ? `\`${item.suggestedKey}\`` : '(key TBD)'}: ${item.text}`,
    )),
    '',
    '## 资源',
    '',
    plan.assetPlan.recommendation,
    '',
    ...listOrFallback(plan.assetPlan.assets.slice(0, 40).map((asset) =>
      `- ${asset.kind}: ${asset.source ?? asset.nodeId ?? '(inline)'} - ${asset.recommendation}`,
    )),
    '',
    '## 交互',
    '',
    ...listOrFallback(plan.interactionPlan.map((interaction) =>
      `- ${interaction.kind}: ${interaction.label ?? interaction.nodeId} - ${interaction.recommendation}`,
    )),
    '',
    '## 业务问题',
    '',
    ...listOrFallback(plan.businessQuestions.map((question) => `- ${question}`)),
    '',
    '## 风险',
    '',
    ...listOrFallback(plan.risks.map((risk) => `- ${risk}`)),
    '',
    '## 证据来源',
    '',
    ...listOrFallback(page.provenance.map((item) => `- ${item.source}: ${item.fields.join(', ')}`)),
    '',
    '## 验证提示',
    '',
    ...listOrFallback(plan.validationHints.map((hint) => `- ${hint}`)),
    '',
  ].join('\n');
}

function renderHybridSummary(page: ExportUiReviewInput['page']): string[] {
  if (!page.merge && !page.sourceFacts && !page.targetFacts) return [];
  return [
    '## 能力上下文',
    '',
    `- Merge strategy: ${page.merge?.strategy ?? '(not merged)'}`,
    `- Capabilities: ${page.merge?.selectedCapabilities.join(', ') ?? '(unknown)'}`,
    `- Facts: source=${Boolean(page.sourceFacts)}, runtime=${Boolean(page.runtimeFacts)}, screenshot=${Boolean(page.screenshotFacts)}, target=${Boolean(page.targetFacts)}`,
    '',
    '### 字段优先级',
    '',
    ...listOrFallback((page.fieldPriority ?? []).map((rule) =>
      `- ${rule.field}: ${rule.priority.join(' > ')} - ${rule.reason}`,
    )),
    '',
    '### 人工确认项',
    '',
    ...listOrFallback((page.manualConfirmations ?? []).map((item) =>
      `- [ ] ${item.id} [${item.severity}]: ${item.question}`,
    )),
    '',
  ];
}

function renderSourceAwareProjection(input: ExportUiReviewInput): string[] {
  const sourceReview = input.sourceReview;
  if (!sourceReview) return [];
  return [
    '## 有源码实现交接',
    '',
    '### 对齐检查清单',
    '',
    ...sourceReview.parityChecklist.map((item) =>
      `- ${item.section}: ${item.status} (${item.evidence.join(', ')})`,
    ),
    '',
    '### 页面元信息',
    '',
    `- Page: ${sourceReview.title}`,
    `- Route: ${sourceReview.metadata.route ?? '(unknown)'}`,
    `- screenId: ${sourceReview.metadata.screenId ?? '(unknown)'}`,
    `- Source module: ${sourceReview.metadata.sourceModule ?? '(unknown)'}`,
    `- Target module: ${sourceReview.metadata.targetModule ?? '(unresolved)'}`,
    `- Implementation shape: ${sourceReview.metadata.implementationShape}`,
    `- Status: ${sourceReview.metadata.status ?? '(unknown)'}`,
    `- Owner: ${sourceReview.metadata.owner ?? '(unknown)'}`,
    '',
    '### 迁移结论',
    '',
    `- Flutter complexity: ${sourceReview.implementation.complexity}`,
    `- Page pattern: ${sourceReview.implementation.pattern ?? '(unknown)'}`,
    `- Pattern confidence: ${sourceReview.implementation.patternConfidence ?? '(unknown)'}`,
    `- Recommended shape: ${sourceReview.implementation.shape}`,
    `- Target module: ${sourceReview.implementation.targetModule ?? '(unresolved)'}`,
    `- Direct implementation: ${sourceReview.implementation.directImplementation}`,
    `- Implementation summary: ${sourceReview.implementation.summary}`,
    `- Top risks: ${sourceReview.implementation.risks.slice(0, 3).join('；') || '(none)'}`,
    '',
    '### Flutter 实现规划',
    '',
    '#### 目标文件',
    '',
    ...listOrFallback(sourceReview.files.map((file) =>
      `- \`${file.path}\`: ${file.responsibility}${file.notes ? ` (${file.notes})` : ''}`,
    )),
    '',
    '#### Widget 组成',
    '',
    ...listOrFallback(sourceReview.widgets.slice(0, 24).map((widget) =>
      `- ${widget.name}${widget.parent ? ` -> ${widget.parent}` : ''}: ${widget.role}; ${widget.buildHint}`,
    )),
    '',
    '#### Widget 契约',
    '',
    ...listOrFallback(sourceReview.widgetContracts.map((contract) =>
      `- ${contract.widget}: inputs=[${contract.inputs.join(', ') || 'none'}], callbacks=[${contract.callbacks.join(', ') || 'none'}], readsController=${contract.shouldReadController}; ${contract.notes}`,
    )),
    '',
    '#### Controller 边界',
    '',
    ...listOrFallback(sourceReview.controllerBoundaries.map((boundary) =>
      `- ${boundary.name}: ${boundary.responsibility}; owns=[${boundary.owns.join(', ') || 'none'}]; avoids=[${boundary.avoids.join(', ') || 'none'}]`,
    )),
    '',
    '#### 不要直译',
    '',
    ...listOrFallback(sourceReview.doNotTranslate.map((item) => `- ${item}`)),
    '',
    '### 状态与交互',
    '',
    '#### 状态策略',
    '',
    ...listOrFallback(sourceReview.stateStrategy.map((strategy) =>
      `- ${strategy.concern} (${strategy.owner}): ${strategy.recommendation}`,
    )),
    '',
    '#### 生命周期与副作用',
    '',
    ...listOrFallback(sourceReview.lifecycle.map((item) =>
      `- ${item.hook}: ${item.target ?? '(unknown)'} - ${item.migrationHint}`,
    )),
    '',
    '#### 交互事件',
    '',
    ...listOrFallback(sourceReview.interactions.slice(0, 40).map((interaction) =>
      `- ${interaction.kind}: ${interaction.target ?? '(unknown)'} - ${interaction.migrationHint}`,
    )),
    '',
    '### 路由与布局',
    '',
    '#### 路由与参数',
    '',
    `- Source route: ${sourceReview.metadata.route ?? '(unknown)'}`,
    `- Target route files: ${sourceReview.reusable.routesFiles.join(', ') || '(unresolved)'}`,
    '',
    '#### 路由行为',
    '',
    ...listOrFallback(sourceReview.routes.map((route) =>
      `- ${route.action}: ${[route.target, route.params].filter(Boolean).join(' / ') || '(unknown)'} - ${route.migrationHint}`,
    )),
    '',
    '#### 布局模型',
    '',
    ...listOrFallback(sourceReview.layout.map((layout) =>
      `- ${layout.kind} ${layout.selector}: ${layout.migrationHint}`,
    )),
    '',
    '### 主题、I18n 与资源',
    '',
    '#### 源码样式 Token',
    '',
    ...listOrFallback(sourceReview.styleTokens.slice(0, 40).map((token) =>
      `- ${token.selector}.${token.property}: ${token.token}${token.fallback ? ` (${token.fallback})` : ''}`,
    )),
    '',
    '#### I18n',
    '',
    ...listOrFallback(formatI18n(sourceReview.i18n).slice(0, 40)),
    '',
    '#### Assets',
    '',
    ...listOrFallback(sourceReview.assets.slice(0, 40).map((asset) =>
      `- ${asset.kind}: ${asset.source ?? '(inline)'} - ${asset.migrationHint}`,
    )),
    '',
    '### 目标工程可复用能力',
    '',
    `- Widgets: ${sourceReview.reusable.widgets.join(', ') || '(none detected)'}`,
    `- Route files: ${sourceReview.reusable.routesFiles.join(', ') || '(none detected)'}`,
    `- Translation files: ${sourceReview.reusable.translationFiles.join(', ') || '(none detected)'}`,
    `- Asset directories: ${sourceReview.reusable.assetDirectories.join(', ') || '(none detected)'}`,
    `- Similar files: ${sourceReview.reusable.similarFiles.slice(0, 12).join(', ') || '(none detected)'}`,
    '',
    '### 人工确认',
    '',
    ...listOrFallback([
      ...sourceReview.manualQuestions,
      ...sourceReview.implementation.risks,
    ].map((item) => `- ${item}`)),
    '',
  ];
}

function formatI18n(value: Record<string, unknown>): string[] {
  const rows: string[] = [];
  collectI18n(value, '', rows);
  return rows;
}

function collectI18n(value: unknown, prefix: string, rows: string[]): void {
  if (typeof value === 'string') {
    rows.push(`- ${prefix || '(text)'}: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectI18n(item, `${prefix}[${index}]`, rows));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      collectI18n(nested, prefix ? `${prefix}.${key}` : key, rows);
    }
  }
}

function listOrFallback(items: string[]): string[] {
  return items.length > 0 ? items : ['- (none)'];
}
