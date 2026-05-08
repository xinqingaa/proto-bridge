import path from 'node:path';
import type { ExportReviewMarkdownInput, ExportReviewMarkdownResult } from '../types/index.js';
import { writeTextFile } from '../utils/path.js';

export async function exportReviewMarkdown(input: ExportReviewMarkdownInput): Promise<ExportReviewMarkdownResult> {
  const markdown = renderReviewMarkdown(input);
  const reviewMarkdownPath = path.join(input.outDir, 'ui-review.md');
  await writeTextFile(reviewMarkdownPath, markdown);
  return {
    markdown,
    files: {
      reviewMarkdown: reviewMarkdownPath,
    },
  };
}

function renderReviewMarkdown(input: ExportReviewMarkdownInput): string {
  const { snapshot, plan } = input;
  return [
    `# ${plan.page.title ?? snapshot.page.title ?? 'Snapshot UI'} Review`,
    '',
    '## Summary',
    '',
    `- Snapshot: \`${snapshot.id}\``,
    `- Plan: \`${plan.id}\``,
    `- Route: ${plan.page.route ?? snapshot.page.route ?? '(unknown)'}`,
    `- Target module: ${plan.target.module ?? '(unresolved)'}`,
    `- Viewport: ${plan.page.viewport.width}x${plan.page.viewport.height}`,
    '',
    plan.page.summary,
    '',
    '## Visual Sections',
    '',
    ...listOrFallback(snapshot.visualSections.slice(0, 24).map((section) =>
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
      `- ${mapping.source} = \`${mapping.value}\` -> ${mapping.target ?? '(manual)'} [${mapping.confidence}]`,
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
    '## Validation Hints',
    '',
    ...listOrFallback(plan.validationHints.map((hint) => `- ${hint}`)),
    '',
  ].join('\n');
}

function listOrFallback(items: string[]): string[] {
  return items.length > 0 ? items : ['- (none)'];
}
