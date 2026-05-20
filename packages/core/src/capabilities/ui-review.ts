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
    `# ${plan.page.title ?? 'Snapshot UI'} Build Brief`,
    '',
    '## Contract authority',
    '',
    `- Plan: \`${plan.id}\``,
    `- Page: \`${plan.pageId}\``,
    `- Route: ${plan.page.route ?? '(unknown)'}`,
    `- Target module: ${plan.target.module ?? '(unresolved)'}`,
    `- Logical source: ${plan.implementationContract.logicalPlanSource}`,
    '- `ui-build-plan.json` is the machine contract. This review is only a human-readable projection of that JSON.',
    '- Source semantics define logical decomposition; targetConventions define engineering expression; visualPlan defines visual facts.',
    '- If target conventions are unknown, keep recommendations abstract and resolve manual questions before introducing frameworks.',
    '',
    '## Detected target conventions',
    '',
    ...renderArchitectureProfile(plan),
    '',
    '## Implementation contract',
    '',
    '### Files',
    '',
    ...listOrFallback(plan.implementationContract.fileTree.map((file) =>
      `- \`${file.path}\`: ${file.responsibility}${file.notes ? ` (${file.notes})` : ''}`,
    )),
    '',
    '### Widget tree',
    '',
    ...listOrFallback(plan.implementationContract.widgetTree.map((widget) =>
      `- ${widget.name}${widget.parent ? ` -> ${widget.parent}` : ''}: ${widget.role}; ${widget.buildHint}; stateAccess=${widget.stateAccess}`,
    )),
    '',
    '### State strategy',
    '',
    ...listOrFallback(plan.implementationContract.stateStrategy.map((strategy) =>
      `- ${strategy.concern} (${strategy.owner}): ${strategy.recommendation}${strategy.evidence ? ` [${strategy.evidence}]` : ''}`,
    )),
    '',
    '### Controller/state boundaries',
    '',
    ...listOrFallback(plan.implementationContract.controllerBoundaries.map((boundary) =>
      `- ${boundary.name}: ${boundary.responsibility}; owns=[${boundary.owns.join(', ') || 'none'}]; avoids=[${boundary.avoids.join(', ') || 'none'}]`,
    )),
    '',
    '### Widget contracts',
    '',
    ...listOrFallback(plan.implementationContract.widgetContracts.map((contract) =>
      `- ${contract.widget}: inputs=[${contract.inputs.join(', ') || 'none'}], callbacks=[${contract.callbacks.join(', ') || 'none'}], shouldReadController=${contract.shouldReadController}; ${contract.notes}`,
    )),
    '',
    '### Contract rules',
    '',
    ...listOrFallback(plan.implementationContract.rules.map((rule) => `- ${rule}`)),
    '',
    '## Visual plan',
    '',
    `- Viewport: ${plan.visualPlan.viewport.width}x${plan.visualPlan.viewport.height}`,
    `- Screenshots: ${plan.visualPlan.screenshotRefs.join(', ') || '(none)'}`,
    '',
    '### Section evidence',
    '',
    ...listOrFallback(plan.visualPlan.sections.slice(0, 40).map((section) =>
      `- ${section.role}: ${section.title ?? section.id} (${section.bbox.x}, ${section.bbox.y}, ${section.bbox.width}, ${section.bbox.height}); nodes=${section.nodeIds.length}`,
    )),
    '',
    '### Component mappings',
    '',
    ...listOrFallback(plan.componentMappings.map((mapping) =>
      `- ${mapping.sourceRole}: ${mapping.targetSymbol ?? '(local widget)'} [${mapping.confidence}] - ${mapping.reason}`,
    )),
    '',
    '### Theme mappings',
    '',
    ...listOrFallback(plan.themeMappings.slice(0, 40).map((mapping) =>
      [
        `- ${mapping.kind ?? 'style'} ${mapping.source} = \`${mapping.value}\` -> ${mapping.target ?? '(manual)'}`,
        `[${mapping.confidence}${mapping.matchedBy ? `, ${mapping.matchedBy}` : ''}]`,
        mapping.lockToken ? 'lockToken=true' : '',
        mapping.doNotOverride?.length ? `doNotOverride=${mapping.doNotOverride.join('/')}` : '',
      ].filter(Boolean).join(' '),
    )),
    '',
    '## I18n, assets, interactions',
    '',
    '### I18n',
    '',
    plan.i18nPlan.recommendation,
    '',
    ...listOrFallback(plan.i18nPlan.texts.slice(0, 40).map((item) =>
      `- ${item.suggestedKey ? `\`${item.suggestedKey}\`` : '(key TBD)'}: ${item.text}`,
    )),
    '',
    '### Assets',
    '',
    plan.assetPlan.recommendation,
    '',
    ...listOrFallback(plan.assetPlan.assets.slice(0, 40).map((asset) =>
      `- ${asset.kind}: ${asset.source ?? asset.nodeId ?? '(inline)'} - ${asset.recommendation}`,
    )),
    '',
    '### Interactions',
    '',
    ...listOrFallback(plan.interactionPlan.map((interaction) =>
      `- ${interaction.kind}: ${interaction.label ?? interaction.nodeId} - ${interaction.recommendation}`,
    )),
    '',
    '## Risks and validation',
    '',
    '### Contract warnings',
    '',
    ...listOrFallback(plan.implementationContract.contractWarnings.map((warning) => `- ${warning}`)),
    '',
    '### Manual questions',
    '',
    ...listOrFallback([
      ...plan.implementationContract.manualQuestions,
      ...plan.businessQuestions,
    ].map((question) => `- ${question}`)),
    '',
    '### Risks',
    '',
    ...listOrFallback(plan.risks.map((risk) => `- ${risk}`)),
    '',
    '### Validation hints',
    '',
    ...listOrFallback(plan.validationHints.map((hint) => `- ${hint}`)),
    '',
  ].join('\n');
}

function renderArchitectureProfile(plan: UiBuildPlan): string[] {
  const profile = plan.targetConventions.architectureProfile;
  return [
    `- State: ${profile.state.pattern} [${profile.state.confidence}]`,
    `  - package: ${profile.state.package?.pattern ?? 'unknown'} [${profile.state.package?.confidence ?? 'low'}]`,
    `  - global: ${profile.state.global?.pattern ?? 'unknown'} [${profile.state.global?.confidence ?? 'low'}]`,
    `  - page: ${profile.state.page?.pattern ?? 'unknown'} [${profile.state.page?.confidence ?? 'low'}]`,
    ...profile.state.examples.slice(0, 4).map(formatEvidence),
    `- Routing: ${profile.routing.pattern} [${profile.routing.confidence}]`,
    `  - registration: ${profile.routing.registration?.pattern ?? 'unknown'} [${profile.routing.registration?.confidence ?? 'low'}]`,
    `  - navigation: ${profile.routing.navigation?.pattern ?? 'unknown'} [${profile.routing.navigation?.confidence ?? 'low'}]`,
    ...profile.routing.examples.slice(0, 4).map(formatEvidence),
    `- I18n: ${profile.i18n.pattern} [${profile.i18n.confidence}]`,
    `  - lookup: ${profile.i18n.lookup?.pattern ?? 'unknown'} [${profile.i18n.lookup?.confidence ?? 'low'}]`,
    ...profile.i18n.examples.slice(0, 4).map(formatEvidence),
    `- Theme: ${profile.theme.patterns.join(', ') || 'unknown'} [${profile.theme.confidence}]`,
    ...profile.theme.examples.slice(0, 4).map(formatEvidence),
    `- Components: ${profile.components.detectedSymbols.join(', ') || 'none detected'} [${profile.components.confidence}]`,
    ...profile.components.examples.slice(0, 6).map(formatEvidence),
    `- File organization: ${profile.fileOrganization.pattern} [${profile.fileOrganization.confidence}]`,
    ...profile.fileOrganization.examples.slice(0, 4).map(formatEvidence),
    ...(plan.targetConventions.unresolved.length
      ? ['- Unresolved:', ...plan.targetConventions.unresolved.map((item) => `  - ${item}`)]
      : []),
  ];
}

function formatEvidence(evidence: {
  file: string;
  line?: number | undefined;
  symbol: string;
  snippet: string;
}): string {
  return `  - ${evidence.symbol}: \`${evidence.file}${evidence.line ? `:${evidence.line}` : ''}\` ${evidence.snippet}`;
}

function listOrFallback(items: string[]): string[] {
  return items.length > 0 ? items : ['- (none)'];
}
