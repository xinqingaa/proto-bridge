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

function listOrFallback(items: string[]): string[] {
  return items.length > 0 ? items : ['- (none)'];
}
