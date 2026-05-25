import type {
  PageCanonical,
  PageSnapshotNode,
  UiBuildPlan,
  UiDynamicTextHint,
  InteractionPlan,
} from '../../../types/index.js';
import { genericProfile } from '../../../profile/index.js';
import type { ResolvedRestorationProfile, RestorationProfile } from '../../../profile/index.js';
import { toSnakeCase } from './migration-planner.js';
import { collectStrings, dedupe, sourceSections } from './ui-reconstruction-shared.js';

export function buildI18nPlan(
  evidence: PageCanonical,
  restorationProfile?: ResolvedRestorationProfile | undefined,
): UiBuildPlan['i18nPlan'] {
  const dynamicHints = buildDynamicTextHints(evidence, restorationProfile);
  const dynamicByText = new Map(dynamicHints.map((hint) => [hint.text, hint]));
  const sourceI18nTexts = Object.values(evidence.sourceFacts?.analysis.i18n ?? {})
    .flatMap((value) => collectStrings(value))
    .filter((text) => text.length <= 120);
  const texts = dedupe([
    ...evidence.text.filter((text) => text.length <= 120),
    ...sourceI18nTexts,
  ])
    .filter((text) => text.length <= 120)
    .slice(0, 120)
    .map((text) => {
      const dynamic = dynamicByText.get(text);
      const nodeIds = evidence.nodes.filter((node) => node.text === text).map((node) => node.id).slice(0, 8);
      return {
        text,
        nodeIds,
        ...(dynamic ? { dynamic: true, dynamicKind: dynamic.kind } : suggestedKey(text)),
      };
    });
  return {
    texts,
    recommendation: 'Visible static text should use the i18n API detected in targetConventions when available; dynamic values such as counts, prices, percentages, dates, and quantities should be formatted from UI model data instead of becoming fixed translation keys.',
  };
}

export function buildDynamicTextHints(
  evidence: PageCanonical,
  restorationProfile?: ResolvedRestorationProfile | undefined,
): UiDynamicTextHint[] {
  const profile = restorationProfile?.profile ?? genericProfile;
  return evidence.nodes
    .filter((node) => node.text?.trim())
    .flatMap((node) => {
      const text = node.text?.trim() ?? '';
      const kind = dynamicTextKind(text, node, evidence, profile);
      if (!kind) return [];
      return [{
        nodeId: node.id,
        text,
        kind,
        ...relatedNodeForDynamicText(kind, node, evidence),
        recommendation: recommendationForDynamicText(kind),
      }];
    })
    .slice(0, 120);
}

function dynamicTextKind(
  text: string,
  node: PageSnapshotNode,
  evidence: PageCanonical,
  profile: RestorationProfile,
): UiDynamicTextHint['kind'] | undefined {
  if (/^（\d+）$|^\(\d+\)$/.test(text) && isNearListHeading(node, evidence, profile)) return 'list-count';
  if (/^[+-]?\$[\d,]+(?:\.\d+)?$|^[+-]?[\d,]+(?:\.\d+)?\s?(USD|HKD|CNY)$/i.test(text)) return 'money';
  if (/^[+-]?\d+(?:\.\d+)?%$/.test(text)) return 'percent';
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(text)) return 'date';
  if (profileQuantityPattern(profile).test(text)) return 'quantity';
  return undefined;
}

function isNearListHeading(
  node: PageSnapshotNode,
  evidence: PageCanonical,
  profile = genericProfile,
): boolean {
  const headingPattern = profileListHeadingPattern(profile);
  return evidence.nodes.some((candidate) => {
    if (candidate.id === node.id || !candidate.text) return false;
    const sameRow = Math.abs(candidate.bbox.y - node.bbox.y) <= 8;
    const near = Math.abs(candidate.bbox.x + candidate.bbox.width - node.bbox.x) <= 80 || Math.abs(candidate.bbox.x - node.bbox.x) <= 240;
    return sameRow && near && headingPattern.test(candidate.text);
  });
}

function relatedNodeForDynamicText(
  kind: UiDynamicTextHint['kind'],
  node: PageSnapshotNode,
  evidence: PageCanonical,
): { relatedNodeId?: string } {
  if (kind !== 'list-count') return {};
  const related = evidence.sections.find((section) =>
    section.role === 'list'
    && section.bbox.y >= node.bbox.y
    && section.bbox.y - node.bbox.y <= 120,
  );
  return related?.nodeIds[0] ? { relatedNodeId: related.nodeIds[0] } : {};
}

function recommendationForDynamicText(kind: UiDynamicTextHint['kind']): string {
  const recommendations: Record<UiDynamicTextHint['kind'], string> = {
    'list-count': 'Derive this count from the backing list/model length instead of hard-coding it in a translation key.',
    money: 'Format this value from UI model data with the target currency/number formatter.',
    percent: 'Format this percentage from UI model data instead of treating it as static copy.',
    date: 'Format this date from UI model data with the target date formatter.',
    quantity: 'Format this quantity from UI model data; translate only the label portion.',
    'dynamic-value': 'Render this value from UI model data instead of static copy.',
  };
  return recommendations[kind];
}

function suggestedKey(text: string): { suggestedKey?: string } {
  const key = toSnakeCase(text).slice(0, 48);
  return key ? { suggestedKey: key } : {};
}

export function buildAssetPlan(evidence: PageCanonical): UiBuildPlan['assetPlan'] {
  const sourceAssets = evidence.sourceFacts?.analysis.sfc?.assets ?? [];
  return {
    assets: [
      ...evidence.assets.slice(0, 80).map((asset) => ({
      source: asset.source,
      kind: asset.kind,
      nodeId: asset.nodeId,
      recommendation: asset.source
        ? 'Match this source with an existing target asset first; add a TODO if no local asset exists.'
        : 'Inline or generated visual asset detected; recreate with detected target icon/SVG/image conventions.',
      })),
      ...sourceAssets.slice(0, 80).map((asset) => ({
        source: asset.source,
        kind: sourceAssetKind(asset.kind),
        recommendation: asset.migrationHint,
      })),
    ],
    recommendation: 'Prefer existing assets/images, assets/dark_images, assets/svg, and assets/json entries before adding new files.',
  };
}

export function buildInteractionPlan(evidence: PageCanonical): InteractionPlan[] {
  const runtime = evidence.interactions.slice(0, 80).map((interaction) => ({
    kind: interaction.kind,
    label: interaction.label,
    nodeId: interaction.nodeId,
    recommendation: 'Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar target example confirms it.',
  }));
  const source = (evidence.sourceFacts?.analysis.sfc?.interactions ?? []).slice(0, 80).map((interaction, index) => ({
    kind: sourceInteractionKind(interaction.kind),
    label: interaction.target,
    nodeId: `source:interaction:${index}`,
    recommendation: interaction.evidence,
  }));
  return [...runtime, ...source];
}

export function buildBusinessQuestions(evidence: PageCanonical): string[] {
  const questions = [
    '确认页面真实数据来源、接口字段和加载/空态策略。',
    '确认点击、跳转、弹层、筛选和输入行为的业务规则。',
    '确认权限、风控、埋点和异常处理是否需要在本页面接入。',
  ];
  if (evidence.interactions.length > 0) {
    questions.push(`PageCanonical 识别到 ${evidence.interactions.length} 个可交互区域，需要逐项确认业务动作。`);
  }
  const source = evidence.sourceFacts?.analysis;
  if (source?.sfc?.state.length) {
    questions.push(`Source facts 识别到 ${source.sfc.state.length} 个状态线索，需要确认哪些属于真实业务状态、哪些只是 UI 临时状态。`);
  }
  return questions;
}

export function buildRisks(evidence: PageCanonical): string[] {
  const risks = [
    'PageCanonical 只能证明当前采集到的可见 UI 与增强证据，不能证明隐藏状态或业务逻辑。',
    '少量 computed style 仍可能映射到多个目标语义 token，需结合 node 上下文和截图二次确认。',
  ];
  if (evidence.assets.length > 0) risks.push('图片、SVG 或背景资源需要确认是否已有目标本地资产可复用。');
  if (evidence.sourceFacts && !evidence.runtimeFacts) risks.push('本次没有 runtime facts，bbox、computed style、当前可见状态和截图对照需要后续 capture 确认。');
  if (evidence.runtimeFacts && !evidence.sourceFacts) risks.push('本次没有 source facts，隐藏状态、业务语义和完整交互空间不能从 runtime 直接推断。');
  if ((evidence.manualConfirmations?.length ?? 0) > 0) risks.push(...(evidence.manualConfirmations ?? []).map((item) => item.question));
  if (evidence.warnings.length > 0) risks.push(...evidence.warnings);
  return risks;
}

export function buildSectionHint(section: PageCanonical['sections'][number], evidence: PageCanonical): string {
  const rootNodeId = section.nodeIds[0];
  const rootNode = evidence.nodes.find((node) => node.id === rootNodeId);
  const computedStyle = rootNode?.computedStyle;
  const layoutHints = [
    computedStyle?.display && computedStyle.display !== 'block'
      ? `display=${computedStyle.display}`
      : '',
    computedStyle?.flexDirection && computedStyle.flexDirection !== 'row'
      ? `flexDirection=${computedStyle.flexDirection}`
      : '',
    computedStyle?.alignItems && computedStyle.alignItems !== 'normal'
      ? `alignItems=${computedStyle.alignItems}`
      : '',
    computedStyle?.justifyContent && computedStyle.justifyContent !== 'normal'
      ? `justifyContent=${computedStyle.justifyContent}`
      : '',
    computedStyle?.gap && computedStyle.gap !== 'normal' && computedStyle.gap !== '0px'
      ? `gap=${computedStyle.gap}`
      : '',
    computedStyle?.padding && computedStyle.padding !== '0px'
      ? `padding=${computedStyle.padding}`
      : '',
    computedStyle?.margin && computedStyle.margin !== '0px'
      ? `margin=${computedStyle.margin}`
      : '',
    section.nodeIds.length > 1 ? `descendants=${section.nodeIds.length - 1}` : '',
  ].filter(Boolean);

  return [
    `还原 ${section.role} 区块，bbox=${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}。`,
    layoutHints.length > 0 ? `布局特征：${layoutHints.join(', ')}。` : '',
  ].filter(Boolean).join(' ');
}

function sourceInteractionKind(kind: NonNullable<PageCanonical['sourceFacts']>['analysis']['sfc'] extends infer S
  ? S extends { interactions: Array<infer I> }
    ? I extends { kind: infer K }
      ? K
      : never
    : never
  : never): InteractionPlan['kind'] {
  if (kind === 'model') return 'input';
  if (kind === 'click') return 'tap';
  return 'unknown';
}

function sourceAssetKind(kind: string): UiBuildPlan['assetPlan']['assets'][number]['kind'] {
  if (kind === 'image') return 'image';
  if (kind === 'svg' || kind === 'inline-svg') return 'svg';
  if (kind === 'icon') return 'icon';
  if (kind === 'background') return 'background';
  return 'unknown';
}

function profileQuantityPattern(profile: RestorationProfile): RegExp {
  const terms = profile.sourceLexicon?.dynamicQuantityTerms ?? [];
  const pattern = terms.map(escapeRegExp).join('|');
  return pattern ? new RegExp(`^(?:${pattern})\\s*\\d+`, 'i') : /$a/;
}

function profileListHeadingPattern(profile: RestorationProfile): RegExp {
  const terms = profile.sourceLexicon?.listHeadingTerms ?? [];
  const pattern = terms.map(escapeRegExp).join('|');
  return pattern ? new RegExp(pattern, 'i') : /$a/;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
