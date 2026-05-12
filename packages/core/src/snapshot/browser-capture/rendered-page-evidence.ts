import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  CapturePageCanonicalInput,
  CapturePageCanonicalResult,
  PageCanonical,
  PageSnapshotNode,
  SnapshotComputedStyle,
  UiBuildPlan,
  VisualSection,
  VisualTokenEvidence,
} from '../../types/index.js';
import { writeJsonFile } from '../../artifacts/artifact-writer.js';
import { detectPageCapabilities } from '../capabilities/detect-page-capabilities.js';
import { buildCapturedPageEvidence } from './build-page-evidence.js';
import { createPageId } from './evidence-id.js';
import { extractRenderedPage } from './extract-rendered-page.js';
import { readRuntimePageProtocol } from './runtime-page-protocol.js';

const DEFAULT_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1 };

export async function captureRenderedPageCanonical(input: CapturePageCanonicalInput): Promise<CapturePageCanonicalResult> {
  const viewport = input.viewport ?? DEFAULT_VIEWPORT;
  const saveArtifacts = input.saveArtifacts ?? true;
  const capturedAt = new Date().toISOString();
  const pageId = createPageId(input.url, capturedAt);

  await mkdir(input.outDir, { recursive: true });
  const screenshotsDir = path.join(input.outDir, 'screenshots');
  if (saveArtifacts) await mkdir(screenshotsDir, { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: viewport.deviceScaleFactor ?? DEFAULT_VIEWPORT.deviceScaleFactor,
    });
    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 30_000 });

    const capabilities = await detectPageCapabilities(page);
    const runtime = capabilities.runtimeMetadata || capabilities.pageList
      ? await readRuntimePageProtocol(page)
      : undefined;
    const screenshotPath = saveArtifacts ? path.join(screenshotsDir, 'full-page.png') : undefined;
    if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

    const extracted = await extractRenderedPage(page, viewport);
    const pageCanonicalPath = path.join(input.outDir, 'page-canonical.json');
    const pageDebugIndexPath = path.join(input.outDir, 'page-debug-index.json');
    const screenshotArtifacts = screenshotPath
      ? [{
        name: 'full-page',
        path: screenshotPath,
        width: extracted.documentSize.width,
        height: extracted.documentSize.height,
        kind: 'full-page' as const,
      }]
      : [];
    const pageCanonical = withArtifacts(buildCapturedPageEvidence({
      id: pageId,
      url: input.url,
      capturedAt,
      viewport,
      screenshotPath,
      extracted,
      capabilities,
      runtime,
    }), {
      rootDir: input.outDir,
      pageCanonical: pageCanonicalPath,
      pageDebugIndex: pageDebugIndexPath,
      screenshots: screenshotArtifacts,
    });

    await writeJsonFile(pageCanonicalPath, pageCanonical);
    await writeJsonFile(pageDebugIndexPath, buildPageDebugIndex(pageCanonical));

    return {
      page: pageCanonical,
      capabilities,
      files: {
        pageCanonical: pageCanonicalPath,
        pageDebugIndex: pageDebugIndexPath,
        screenshots: screenshotPath ? [screenshotPath] : [],
      },
    };
  } finally {
    await browser.close();
  }
}

export const captureRenderedPageEvidence = captureRenderedPageCanonical;

function withArtifacts(
  page: PageCanonical,
  artifacts: PageCanonical['artifacts'],
): PageCanonical {
  return {
    ...page,
    pageId: page.id,
    screenshots: artifacts.screenshots,
    artifacts,
  };
}

export function buildPageDebugIndex(page: PageCanonical, plan?: UiBuildPlan | undefined): Record<string, unknown> {
  const sectionIdsByNode = buildSectionIdsByNode(page.sections);
  const interactionsByNode = buildInteractionsByNode(page);
  const assetsByNode = buildAssetsByNode(page);
  return {
    schemaVersion: 2,
    pageId: page.pageId,
    title: page.page.title,
    route: summarizeText(page.page.route, 160),
    source: {
      kind: page.source.kind,
      route: summarizeText(page.source.route, 160),
      url: summarizeText(page.source.url, 240),
      capturedAt: page.source.capturedAt,
    },
    viewport: page.viewport,
    counts: {
      sections: page.sections.length,
      nodes: page.nodes.length,
      text: page.text.length,
      assets: page.assets.length,
      interactions: page.interactions.length,
      screenshots: page.screenshots.length,
    },
    sections: page.sections.map((section) => ({
      id: section.id,
      role: section.role,
      title: section.title,
      bbox: section.bbox,
      nodeCount: section.nodeIds.length,
      keyNodeIds: keyNodeIdsForSection(page, section, interactionsByNode).slice(0, 10),
      textAnchors: textAnchorsForSection(page, section),
    })),
    textAnchors: page.text.slice(0, 80),
    criticalNodes: buildCriticalNodes(page, sectionIdsByNode, interactionsByNode, assetsByNode),
    assetIndex: page.assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      nodeId: asset.nodeId,
      bbox: asset.bbox,
      source: summarizeAssetSource(asset.source),
      sectionIds: asset.nodeId ? sectionIdsByNode.get(asset.nodeId) ?? [] : [],
    })),
    interactionIndex: page.interactions.map((interaction) => ({
      id: interaction.id,
      kind: interaction.kind,
      nodeId: interaction.nodeId,
      label: interaction.label,
      sectionIds: sectionIdsByNode.get(interaction.nodeId) ?? [],
    })),
    tokenSummary: buildTokenSummary(page, plan),
    diagnostics: buildDiagnostics(page, plan, sectionIdsByNode),
    ...(plan ? { mappingSummary: buildMappingSummary(plan) } : {}),
    riskIndex: buildRiskIndex(page, plan, sectionIdsByNode),
    capabilities: page.capabilities,
    warnings: page.warnings,
    mismatches: page.mismatches,
    artifacts: page.artifacts,
  };
}

function buildSectionIdsByNode(sections: VisualSection[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const section of sections) {
    for (const nodeId of section.nodeIds) {
      const values = result.get(nodeId) ?? [];
      values.push(section.id);
      result.set(nodeId, values);
    }
  }
  return result;
}

function buildInteractionsByNode(page: PageCanonical): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const interaction of page.interactions) {
    const values = result.get(interaction.nodeId) ?? [];
    values.push(interaction.id);
    result.set(interaction.nodeId, values);
  }
  return result;
}

function buildAssetsByNode(page: PageCanonical): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const asset of page.assets) {
    if (!asset.nodeId) continue;
    const values = result.get(asset.nodeId) ?? [];
    values.push(asset.id);
    result.set(asset.nodeId, values);
  }
  return result;
}

function textAnchorsForSection(page: PageCanonical, section: VisualSection): string[] {
  const anchors: string[] = [];
  const nodeIds = new Set(section.nodeIds);
  for (const node of page.nodes) {
    if (!nodeIds.has(node.id) || !node.text) continue;
    anchors.push(node.text);
    if (anchors.length >= 6) break;
  }
  return anchors;
}

function keyNodeIdsForSection(
  page: PageCanonical,
  section: VisualSection,
  interactionsByNode: Map<string, string[]>,
): string[] {
  const nodeIds = new Set(section.nodeIds);
  return page.nodes
    .filter((node) => nodeIds.has(node.id) && (isCriticalNode(node) || interactionsByNode.has(node.id)))
    .map((node) => node.id);
}

function buildCriticalNodes(
  page: PageCanonical,
  sectionIdsByNode: Map<string, string[]>,
  interactionsByNode: Map<string, string[]>,
  assetsByNode: Map<string, string[]>,
): Array<Record<string, unknown>> {
  return page.nodes
    .filter((node) => isCriticalNode(node) || interactionsByNode.has(node.id))
    .slice(0, 60)
    .map((node) => ({
      id: node.id,
      role: node.role,
      tag: node.tag,
      text: node.text,
      bbox: node.bbox,
      sectionIds: sectionIdsByNode.get(node.id) ?? [],
      style: diagnosticStyle(node),
      assetRefs: node.assetRefs ?? assetsByNode.get(node.id),
      interactionIds: interactionsByNode.get(node.id),
    }));
}

function isCriticalNode(node: PageSnapshotNode): boolean {
  if (node.text || node.assetRefs?.length) return true;
  if (['app-bar', 'tab-bar', 'card', 'list', 'button', 'input', 'image', 'icon', 'modal', 'bottom-bar'].includes(node.role)) return true;
  const style = node.computedStyle;
  if (!style) return false;
  return Boolean(
    visibleColor(style.backgroundColor)
    || nonZeroRadius(style.borderRadius)
    || nonZeroBorder(style.border)
    || nonZeroShadow(style.boxShadow)
    || style.overflow && style.overflow !== 'visible'
  );
}

function diagnosticStyle(node: PageSnapshotNode): Record<string, string> | undefined {
  const style = node.computedStyle;
  if (!style) return undefined;
  const includeLayout = ['app-bar', 'tab-bar', 'section', 'card', 'list', 'bottom-bar', 'modal'].includes(node.role);
  const includeText = Boolean(node.text);
  return pickDefined({
    display: includeLayout ? style.display : undefined,
    position: includeLayout ? style.position : undefined,
    flexDirection: includeLayout ? style.flexDirection : undefined,
    alignItems: includeLayout ? style.alignItems : undefined,
    justifyContent: includeLayout ? style.justifyContent : undefined,
    gap: nonZeroValue(style.gap) ? style.gap : undefined,
    padding: nonZeroBox(style.padding) ? style.padding : undefined,
    margin: nonZeroBox(style.margin) ? style.margin : undefined,
    color: includeText && visibleColor(style.color) ? style.color : undefined,
    backgroundColor: visibleColor(style.backgroundColor) ? style.backgroundColor : undefined,
    font: includeText ? [style.fontSize, style.lineHeight, style.fontWeight].filter(Boolean).join('/') : undefined,
    borderRadius: nonZeroRadius(style.borderRadius) ? style.borderRadius : undefined,
    border: nonZeroBorder(style.border) ? style.border : undefined,
    boxShadow: nonZeroShadow(style.boxShadow) ? style.boxShadow : undefined,
    overflow: style.overflow && style.overflow !== 'visible' ? style.overflow : undefined,
  });
}

function pickDefined(values: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value) result[key] = value;
  }
  return result;
}

function compactToken(token: VisualTokenEvidence): Record<string, unknown> {
  return {
    kind: token.kind,
    source: token.source,
    value: token.value,
    cssVar: token.cssVar,
    usage: token.usage.slice(0, 20),
    candidateTarget: token.candidateTarget,
    confidence: token.confidence,
  };
}

function buildTokenSummary(page: PageCanonical, plan: UiBuildPlan | undefined): Record<string, unknown> {
  const tokens = page.tokens ?? [];
  const byKind = countBy(tokens, (token) => token.kind);
  const byConfidence = countBy(tokens, (token) => token.confidence);
  const themeByMatch = plan ? countBy(plan.themeMappings, (mapping) => mapping.matchedBy ?? 'unknown') : {};
  return {
    counts: {
      total: tokens.length,
      byKind,
      byConfidence,
      themeByMatch,
    },
    lowConfidenceSamples: tokens
      .filter((token) => token.confidence === 'low')
      .slice(0, 16)
      .map(compactToken),
  };
}

function buildMappingSummary(plan: UiBuildPlan): Record<string, unknown> {
  return {
    planId: plan.id,
    targetModule: plan.target.module,
    counts: {
      files: plan.fileTree.length,
      widgets: plan.widgetTree.length,
      componentMappings: plan.componentMappings.length,
      themeMappings: plan.themeMappings.length,
      risks: plan.risks.length,
    },
    files: plan.fileTree.map((file) => file.path).slice(0, 16),
    lowConfidenceComponentMappings: plan.componentMappings
      .filter((mapping) => mapping.confidence === 'low')
      .slice(0, 8)
      .map((mapping, index) => ({
        id: `component:${index}`,
        sourceRole: mapping.sourceRole,
        nodeIds: mapping.nodeIds.slice(0, 24),
        targetSymbol: mapping.targetSymbol,
      })),
    ambiguousThemeMappings: plan.themeMappings
      .filter((mapping) => mapping.matchedBy === 'ambiguous' || mapping.matchedBy === 'manual' || mapping.confidence === 'low')
      .slice(0, 12)
      .map((mapping, index) => ({
        id: `theme:${index}`,
        kind: mapping.kind,
        source: mapping.source,
        value: mapping.value,
        nodeIds: mapping.nodeIds?.slice(0, 24),
        target: mapping.target,
        matchedBy: mapping.matchedBy,
        confidence: mapping.confidence,
      })),
    riskCount: plan.risks.length,
  };
}

function buildDiagnostics(
  page: PageCanonical,
  plan: UiBuildPlan | undefined,
  sectionIdsByNode: Map<string, string[]>,
): Record<string, unknown> {
  return {
    background: diagnoseBackground(page, plan, sectionIdsByNode),
    tabStates: diagnoseTabStates(page),
    componentBackgroundRisks: diagnoseComponentBackgroundRisks(page, plan, sectionIdsByNode),
    colorTrace: diagnoseColorTrace(page, plan),
    scrollCoverage: diagnoseScrollCoverage(page),
    compression: diagnoseCompression(page, plan),
  };
}

function diagnoseBackground(
  page: PageCanonical,
  plan: UiBuildPlan | undefined,
  sectionIdsByNode: Map<string, string[]>,
): Record<string, unknown> {
  const backgroundNodes = page.nodes
    .filter((node) => visibleColor(node.computedStyle?.backgroundColor))
    .slice(0, 24)
    .map((node) => ({
      nodeId: node.id,
      role: node.role,
      bbox: node.bbox,
      sectionIds: sectionIdsByNode.get(node.id) ?? [],
      backgroundColor: node.computedStyle?.backgroundColor,
    }));
  return {
    status: backgroundNodes.length > 0 ? 'evidence-present' : 'not-observed',
    confidence: backgroundNodes.length > 0 ? 'high' : 'medium',
    finding: backgroundNodes.length > 0
      ? '页面背景已进入 evidence；若还原偏差，应继续检查 theme mapping 或 Flutter 实现。'
      : '未发现明确背景节点；需要检查截图或 computed style 抽取。',
    evidenceRefs: backgroundNodes,
    nextCheck: plan ? '检查 mappingSummary.ambiguousThemeMappings 中 backgroundColor 相关项。' : '生成 UI plan 后检查 backgroundColor theme mapping。',
  };
}

function diagnoseTabStates(page: PageCanonical): Record<string, unknown> {
  if (page.tabStates?.length) {
    return {
      status: 'runtime-or-explicit',
      confidence: 'high',
      finding: 'tab state 已由 runtime metadata 或显式 evidence 给出。',
      evidenceRefs: page.tabStates,
      nextCheck: '实现时按 active/inactive state 落地。',
    };
  }
  const tabSections = page.sections
    .filter((section) => section.role === 'tab-bar')
    .slice(0, 20)
    .map((section) => ({
      sectionId: section.id,
      title: section.title,
      bbox: section.bbox,
      textAnchors: textAnchorsForSection(page, section).slice(0, 8),
    }));
  return {
    status: tabSections.length > 0 ? 'heuristic-only' : 'not-observed',
    confidence: tabSections.length > 0 ? 'medium' : 'low',
    finding: tabSections.length > 0
      ? 'tab 选中态当前主要依赖 DOM/样式 heuristic；未看到 runtime tab state。'
      : '未识别到 tab-bar section。',
    evidenceRefs: tabSections,
    nextCheck: '检查 active 文本颜色、underline/indicator 节点、aria-selected 或 runtime metadata。',
  };
}

function diagnoseComponentBackgroundRisks(
  page: PageCanonical,
  plan: UiBuildPlan | undefined,
  sectionIdsByNode: Map<string, string[]>,
): Record<string, unknown> {
  if (!plan) {
    return {
      status: 'needs-plan',
      confidence: 'low',
      finding: '需要生成 UI plan 后才能判断组件复用背景风险。',
      evidenceRefs: [],
      nextCheck: '调用 build_ui_plan。',
    };
  }
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const risks = plan.componentMappings
    .filter((mapping) => mapping.targetSymbol && mapping.confidence !== 'low')
    .flatMap((mapping) => mapping.nodeIds.map((nodeId) => ({ mapping, node: nodesById.get(nodeId) })))
    .filter((item) => visibleColor(item.node?.computedStyle?.backgroundColor))
    .slice(0, 24)
    .map((item) => ({
      nodeId: item.node?.id,
      sectionIds: item.node ? sectionIdsByNode.get(item.node.id) ?? [] : [],
      sourceRole: item.mapping.sourceRole,
      targetSymbol: item.mapping.targetSymbol,
      backgroundColor: item.node?.computedStyle?.backgroundColor,
      confidence: item.mapping.confidence,
    }));
  return {
    status: risks.length > 0 ? 'risk-observed' : 'no-obvious-risk',
    confidence: risks.length > 0 ? 'medium' : 'medium',
    finding: risks.length > 0
      ? '存在带背景节点映射到目标组件，需确认目标组件默认背景/边距不会带偏。'
      : '未发现明显的带背景节点复用组件风险。',
    evidenceRefs: risks,
    nextCheck: '对照 target component 默认 style；必要时使用本地 widget 或覆盖背景/圆角/padding。',
  };
}

function diagnoseColorTrace(page: PageCanonical, plan: UiBuildPlan | undefined): Record<string, unknown> {
  const visibleColors = new Set<string>();
  for (const node of page.nodes) {
    if (visibleColor(node.computedStyle?.color)) visibleColors.add(node.computedStyle?.color ?? '');
    if (visibleColor(node.computedStyle?.backgroundColor)) visibleColors.add(node.computedStyle?.backgroundColor ?? '');
  }
  const mappedValues = new Set(plan?.themeMappings.filter((mapping) => mapping.kind === 'color').map((mapping) => mapping.value) ?? []);
  const unmappedSamples = [...visibleColors].filter((color) => !mappedValues.has(color)).slice(0, 20);
  return {
    status: plan ? (unmappedSamples.length > 0 ? 'partial' : 'mapped') : 'needs-plan',
    confidence: plan ? 'medium' : 'low',
    finding: plan
      ? '颜色链路可通过 visibleColors -> themeMappings 排查；未映射样本需要人工确认是否为抽取格式差异或 plan 压缩。'
      : '需要生成 UI plan 后才能判断颜色缺失发生在 token 抽取还是 theme mapping。',
    evidenceRefs: {
      visibleColorCount: visibleColors.size,
      mappedColorCount: mappedValues.size,
      unmappedSamples,
    },
    nextCheck: '若 visibleColors 中有色值但 themeMappings 缺失，查 planner；若两边都有但 Flutter 缺失，查实现。',
  };
}

function diagnoseScrollCoverage(page: PageCanonical): Record<string, unknown> {
  const viewportHeight = page.viewport?.height ?? page.screenshot?.height ?? 0;
  const screenshotHeight = page.screenshot?.height ?? page.screenshots[0]?.height ?? viewportHeight;
  const belowViewportSections = page.sections
    .filter((section) => viewportHeight > 0 && section.bbox.y + section.bbox.height > viewportHeight)
    .slice(0, 24)
    .map((section) => ({
      sectionId: section.id,
      role: section.role,
      title: section.title,
      bbox: section.bbox,
    }));
  return {
    status: screenshotHeight > viewportHeight * 1.1 ? 'long-scroll' : 'single-viewport',
    confidence: 'medium',
    finding: screenshotHeight > viewportHeight * 1.1
      ? 'full-page 截图超过 viewport，已存在首屏外内容；交互态、虚拟列表和滚动边界仍需额外确认。'
      : '当前截图未显示明显长滚动。',
    evidenceRefs: {
      viewportHeight,
      screenshotHeight,
      belowViewportSections,
    },
    nextCheck: '若存在虚拟列表或分页，进入 P3 的 scroll segmentation / interaction state capture。',
  };
}

function diagnoseCompression(page: PageCanonical, plan: UiBuildPlan | undefined): Record<string, unknown> {
  if (!plan) {
    return {
      status: 'needs-plan',
      confidence: 'low',
      finding: '需要生成 UI plan 后才能判断 plan 压缩是否丢失关键节点。',
      evidenceRefs: [],
      nextCheck: '调用 build_ui_plan。',
    };
  }
  const componentNodeIds = new Set(plan.componentMappings.flatMap((mapping) => mapping.nodeIds));
  const themeNodeIds = new Set(plan.themeMappings.flatMap((mapping) => mapping.nodeIds ?? []));
  const criticalNodeIds = page.nodes.filter(isCriticalNode).map((node) => node.id);
  const unmappedCriticalNodeIds = criticalNodeIds
    .filter((nodeId) => !componentNodeIds.has(nodeId) && !themeNodeIds.has(nodeId))
    .slice(0, 40);
  return {
    status: unmappedCriticalNodeIds.length > 0 ? 'review-needed' : 'covered',
    confidence: 'medium',
    finding: unmappedCriticalNodeIds.length > 0
      ? '部分关键节点没有直接进入 component/theme mapping，需确认是否被 widgetTree 或父级 section 合理承接。'
      : '关键节点基本进入 plan mapping。',
    evidenceRefs: {
      sectionCount: page.sections.length,
      nodeCount: page.nodes.length,
      criticalNodeCount: criticalNodeIds.length,
      widgetCount: plan.widgetTree.length,
      componentMappedNodeCount: componentNodeIds.size,
      themeMappedNodeCount: themeNodeIds.size,
      unmappedCriticalNodeIds,
    },
    nextCheck: '从 unmappedCriticalNodeIds 回查 page-canonical；若是重要视觉节点，增强 planner 或实现约束。',
  };
}

function buildRiskIndex(
  page: PageCanonical,
  plan: UiBuildPlan | undefined,
  sectionIdsByNode: Map<string, string[]>,
): Array<Record<string, unknown>> {
  const risks: Array<Record<string, unknown>> = [];
  if (page.capabilities.needsOcr) {
    risks.push({
      layer: 'capture',
      kind: 'ocr-needed',
      severity: 'warning',
      message: '可能存在截图文字或图片文字未进入 DOM evidence。',
    });
  }
  if (page.screenshot && page.viewport && page.screenshot.height > page.viewport.height * 1.25) {
    risks.push({
      layer: 'capture',
      kind: 'long-scroll',
      severity: 'info',
      message: 'full-page 高度明显超过 viewport。',
      screenshotHeight: page.screenshot.height,
      viewportHeight: page.viewport.height,
    });
  }
  for (const asset of page.assets.slice(0, 30)) {
    if (asset.kind === 'svg' || asset.source?.startsWith('data:image/svg')) {
      risks.push({
        layer: 'capture',
        kind: 'svg-asset',
        severity: 'info',
        message: 'SVG 或 inline asset 需要确认目标工程资产。',
        nodeIds: asset.nodeId ? [asset.nodeId] : [],
        sectionIds: asset.nodeId ? sectionIdsByNode.get(asset.nodeId) ?? [] : [],
        assetId: asset.id,
      });
    }
  }
  if (plan) {
    for (const [index, mapping] of plan.componentMappings.entries()) {
      if (mapping.confidence === 'low') {
        risks.push({
          layer: 'plan',
          kind: 'low-confidence-component',
          severity: 'warning',
          mappingId: `component:${index}`,
          nodeIds: mapping.nodeIds.slice(0, 24),
          sourceRole: mapping.sourceRole,
        });
      }
    }
    for (const [index, mapping] of plan.themeMappings.entries()) {
      if (mapping.matchedBy === 'ambiguous' || mapping.matchedBy === 'manual') {
        risks.push({
          layer: 'plan',
          kind: 'ambiguous-theme',
          severity: 'info',
          mappingId: `theme:${index}`,
          nodeIds: mapping.nodeIds?.slice(0, 24),
          source: mapping.source,
          value: mapping.value,
          matchedBy: mapping.matchedBy,
        });
      }
      if (risks.length >= 24) break;
    }
  }
  return risks.slice(0, 30);
}

function visibleColor(value: string | undefined): boolean {
  return Boolean(value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent');
}

function nonZeroValue(value: string | undefined): boolean {
  return Boolean(value && value !== '0px' && value !== 'normal' && value !== 'none');
}

function nonZeroBox(value: string | undefined): boolean {
  return Boolean(value && !/^0px(?: 0px){0,3}$/.test(value));
}

function nonZeroRadius(value: string | undefined): boolean {
  return Boolean(value && value !== '0px');
}

function nonZeroBorder(value: string | undefined): boolean {
  return Boolean(value && !value.startsWith('0px ') && value !== 'none');
}

function nonZeroShadow(value: string | undefined): boolean {
  return Boolean(value && value !== 'none');
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function summarizeAssetSource(source: string | undefined): string | undefined {
  if (!source) return undefined;
  if (source.length <= 180) return source;
  return `${source.slice(0, 160)}...`;
}

function summarizeText(value: string | undefined, maxLength: number): string | undefined {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}
