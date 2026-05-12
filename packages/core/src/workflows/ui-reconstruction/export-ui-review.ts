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
    '## Summary',
    '',
    `- Page: \`${page.pageId}\``,
    `- Plan: \`${plan.id}\``,
    `- Route: ${plan.page.route ?? page.page.route ?? '(unknown)'}`,
    `- Target module: ${plan.target.module ?? '(unresolved)'}`,
    `- Viewport: ${plan.page.viewport.width}x${plan.page.viewport.height}`,
    '',
    plan.page.summary,
    '',
    '## Visual Sections',
    '',
    ...listOrFallback(page.sections.slice(0, 24).map((section) =>
      `- ${section.role}: ${section.title ?? section.id} (${section.bbox.x}, ${section.bbox.y}, ${section.bbox.width}, ${section.bbox.height})`,
    )),
    '',
    '## Planned Files',
    '',
    ...listOrFallback(plan.fileTree.map((file) => `- \`${file.path}\`: ${file.responsibility}${file.notes ? ` (${file.notes})` : ''}`)),
    '',
    '## Widget Tree',
    '',
    ...listOrFallback(plan.widgetTree.map((widget) =>
      `- ${widget.name}${widget.parent ? ` -> ${widget.parent}` : ''}: ${widget.role}; ${widget.buildHint}`,
    )),
    '',
    '## Component Mapping',
    '',
    ...listOrFallback(plan.componentMappings.map((mapping) =>
      `- ${mapping.sourceRole}: ${mapping.targetSymbol ?? '(local widget)'} [${mapping.confidence}] - ${mapping.reason}`,
    )),
    '',
    '## Theme Mapping',
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
    '## Text / i18n',
    '',
    plan.i18nPlan.recommendation,
    '',
    ...listOrFallback(plan.i18nPlan.texts.slice(0, 40).map((item) =>
      `- ${item.suggestedKey ? `\`${item.suggestedKey}\`` : '(key TBD)'}: ${item.text}`,
    )),
    '',
    '## Assets',
    '',
    plan.assetPlan.recommendation,
    '',
    ...listOrFallback(plan.assetPlan.assets.slice(0, 40).map((asset) =>
      `- ${asset.kind}: ${asset.source ?? asset.nodeId ?? '(inline)'} - ${asset.recommendation}`,
    )),
    '',
    '## Interactions',
    '',
    ...listOrFallback(plan.interactionPlan.map((interaction) =>
      `- ${interaction.kind}: ${interaction.label ?? interaction.nodeId} - ${interaction.recommendation}`,
    )),
    '',
    '## Business Questions',
    '',
    ...listOrFallback(plan.businessQuestions.map((question) => `- ${question}`)),
    '',
    '## Risks',
    '',
    ...listOrFallback(plan.risks.map((risk) => `- ${risk}`)),
    '',
    '## Provenance',
    '',
    ...listOrFallback(page.provenance.map((item) => `- ${item.source}: ${item.fields.join(', ')}`)),
    '',
    '## Validation Hints',
    '',
    ...listOrFallback(plan.validationHints.map((hint) => `- ${hint}`)),
    '',
  ].join('\n');
}

function renderHybridSummary(page: ExportUiReviewInput['page']): string[] {
  if (!page.merge && !page.sourceFacts && !page.targetFacts) return [];
  return [
    '## Capability Context',
    '',
    `- Merge strategy: ${page.merge?.strategy ?? '(not merged)'}`,
    `- Capabilities: ${page.merge?.selectedCapabilities.join(', ') ?? '(unknown)'}`,
    `- Facts: source=${Boolean(page.sourceFacts)}, runtime=${Boolean(page.runtimeFacts)}, screenshot=${Boolean(page.screenshotFacts)}, target=${Boolean(page.targetFacts)}`,
    '',
    '### Field Priority',
    '',
    ...listOrFallback((page.fieldPriority ?? []).map((rule) =>
      `- ${rule.field}: ${rule.priority.join(' > ')} - ${rule.reason}`,
    )),
    '',
    '### Manual Confirmations',
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
    '## Source-Aware Implementation Handoff',
    '',
    '### Parity Checklist',
    '',
    ...sourceReview.parityChecklist.map((item) =>
      `- ${item.section}: ${item.status} (${item.evidence.join(', ')})`,
    ),
    '',
    '### Page Metadata',
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
    '### Migration Conclusion',
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
    '### Flutter Implementation Plan',
    '',
    '#### Target Files',
    '',
    ...listOrFallback(sourceReview.files.map((file) =>
      `- \`${file.path}\`: ${file.responsibility}${file.notes ? ` (${file.notes})` : ''}`,
    )),
    '',
    '#### Widget Composition',
    '',
    ...listOrFallback(sourceReview.widgets.slice(0, 24).map((widget) =>
      `- ${widget.name}${widget.parent ? ` -> ${widget.parent}` : ''}: ${widget.role}; ${widget.buildHint}`,
    )),
    '',
    '#### Widget Contracts',
    '',
    ...listOrFallback(sourceReview.widgetContracts.map((contract) =>
      `- ${contract.widget}: inputs=[${contract.inputs.join(', ') || 'none'}], callbacks=[${contract.callbacks.join(', ') || 'none'}], readsController=${contract.shouldReadController}; ${contract.notes}`,
    )),
    '',
    '#### Controller Boundaries',
    '',
    ...listOrFallback(sourceReview.controllerBoundaries.map((boundary) =>
      `- ${boundary.name}: ${boundary.responsibility}; owns=[${boundary.owns.join(', ') || 'none'}]; avoids=[${boundary.avoids.join(', ') || 'none'}]`,
    )),
    '',
    '#### Do Not Translate Literally',
    '',
    ...listOrFallback(sourceReview.doNotTranslate.map((item) => `- ${item}`)),
    '',
    '### State And Interaction',
    '',
    '#### State Strategy',
    '',
    ...listOrFallback(sourceReview.stateStrategy.map((strategy) =>
      `- ${strategy.concern} (${strategy.owner}): ${strategy.recommendation}`,
    )),
    '',
    '#### Lifecycle And Side Effects',
    '',
    ...listOrFallback(sourceReview.lifecycle.map((item) =>
      `- ${item.hook}: ${item.target ?? '(unknown)'} - ${item.migrationHint}`,
    )),
    '',
    '#### Interaction Events',
    '',
    ...listOrFallback(sourceReview.interactions.slice(0, 40).map((interaction) =>
      `- ${interaction.kind}: ${interaction.target ?? '(unknown)'} - ${interaction.migrationHint}`,
    )),
    '',
    '### Routing And Layout',
    '',
    '#### Route And Parameters',
    '',
    `- Source route: ${sourceReview.metadata.route ?? '(unknown)'}`,
    `- Target route files: ${sourceReview.reusable.routesFiles.join(', ') || '(unresolved)'}`,
    '',
    '#### Route Behaviors',
    '',
    ...listOrFallback(sourceReview.routes.map((route) =>
      `- ${route.action}: ${[route.target, route.params].filter(Boolean).join(' / ') || '(unknown)'} - ${route.migrationHint}`,
    )),
    '',
    '#### Layout Model',
    '',
    ...listOrFallback(sourceReview.layout.map((layout) =>
      `- ${layout.kind} ${layout.selector}: ${layout.migrationHint}`,
    )),
    '',
    '### Theme, I18n And Assets',
    '',
    '#### Source Style Tokens',
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
    '### Reusable Target Capabilities',
    '',
    `- Widgets: ${sourceReview.reusable.widgets.join(', ') || '(none detected)'}`,
    `- Route files: ${sourceReview.reusable.routesFiles.join(', ') || '(none detected)'}`,
    `- Translation files: ${sourceReview.reusable.translationFiles.join(', ') || '(none detected)'}`,
    `- Asset directories: ${sourceReview.reusable.assetDirectories.join(', ') || '(none detected)'}`,
    `- Similar files: ${sourceReview.reusable.similarFiles.slice(0, 12).join(', ') || '(none detected)'}`,
    '',
    '### Manual Confirmation',
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
