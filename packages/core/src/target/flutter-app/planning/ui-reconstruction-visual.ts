import type {
  ComponentMapping,
  FlutterComponentRef,
  FlutterComponentRole,
  PageCanonical,
  PageSnapshotNode,
  SnapshotNodeRole,
  UiActionMapping,
  UiNodeAudit,
  UiNodeAuditChild,
  UiNodeAuditControl,
  UiNodeAuditInstance,
  UiNodeAuditInstanceDelta,
  UiNodeAuditKind,
  UiNodeAuditLayoutConflict,
  UiNodeAuditNoiseLevel,
  UiNodeAuditPriority,
  UiNodeAuditStyle,
  UiInteractionTarget,
  UiPlanLayoutConflict,
  UiTargetComponentCandidate,
  MappingConfidence,
  UiVisualPlan,
} from '../../../types/index.js';
import { genericUiLexicon } from '../../../shared/semantic-lexicon.js';
import type { UiSemanticLexicon } from '../../../shared/semantic-lexicon.js';
import { toPascalCase } from './migration-planner.js';
import { buildDynamicTextHints, buildSectionHint } from './ui-reconstruction-content.js';
import { collectDescendants, dedupe, dedupeBy, parseCssNumber, roundCssNumber, sourceComponents, sourceComponentRole, sourceSections } from './ui-reconstruction-shared.js';

export function buildPlanLayoutConflicts(
  evidence: PageCanonical,
  visualPlan: Pick<UiVisualPlan, 'nodeAudits'>,
): UiPlanLayoutConflict[] {
  return visualPlan.nodeAudits
    .filter((audit) => audit.layoutConflicts.some((conflict) => conflict.kind === 'row-flex-multiple-y-bands'))
    .flatMap((audit) => {
      const sourceIntent = sourceLayoutIntentForAudit(evidence, audit);
      if (!sourceIntent) return [];
      const conflict = audit.layoutConflicts.find((item) => item.kind === 'row-flex-multiple-y-bands');
      if (!conflict) return [];
      return [{
        type: 'source-structure-vs-runtime-layout' as const,
        sourceNodeId: audit.sourceNodeId,
        sourceStructure: sourceIntent.structure,
        runtimeObservation: `${conflict.message} flexWrap=${audit.containerStyle.flexWrap ?? 'unknown'}; observedBands=${conflict.observedBands.length}.`,
        sourceIntentLayout: sourceIntent.intent,
        risk: 'Implementation may incorrectly split one semantic source container into independent Flutter rows, or may ignore a runtime wrap that was actually intended.',
        requiresDecision: true,
        decisionOptions: [
          'preserve runtime visual multi-band layout',
          'preserve source sibling structure in one semantic header/container row and resolve width/overflow constraints',
        ],
        evidence: dedupe([
          ...sourceIntent.evidence,
          conflict.message,
          conflict.manualConfirmation,
        ]),
        severity: 'warning' as const,
      }];
    });
}

function sourceLayoutIntentForAudit(
  evidence: PageCanonical,
  audit: UiNodeAudit,
): { structure: string; intent: string; evidence: string[] } | undefined {
  const node = evidence.nodes.find((item) => item.id === audit.sourceNodeId);
  if (!node) return undefined;
  const directLabels = audit.directChildren.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role).filter(Boolean);
  const sourceHeader = sourceSections(evidence).find((section) =>
    section.kind === 'app-bar'
    && /header|nav|filter|section/i.test(`${section.name} ${section.selector ?? ''} ${section.evidence}`)
  );
  const template = evidence.sourceFacts?.analysis.sfc?.template ?? '';
  const hasSectionHeader = /\.ee-section__header|class=["'][^"']*section__header|class=["'][^"']*header/.test(template);
  const hasFilters = /\.ee-filters|class=["'][^"']*filters/.test(template);
  const isRowFlexWrap = audit.containerStyle.display === 'flex'
    && audit.containerStyle.flexDirection === 'row'
    && audit.containerStyle.flexWrap === 'wrap';
  if (!isRowFlexWrap || (!sourceHeader && !hasSectionHeader)) return undefined;
  const structure = directLabels.length
    ? `direct children are source siblings: ${directLabels.join(' / ')}`
    : 'source header container has sibling children';
  return {
    structure: hasFilters
      ? `${structure}; source template includes title/count/filter siblings in a header container.`
      : structure,
    intent: 'single semantic header/container with sibling children; runtime may wrap into multiple visual bands depending on width.',
    evidence: [
      sourceHeader?.evidence ?? 'source template contains a header-like container',
      hasFilters ? 'source template contains filters inside the header container' : '',
      `runtime node ${audit.sourceNodeId} is row flex with flexWrap=${audit.containerStyle.flexWrap ?? 'unknown'}`,
    ].filter(Boolean),
  };
}

export function buildVisualPlan(evidence: PageCanonical, targetContext: {
  components: FlutterComponentRef[];
  componentMappings: ComponentMapping[];
}): UiVisualPlan {
  const nodeAuditResult = buildNodeAudits(evidence, targetContext);
  const dynamicTextHints = buildDynamicTextHints(evidence);
  const layoutConflicts = buildPlanLayoutConflicts(evidence, { nodeAudits: nodeAuditResult.audits } as UiVisualPlan);
  return {
    viewport: evidence.viewport ?? { width: 0, height: 0 },
    sections: evidence.sections.slice(0, 80).map((section) => ({
      id: section.id,
      role: section.role,
      ...(section.title ? { title: section.title } : {}),
      bbox: section.bbox,
      nodeIds: section.nodeIds,
      evidence: section.evidence,
      buildHint: buildSectionHint(section, evidence),
    })),
    nodeAudits: nodeAuditResult.audits,
    nodeAuditSummary: {
      generated: nodeAuditResult.audits.length,
      suppressed: nodeAuditResult.suppressed,
    },
    dynamicTextHints,
    layoutConflicts,
    layoutEvidence: evidence.sections.slice(0, 80).map((section) => {
      const title = section.title ? ` ${section.title}` : '';
      return `${section.role}${title}: bbox=${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}; nodes=${section.nodeIds.length}`;
    }),
    screenshotRefs: evidence.screenshots.map((screenshot) => screenshot.path),
  };
}

function buildNodeAudits(evidence: PageCanonical, targetContext: {
  components: FlutterComponentRef[];
  componentMappings: ComponentMapping[];
}): {
  audits: UiNodeAudit[];
  suppressed: Array<{ nodeId: string; reason: string }>;
} {
  const byId = new Map(evidence.nodes.map((node) => [node.id, node]));
  const profile = genericUiLexicon;
  const actionTargetByNodeId = buildActionTargetBindings(evidence, byId);
  const selected = selectNodeAuditCandidates(evidence, byId, profile);
  const audits = selected.candidates
    .map((candidate) => buildNodeAudit(candidate.node, byId, candidate.coverageReason, candidate.displayInReview, actionTargetByNodeId, profile))
    .filter((audit): audit is UiNodeAudit => Boolean(audit))
    .map((audit) => enrichNodeAuditWithTargetComponents(audit, byId, evidence, targetContext));
  const compressed = compressRepeatedNodeAudits(audits, profile);
  return {
    audits: compressed.audits,
    suppressed: dedupeBy([...compressed.suppressed, ...selected.suppressed], (item) => item.nodeId),
  };
}

function selectNodeAuditCandidates(
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
  profile: UiSemanticLexicon,
): {
  candidates: Array<{ node: PageSnapshotNode; coverageReason: string; displayInReview?: boolean | undefined }>;
  suppressed: Array<{ nodeId: string; reason: string }>;
} {
  const suppressed: Array<{ nodeId: string; reason: string }> = [];
  const sectionRoots = evidence.sections.flatMap((section) => {
    const nodeId = section.nodeIds[0];
    const node = nodeId ? byId.get(nodeId) : undefined;
    if (!node) return [];
    const decision = shouldIncludeSectionRoot(section, node, byId, evidence, profile);
    if (!decision.include) {
      if (decision.reason) suppressed.push({ nodeId: node.id, reason: decision.reason });
      return [];
    }
    return [{ node, coverageReason: decision.reason ?? `representative ${section.role} section` }];
  });
  const directCandidates = evidence.nodes.filter((node) =>
    ['card', 'list-item', 'button', 'tab-bar', 'app-bar', 'bottom-bar', 'modal'].includes(node.role),
  ).flatMap((node) => {
    if (node.role === 'bottom-bar' && hasAncestorRole(node, byId, ['card', 'list-item'])) {
      suppressed.push({ nodeId: node.id, reason: 'bottom action row is covered by parent card/list-item nodeAudit controls.' });
      return [];
    }
    if ((node.role === 'button' || isLikelyChip(node)) && hasAncestorRole(node, byId, ['card', 'list-item'])) {
      suppressed.push({ nodeId: node.id, reason: 'control is covered by a parent card/list-item nodeAudit.' });
      return [];
    }
    if (isMisleadingWrapper(node, byId, evidence)) {
      suppressed.push({ nodeId: node.id, reason: 'wrapper is covered by more specific child nodeAudits.' });
      return [];
    }
    return [{ node, coverageReason: coverageReasonForNode(node) }];
  });
  const selected = dedupeBy([...sectionRoots, ...directCandidates], (candidate) => candidate.node.id)
    .filter((candidate) => shouldAuditNode(candidate.node))
    .sort((left, right) => priorityForAuditRole(left.node.role) - priorityForAuditRole(right.node.role)
      || left.node.bbox.y - right.node.bbox.y
      || left.node.bbox.x - right.node.bbox.x);
  const perKind = new Map<UiNodeAuditKind, number>();
  const result: Array<{ node: PageSnapshotNode; coverageReason: string; displayInReview?: boolean | undefined }> = [];
  for (const candidate of selected) {
    const kind = auditKindForNode(candidate.node);
    const count = perKind.get(kind) ?? 0;
    const limit = auditLimitForKind(kind);
    if (count >= limit) {
      if (kind === 'card' || kind === 'list-item') {
        suppressed.push({ nodeId: candidate.node.id, reason: `additional ${kind} audit retained in plan but omitted from review after representative coverage.` });
        result.push({
          ...candidate,
          coverageReason: `additional ${kind} audit retained in plan for full-fidelity repeated item evidence`,
          displayInReview: false,
        });
        continue;
      }
      suppressed.push({ nodeId: candidate.node.id, reason: `additional ${kind} audit omitted after representative coverage.` });
      continue;
    }
    perKind.set(kind, count + 1);
    result.push(candidate);
  }
  return { candidates: result, suppressed: dedupeBy(suppressed, (item) => item.nodeId) };
}

function shouldAuditNode(node: PageSnapshotNode): boolean {
  if (node.bbox.width <= 0 || node.bbox.height <= 0) return false;
  if (node.role === 'unknown' || node.role === 'text' || node.role === 'icon' || node.role === 'image') return false;
  if (node.role === 'section' && node.children.length === 0) return false;
  return node.children.length > 0 || Boolean(node.text?.trim()) || Boolean(node.assetRefs?.length);
}

function compressRepeatedNodeAudits(audits: UiNodeAudit[], profile = genericUiLexicon): {
  audits: UiNodeAudit[];
  suppressed: Array<{ nodeId: string; reason: string }>;
} {
  const groups = new Map<string, UiNodeAudit[]>();
  for (const audit of audits) {
    if (audit.kind !== 'card' && audit.kind !== 'list-item') continue;
    const key = repeatedAuditGroupKey(audit, profile);
    const current = groups.get(key) ?? [];
    current.push(audit);
    groups.set(key, current);
  }
  const compressedIds = new Set<string>();
  const suppressed: Array<{ nodeId: string; reason: string }> = [];
  const representatives = new Map<string, UiNodeAudit>();
  let groupIndex = 1;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x);
    const representative = sorted[0];
    if (!representative) continue;
    const groupId = `${representative.kind}-group-${groupIndex}`;
    groupIndex += 1;
    const instances = sorted.map((audit) => buildRepeatedAuditInstance(audit, representative, profile));
    const instanceNodeIds = sorted.map((audit) => audit.sourceNodeId);
    for (const audit of sorted.slice(1)) {
      compressedIds.add(audit.sourceNodeId);
      suppressed.push({
        nodeId: audit.sourceNodeId,
        reason: `covered by repeated node audit group ${groupId}; instance deltas are stored on representative ${representative.sourceNodeId}.`,
      });
    }
    representatives.set(representative.sourceNodeId, {
      ...representative,
      displayInReview: true,
      coverageReason: `${representative.coverageReason}; representative for repeated group ${groupId}.`,
      repeatedGroup: {
        groupId,
        mode: 'representative',
        instanceCount: sorted.length,
        representativeNodeId: representative.sourceNodeId,
        instanceNodeIds,
        commonSignature: repeatedAuditCommonSignature(representative, profile),
      },
      instances,
    });
  }
  return {
    audits: audits
      .filter((audit) => !compressedIds.has(audit.sourceNodeId))
      .map((audit) => representatives.get(audit.sourceNodeId) ?? audit),
    suppressed,
  };
}

function repeatedAuditGroupKey(audit: UiNodeAudit, profile = genericUiLexicon): string {
  return [
    audit.kind,
    audit.rows.length,
    ...audit.rows.map((row) => row.children.map((child) => childStructureSignature(child, profile)).join(',')),
    `controls:${audit.controls.map((control) => `${control.kind}:${semanticTextClass(control.text, profile)}`).join(',')}`,
    `container:${styleSignature(audit.containerStyle, ['display', 'flexDirection', 'alignItems', 'justifyContent'])}`,
    `size:${Math.round(audit.bbox.width / 8) * 8}x${Math.round(audit.bbox.height / 8) * 8}`,
  ].join('|');
}

function childStructureSignature(child: UiNodeAuditChild, profile = genericUiLexicon): string {
  return [
    child.role,
    semanticTextClass(child.text, profile),
  ].join(':');
}

function childRoleSignature(child: UiNodeAuditChild, profile = genericUiLexicon): string {
  return [
    child.role,
    semanticTextClass(child.text, profile),
    styleSignature(child.style, ['fontSize', 'fontWeight', 'lineHeight', 'padding', 'borderRadius', 'border', 'height']),
  ].join(':');
}

function styleSignature(style: UiNodeAuditStyle, fields: Array<keyof UiNodeAuditStyle>): string {
  return fields.map((field) => `${field}=${style[field] ?? ''}`).join(';');
}

function repeatedAuditCommonSignature(audit: UiNodeAudit, profile = genericUiLexicon): NonNullable<UiNodeAudit['repeatedGroup']>['commonSignature'] {
  return {
    kind: audit.kind,
    rowCount: audit.rows.length,
    rowRoleSignature: audit.rows.map((row) => row.children.map((child) => childRoleSignature(child, profile)).join(' | ')),
    controlSignature: audit.controls.map((control) => `${control.kind}:${styleSignature(control.style, ['fontSize', 'fontWeight', 'lineHeight', 'padding', 'borderRadius', 'height'])}`),
    styleSignature: Object.fromEntries(
      (['display', 'flexDirection', 'alignItems', 'justifyContent', 'padding', 'borderRadius', 'border', 'boxShadow'] as Array<keyof UiNodeAuditStyle>)
        .map((field) => [field, audit.containerStyle[field] ?? '']),
    ),
  };
}

function buildRepeatedAuditInstance(audit: UiNodeAudit, base: UiNodeAudit, profile = genericUiLexicon): UiNodeAuditInstance {
  const rowText = audit.rows.map((row) => row.children.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role));
  const baseRowText = base.rows.map((row) => row.children.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role));
  const fieldValues = repeatedAuditFieldValues(audit);
  const baseFieldValues = repeatedAuditFieldValues(base);
  const textDeltas = Object.entries(fieldValues)
    .filter(([field, value]) => baseFieldValues[field] !== value)
    .map(([field, value]) => ({
      field,
      base: baseFieldValues[field],
      actual: value,
      risk: deltaRiskForField(field, baseFieldValues[field], value, profile),
    }));
  return {
    nodeId: audit.sourceNodeId,
    bbox: audit.bbox,
    rowText,
    fieldValues,
    semanticHints: Object.fromEntries(Object.keys(fieldValues).map((field) => [field, semanticHintForField(field, fieldValues[field] ?? '', profile)])),
    textDeltas,
    styleDeltas: styleDeltasForAudit(audit, base),
    controlDeltas: controlDeltasForAudit(audit, base),
    stateDeltas: stateDeltasForValues(fieldValues, baseFieldValues, profile),
    layoutDeltas: layoutDeltasForAudit(audit, base, baseRowText, rowText),
    missingEvidence: missingEvidenceForInstance(audit, base),
  };
}

function repeatedAuditFieldValues(audit: UiNodeAudit): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of audit.rows) {
    row.children.forEach((child, index) => {
      const key = `row${row.index}_col${index + 1}`;
      values[key] = child.text ?? child.assetRefs?.join(',') ?? child.role;
    });
  }
  return values;
}

function semanticTextClass(text: string | undefined, profile = genericUiLexicon): string {
  if (!text) return 'non-text';
  if (/^\$?\d+(?:\.\d+)?%?$/.test(text) || /^\$/.test(text)) return 'numeric';
  if (profileStatusPattern(profile).test(text)) return 'status';
  if (profileTimeBadgePattern(profile).test(text)) return 'time-badge';
  if (profileQuantityPattern(profile).test(text)) return 'quantity';
  if (/^[A-Z]{1,6}$/.test(text)) return 'symbol-like';
  if (/\d{4}-\d{2}-\d{2}/.test(text)) return 'contract-like';
  return 'text';
}

function semanticHintForField(field: string, value: string, profile = genericUiLexicon): string {
  const cls = semanticTextClass(value, profile);
  if (cls !== 'text' && cls !== 'non-text') return cls;
  if (/row1_col1/.test(field)) return 'primary-text';
  if (/row3_col/.test(field)) return 'action-or-quantity';
  return cls;
}

function deltaRiskForField(field: string, base: string | undefined, actual: string, profile = genericUiLexicon): string | undefined {
  if (profileStatusPattern(profile).test(`${base ?? ''} ${actual}`)) return 'Do not hard-code one status text or style for all repeated items.';
  if (profileTimeBadgePattern(profile).test(`${base ?? ''} ${actual}`)) return 'Do not hard-code one time badge value for all repeated items.';
  if (profileQuantityPattern(profile).test(`${base ?? ''} ${actual}`)) return 'Quantity-like text should be data-driven per repeated item.';
  if (/^\$/.test(base ?? '') || /^\$/.test(actual)) return 'Price/value text should be data-driven per repeated item.';
  return undefined;
}

function styleDeltasForAudit(audit: UiNodeAudit, base: UiNodeAudit): UiNodeAuditInstanceDelta[] {
  const deltas: UiNodeAuditInstanceDelta[] = [];
  const fields: Array<keyof UiNodeAuditStyle> = ['fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height'];
  audit.rows.forEach((row, rowIndex) => {
    const baseRow = base.rows[rowIndex];
    row.children.forEach((child, childIndex) => {
      const baseChild = baseRow?.children[childIndex];
      if (!baseChild) return;
      for (const field of fields) {
        const actual = child.style[field];
        const expected = baseChild.style[field];
        if (actual !== expected) {
          deltas.push({
            field: `row${row.index}_col${childIndex + 1}.${field}`,
            base: expected,
            actual,
            risk: 'Style differs from representative; implement as data-driven style variant or keep separate widget style.',
          });
        }
      }
    });
  });
  return deltas.slice(0, 40);
}

function controlDeltasForAudit(audit: UiNodeAudit, base: UiNodeAudit): UiNodeAuditInstanceDelta[] {
  const deltas: UiNodeAuditInstanceDelta[] = [];
  const max = Math.max(audit.controls.length, base.controls.length);
  for (let index = 0; index < max; index += 1) {
    const control = audit.controls[index];
    const baseControl = base.controls[index];
    if (!control || !baseControl) {
      deltas.push({
        field: `control${index + 1}`,
        base: baseControl ? baseControl.kind : undefined,
        actual: control ? control.kind : undefined,
        risk: 'Control presence differs across repeated items; verify before sharing one widget implementation.',
      });
      continue;
    }
    const controlText = control.text ?? control.assetRefs?.join(',') ?? control.kind;
    const baseText = baseControl.text ?? baseControl.assetRefs?.join(',') ?? baseControl.kind;
    if (controlText !== baseText) {
      deltas.push({ field: `control${index + 1}.text`, base: baseText, actual: controlText });
    }
    const styleDelta = styleSignature(control.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height'])
      !== styleSignature(baseControl.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height']);
    if (styleDelta) {
      deltas.push({
        field: `control${index + 1}.style`,
        base: styleSignature(baseControl.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height']),
        actual: styleSignature(control.style, ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'padding', 'border', 'borderRadius', 'height']),
        risk: 'Control style differs across repeated items; implement an explicit variant if shared.',
      });
    }
  }
  return deltas.slice(0, 24);
}

function stateDeltasForValues(values: Record<string, string>, baseValues: Record<string, string>, profile = genericUiLexicon): UiNodeAuditInstanceDelta[] {
  return Object.entries(values)
    .filter(([field, value]) => semanticTextClass(value, profile) !== semanticTextClass(baseValues[field], profile))
    .map(([field, value]) => ({
      field,
      base: baseValues[field],
      actual: value,
      risk: 'Semantic text class differs from representative; verify state-specific rendering.',
    }));
}

function layoutDeltasForAudit(
  audit: UiNodeAudit,
  base: UiNodeAudit,
  baseRowText: string[][],
  rowText: string[][],
): UiNodeAuditInstanceDelta[] {
  const deltas: UiNodeAuditInstanceDelta[] = [];
  if (Math.abs(audit.bbox.width - base.bbox.width) > 2) {
    deltas.push({ field: 'bbox.width', base: String(base.bbox.width), actual: String(audit.bbox.width) });
  }
  if (Math.abs(audit.bbox.height - base.bbox.height) > 2) {
    deltas.push({ field: 'bbox.height', base: String(base.bbox.height), actual: String(audit.bbox.height) });
  }
  if (rowText.length !== baseRowText.length) {
    deltas.push({ field: 'rowCount', base: String(baseRowText.length), actual: String(rowText.length), risk: 'Row count differs; this instance may need a separate layout.' });
  }
  return deltas;
}

function missingEvidenceForInstance(audit: UiNodeAudit, base: UiNodeAudit): string[] {
  const missing: string[] = [];
  if (audit.rows.length < base.rows.length) missing.push('fewer rows than representative');
  if (audit.controls.length < base.controls.length) missing.push('fewer controls than representative');
  return missing;
}

function shouldIncludeSectionRoot(
  section: PageCanonical['sections'][number],
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  profile: UiSemanticLexicon,
): { include: boolean; reason?: string | undefined } {
  if (isMisleadingWrapper(node, byId, evidence)) {
    return { include: false, reason: 'large wrapper is covered by more specific child nodeAudits.' };
  }
  if (section.role === 'bottom-bar' && hasAncestorRole(node, byId, ['card', 'list-item'])) {
    return { include: false, reason: 'bottom action row is covered by parent card/list-item nodeAudit controls.' };
  }
  if (section.role === 'list') {
    return hasDescendantRole(node, byId, ['card', 'list-item'])
      ? { include: false, reason: 'list wrapper is covered by child card/list-item nodeAudits.' }
      : { include: true, reason: 'list section has no child card/list-item audit candidate.' };
  }
  if (['app-bar', 'tab-bar', 'bottom-bar', 'modal', 'card', 'list-item'].includes(section.role)) {
    return { include: true, reason: `representative ${section.role} section` };
  }
  if (section.role === 'section') {
    const text = node.text ?? section.title ?? '';
    const focusedText = focusedSectionPattern(profile).test(text);
    const compact = section.bbox.height <= 180 && section.nodeIds.length <= 28;
    const hasDisplayEvidence = collectDescendants(node, byId).some((child) => isAuditVisibleChild(child) || isAuditControl(child));
    if ((focusedText || compact) && hasDisplayEvidence) {
      return { include: true, reason: focusedText ? 'focused header/sort/filter/action section' : 'compact semantic section with visible evidence' };
    }
  }
  if (node.role === 'unknown') {
    const compact = node.bbox.height <= 160 && node.children.length <= 20;
    const hasSpecificChildren = hasDescendantRole(node, byId, ['card', 'list-item', 'button', 'tab-bar', 'app-bar', 'bottom-bar', 'modal']);
    if (compact && !hasSpecificChildren) return { include: true, reason: 'compact unknown section with independent visible evidence' };
    return { include: false, reason: 'unknown wrapper is covered by specific child nodeAudits or has no independent evidence.' };
  }
  return { include: false };
}

function isMisleadingWrapper(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
): boolean {
  const viewport = evidence.viewport;
  const viewportArea = viewport ? viewport.width * viewport.height : 0;
  const nodeArea = node.bbox.width * node.bbox.height;
  const coversViewport = Boolean(viewportArea && nodeArea >= viewportArea * 0.72);
  const largeMultiSection = node.bbox.height >= 360 && hasDescendantRole(node, byId, ['card', 'list-item', 'app-bar', 'tab-bar', 'bottom-bar', 'modal']);
  const wrapperRole = node.role === 'unknown' || node.role === 'section' || (node.role === 'bottom-bar' && coversViewport);
  return wrapperRole && (coversViewport || largeMultiSection);
}

function hasAncestorRole(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  roles: SnapshotNodeRole[],
): boolean {
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return false;
    if (roles.includes(parent.role)) return true;
    parentId = parent.parentId;
  }
  return false;
}

function hasDescendantRole(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  roles: SnapshotNodeRole[],
): boolean {
  return collectDescendants(node, byId).some((child) => child.id !== node.id && roles.includes(child.role));
}

function auditLimitForKind(kind: UiNodeAuditKind): number {
  if (kind === 'card' || kind === 'list-item') return 4;
  if (kind === 'button' || kind === 'chip') return 4;
  if (kind === 'section') return 6;
  return 3;
}

function coverageReasonForNode(node: PageSnapshotNode): string {
  const kind = auditKindForNode(node);
  if (kind === 'card' || kind === 'list-item') return 'representative repeated item';
  if (kind === 'button' || kind === 'chip') return 'standalone control evidence';
  if (kind === 'appbar-action') return 'page app bar action evidence';
  if (kind === 'bottom-action') return 'bottom action evidence';
  if (kind === 'tab') return 'tab/filter control evidence';
  return `representative ${kind} evidence`;
}

function priorityForAuditRole(role: SnapshotNodeRole): number {
  const priority: Partial<Record<SnapshotNodeRole, number>> = {
    card: 1,
    'list-item': 2,
    'tab-bar': 3,
    'bottom-bar': 4,
    'app-bar': 5,
    button: 6,
    modal: 7,
    section: 8,
  };
  return priority[role] ?? 99;
}

function buildNodeAudit(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  coverageReason: string,
  displayInReviewOverride?: boolean | undefined,
  actionTargetByNodeId: Map<string, UiInteractionTarget> = new Map(),
  profile: UiSemanticLexicon = genericUiLexicon,
): UiNodeAudit | undefined {
  const descendants = collectDescendants(node, byId).filter((item) => item.id !== node.id);
  const visibleChildren = descendants
    .filter((item) => isAuditVisibleChild(item))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x);
  const controls = descendants
    .filter((item) => isAuditControl(item))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x)
    .slice(0, 12)
    .map((item) => toAuditControl(item, actionTargetByNodeId));
  const kind = auditKindForNode(node);
  const directChildren = node.children
    .map((childId) => byId.get(childId))
    .filter((item): item is PageSnapshotNode => Boolean(item))
    .filter((item) => isAuditVisibleChild(item) || hasDescendantVisibleEvidence(item, byId))
    .map((item) => toAuditChild(item));
  const rows = groupAuditRows(visibleChildren.map((item) => toAuditChild(item))).slice(0, 12);
  const layoutConflicts = detectLayoutConflicts(node, directChildren, rows);
  const absenceHints = buildAbsenceHints(node, visibleChildren, profile);
  const implementationHints = buildNodeAuditImplementationHints(node, controls, layoutConflicts);
  const actionMappings = buildActionMappingsForAudit(node, kind, controls);
  const priority = priorityForAudit(node, kind, rows, controls, absenceHints);
  const noiseLevel = noiseLevelForAudit(node, kind);
  return {
    id: `audit-${kind}-${node.id}`,
    kind,
    priority,
    noiseLevel,
    displayInReview: displayInReviewOverride ?? shouldDisplayAuditInReview(priority, noiseLevel),
    coverageReason,
    sourceNodeId: node.id,
    role: node.role,
    ...(node.text ? { title: node.text.slice(0, 80) } : {}),
    implementationSummary: buildAuditImplementationSummary({
      node,
      kind,
      rows,
      controls,
      absenceHints,
      implementationHints,
      layoutConflicts,
    }),
    bbox: node.bbox,
    containerStyle: pickAuditStyle(node, { includeBox: true }),
    rows,
    directChildren,
    layoutConflicts,
    controls,
    actionMappings,
    assetRefs: dedupe([
      ...(node.assetRefs ?? []),
      ...descendants.flatMap((item) => item.assetRefs ?? []),
    ]).slice(0, 24),
    absenceHints,
    implementationHints,
  };
}

function enrichNodeAuditWithTargetComponents(
  audit: UiNodeAudit,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  targetContext: {
    components: FlutterComponentRef[];
    componentMappings: ComponentMapping[];
  },
): UiNodeAudit {
  const semanticRole = semanticRoleForAudit(audit, byId, evidence, targetContext.componentMappings);
  if (!semanticRole) return audit;

  const candidates = targetComponentCandidatesForAudit(audit, semanticRole, targetContext);
  if (candidates.length === 0) return audit;

  const preferred = candidates.some((candidate) => candidate.recommendation === 'prefer-target-component');
  const nextKind = semanticRole === 'app-bar' && (audit.kind === 'section' || audit.kind === 'appbar-action')
    ? 'app-bar'
    : audit.kind;
  const targetWidgetHint = preferred
    ? `${candidates[0]?.symbol ?? semanticRole} 候选组件`
    : audit.implementationSummary.targetWidgetHint;
  const layoutSummary = preferred
    ? targetComponentLayoutSummary(audit, semanticRole, candidates[0])
    : audit.implementationSummary.layoutSummary;
  const componentHints = candidates
    .slice(0, 2)
    .map((candidate) => targetComponentMustPreserve(candidate));

  return {
    ...audit,
    kind: nextKind,
    priority: preferred ? promoteAuditPriority(audit.priority, nextKind) : audit.priority,
    coverageReason: preferred
      ? `${audit.coverageReason}; target ${semanticRole} component candidate detected.`
      : audit.coverageReason,
    implementationSummary: {
      ...audit.implementationSummary,
      targetWidgetHint,
      layoutSummary,
      mustPreserve: dedupe([
        ...componentHints,
        ...audit.implementationSummary.mustPreserve,
      ]).slice(0, 10),
      riskLevel: preferred ? 'high' : audit.implementationSummary.riskLevel,
    },
    implementationHints: dedupe([
      ...candidates.flatMap((candidate) => [
        candidate.recommendation === 'prefer-target-component'
          ? `优先尝试目标 ${candidate.role} 组件 ${candidate.symbol}；回退本地 Widget 前，先用行结构和样式证据做适配检查。`
          : '',
        ...candidate.fitChecks.map((check) => `${candidate.symbol} 适配检查：${check}`),
        ...candidate.risks,
      ]),
      ...audit.implementationHints,
    ].filter(Boolean)).slice(0, 16),
    actionMappings: audit.actionMappings.map((mapping) => ({
      ...mapping,
      role: actionRoleForAudit(nextKind, audit.controls.find((control) => control.nodeId === mapping.nodeId) ?? {
        ...mapping,
        kind: 'unknown',
        role: audit.role,
        bbox: audit.bbox,
        style: audit.containerStyle,
      } as UiNodeAuditControl),
    })),
    targetComponentCandidates: candidates,
  };
}

function semanticRoleForAudit(
  audit: UiNodeAudit,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  componentMappings: ComponentMapping[],
): FlutterComponentRole | undefined {
  if (isLikelyAppBarAudit(audit, byId, evidence, componentMappings)) return 'app-bar';
  const mappedRole = componentMappedRoleForAudit(audit, componentMappings);
  if (mappedRole) return mappedRole;
  if (audit.kind === 'app-bar' || audit.kind === 'appbar-action' || audit.role === 'app-bar') return 'app-bar';
  if (audit.kind === 'button') return 'button';
  if (audit.kind === 'bottom-action') return 'button';
  if (audit.role === 'image' || audit.role === 'icon') return 'image';
  if (audit.role === 'modal') return 'sheet';
  if (audit.role === 'list') return 'refresh';
  return undefined;
}

function componentMappedRoleForAudit(
  audit: UiNodeAudit,
  componentMappings: ComponentMapping[],
): FlutterComponentRole | undefined {
  const runtimeMapping = componentMappings.find((mapping) =>
    mapping.targetSymbol
    && mapping.nodeIds.includes(audit.sourceNodeId)
    && componentRoleForSnapshotRole(mapping.sourceRole),
  );
  if (runtimeMapping) return componentRoleForSnapshotRole(runtimeMapping.sourceRole);

  const sourceMappings = componentMappings.filter((mapping) =>
    mapping.targetSymbol
    && mapping.nodeIds.some((nodeId) => nodeId.startsWith('source:'))
    && componentRoleForSnapshotRole(mapping.sourceRole)
  );
  if (
    isHeaderSizedAudit(audit)
    && sourceMappings.some((mapping) => componentRoleForSnapshotRole(mapping.sourceRole) === 'app-bar')
  ) {
    return 'app-bar';
  }
  return undefined;
}

function componentRoleForSnapshotRole(role: SnapshotNodeRole): FlutterComponentRole | undefined {
  if (role === 'app-bar') return 'app-bar';
  if (role === 'button' || role === 'bottom-bar') return 'button';
  if (role === 'image' || role === 'icon') return 'image';
  if (role === 'modal') return 'sheet';
  if (role === 'list') return 'refresh';
  return undefined;
}

function isLikelyAppBarAudit(
  audit: UiNodeAudit,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  componentMappings: ComponentMapping[],
): boolean {
  if (!isHeaderSizedAudit(audit)) return false;
  const viewportWidth = evidence.viewport?.width ?? audit.bbox.width;
  const fullWidth = viewportWidth <= 0 || audit.bbox.width >= viewportWidth * 0.88;
  const style = audit.containerStyle;
  const flexHeader = style.display === 'flex' && style.alignItems === 'center';
  const hasTitle = audit.rows.some((row) => row.children.some((child) => Boolean(child.text?.trim())));
  const hasIcon = audit.rows.some((row) => row.children.some((child) => child.role === 'icon' || Boolean(child.assetRefs?.length)));
  const sourceHeaderMapped = componentMappings.some((mapping) =>
    mapping.targetSymbol
    && mapping.sourceRole === 'app-bar'
    && mapping.nodeIds.some((nodeId) => nodeId.startsWith('source:')),
  );
  const node = byId.get(audit.sourceNodeId);
  const nearTopSection = node?.role === 'section' && audit.bbox.y <= 8;
  return fullWidth && flexHeader && hasTitle && (hasIcon || sourceHeaderMapped) && (nearTopSection || sourceHeaderMapped);
}

function isHeaderSizedAudit(audit: UiNodeAudit): boolean {
  return audit.bbox.y <= 8 && audit.bbox.height >= 40 && audit.bbox.height <= 88;
}

function targetComponentCandidatesForAudit(
  audit: UiNodeAudit,
  role: FlutterComponentRole,
  targetContext: {
    components: FlutterComponentRef[];
    componentMappings: ComponentMapping[];
  },
): UiTargetComponentCandidate[] {
  const components = targetContext.components.filter((component) => component.role === role);
  if (components.length === 0) return [];
  const mapped = targetContext.componentMappings.filter((mapping) =>
    mapping.targetSymbol
    && componentRoleForSnapshotRole(mapping.sourceRole) === role,
  );
  return components
    .map((component) => {
      const sourceMappingNodeIds = mapped
        .filter((mapping) => mapping.targetSymbol === component.symbol)
        .flatMap((mapping) => mapping.nodeIds);
      const recommendation = sourceMappingNodeIds.length > 0 || audit.role === snapshotRoleForComponentRole(role)
        ? 'prefer-target-component'
        : 'manual-check';
      return {
        symbol: component.symbol,
        role: component.role,
        confidence: component.confidence,
        recommendation,
        evidence: dedupe([
          component.reason,
          ...component.usageSnippets.slice(0, 3),
          ...sourceMappingNodeIds.map((nodeId) => `component mapping evidence: ${nodeId}`),
        ]),
        ...(component.importPath ? { importPath: component.importPath } : {}),
        ...(component.propsHints.length ? { propsHints: component.propsHints } : {}),
        ...(sourceMappingNodeIds.length ? { sourceMappingNodeIds: dedupe(sourceMappingNodeIds).slice(0, 8) } : {}),
        fitChecks: componentFitChecks(audit, role),
        risks: componentFitRisks(audit, role, component),
      } satisfies UiTargetComponentCandidate;
    })
    .sort((left, right) => recommendationRank(left.recommendation) - recommendationRank(right.recommendation)
      || confidenceRank(right.confidence) - confidenceRank(left.confidence)
      || left.symbol.localeCompare(right.symbol))
    .slice(0, 4);
}

function snapshotRoleForComponentRole(role: FlutterComponentRole): SnapshotNodeRole | undefined {
  if (role === 'app-bar') return 'app-bar';
  if (role === 'button') return 'button';
  if (role === 'image') return 'image';
  if (role === 'sheet') return 'modal';
  if (role === 'refresh') return 'list';
  return undefined;
}

function recommendationRank(value: UiTargetComponentCandidate['recommendation']): number {
  if (value === 'prefer-target-component') return 0;
  if (value === 'manual-check') return 1;
  return 2;
}

function confidenceRank(value: MappingConfidence): number {
  if (value === 'high') return 3;
  if (value === 'medium') return 2;
  return 1;
}

function componentFitChecks(audit: UiNodeAudit, role: FlutterComponentRole): string[] {
  const checks: string[] = [];
  if (role === 'app-bar') {
    checks.push(`height/preferredSize 需要匹配 ${roundCssNumber(audit.bbox.height)}px。`);
    const leading = firstRowChildren(audit).find((child) => child.role === 'icon' || Boolean(child.assetRefs?.length));
    const title = firstRowChildren(audit).find((child) => child.text?.trim());
    const actions = firstRowChildren(audit).filter((child) =>
      (child.role === 'icon' || Boolean(child.assetRefs?.length)) && child.nodeId !== leading?.nodeId,
    );
    if (leading) checks.push(`leading 槽位需要保留 ${auditChildLabel(leading)}，bbox=${bboxText(leading.bbox)}。`);
    if (title) checks.push(`title 槽位需要保留 ${auditChildLabel(title)}，bbox=${bboxText(title.bbox)}。`);
    if (actions.length) checks.push(`actions 需要保留 ${actions.map(auditChildLabel).join(' -> ')} 及其视觉顺序。`);
    checks.push('titleSpacing、centerTitle、backgroundColor 需要对照 source bbox 和样式证据确认。');
  } else if (role === 'button') {
    checks.push(`当该审计是独立控件时，button 高度需要匹配 ${roundCssNumber(audit.bbox.height)}px。`);
    if (audit.controls.length) checks.push(`控件 padding/radius 需要保留 ${audit.controls.map((control) => control.padding || control.borderRadius).filter(Boolean).join(', ')}。`);
  } else if (role === 'image') {
    if (audit.assetRefs.length) checks.push(`asset 来源和顺序需要保留 ${audit.assetRefs.join(' -> ')}。`);
  } else if (role === 'sheet') {
    checks.push(`sheet 容器需要匹配 bbox=${bboxText(audit.bbox)} 和可见控件。`);
  } else if (role === 'refresh') {
    checks.push('refresh/list 组件应包住重复列表，不要臆造 nodeAudits 中不存在的字段。');
  }
  return dedupe(checks).slice(0, 8);
}

function componentFitRisks(
  audit: UiNodeAudit,
  role: FlutterComponentRole,
  component: FlutterComponentRef,
): string[] {
  const risks: string[] = [];
  if (role === 'app-bar') {
    risks.push(`仅当 ${component.symbol} 无法暴露本审计需要的 height/preferredSize、leading、title、actions 或标题间距时，才使用本地 header。`);
  }
  if (component.propsHints.length === 0) {
    risks.push(`尚未从目标示例推断 ${component.symbol} 的 props；自定义实现前先检查相似目标用法。`);
  }
  if (audit.kind === 'section' && role !== 'app-bar') {
    risks.push('runtime role 是泛化 section；目标组件推荐依赖 source/target 语义映射，需要人工确认适配性。');
  }
  return dedupe(risks).slice(0, 6);
}

function targetComponentLayoutSummary(
  audit: UiNodeAudit,
  role: FlutterComponentRole,
  candidate: UiTargetComponentCandidate | undefined,
): string {
  if (!candidate) return audit.implementationSummary.layoutSummary;
  const fitChecks = candidate.fitChecks.length ? ` 适配检查：${candidate.fitChecks.join(' ')}` : '';
  return `优先尝试目标 ${role} 组件 ${candidate.symbol}；保留节点视觉证据作为适配检查。${fitChecks}`;
}

function targetComponentMustPreserve(candidate: UiTargetComponentCandidate): string {
  return candidate.recommendation === 'prefer-target-component'
    ? `优先复用目标 ${candidate.role} 组件 ${candidate.symbol}；若关键槽位或尺寸无法匹配，再回退本地 Widget。`
    : `检查目标 ${candidate.role} 组件 ${candidate.symbol} 是否适配本节点，再决定是否复用。`;
}

function promoteAuditPriority(priority: UiNodeAuditPriority, kind: UiNodeAuditKind): UiNodeAuditPriority {
  if (kind === 'app-bar') return 'p0';
  return priority === 'p2' ? 'p1' : priority;
}

function firstRowChildren(audit: UiNodeAudit): UiNodeAuditChild[] {
  return audit.rows[0]?.children ?? [];
}

function auditChildLabel(child: UiNodeAuditChild): string {
  return child.text?.trim() || child.assetRefs?.join(',') || child.nodeId;
}

function bboxText(bbox: { x: number; y: number; width: number; height: number }): string {
  return `${roundCssNumber(bbox.x)},${roundCssNumber(bbox.y)},${roundCssNumber(bbox.width)},${roundCssNumber(bbox.height)}`;
}

function isAuditVisibleChild(node: PageSnapshotNode): boolean {
  const hasText = Boolean(node.text?.trim());
  const hasAsset = Boolean(node.assetRefs?.length);
  const semanticRole = ['button', 'icon', 'image', 'input'].includes(node.role);
  if (!hasText && !hasAsset && !semanticRole) return false;
  if (node.bbox.width <= 0 || node.bbox.height <= 0) return false;
  return true;
}

function isAuditControl(node: PageSnapshotNode): boolean {
  if (node.role === 'button' || node.role === 'input' || node.role === 'icon' || node.role === 'image') return true;
  return isLikelyChip(node);
}

function hasDescendantVisibleEvidence(node: PageSnapshotNode, byId: Map<string, PageSnapshotNode>): boolean {
  return collectDescendants(node, byId).some((child) => child.id !== node.id && isAuditVisibleChild(child));
}

function isLikelyChip(node: PageSnapshotNode): boolean {
  const style = node.computedStyle;
  const text = node.text?.trim();
  if (!text || text.length > 24) return false;
  const radius = parseCssNumber(style?.borderRadius);
  const height = node.bbox.height;
  const hasPillRadius = radius >= 8 || radius >= height / 2 - 2;
  const hasBackground = Boolean(style?.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent');
  return hasPillRadius && hasBackground && height <= 36;
}

function buildActionTargetBindings(
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): Map<string, UiInteractionTarget> {
  const result = new Map<string, UiInteractionTarget>();
  const sourceClicks = extractSourceClickTargets(evidence);
  const runtimeClickNodes = canonicalRuntimeClickNodes(evidence, byId);
  const pairCount = Math.min(sourceClicks.length, runtimeClickNodes.length);
  for (let index = 0; index < pairCount; index += 1) {
    const runtime = runtimeClickNodes[index];
    const source = sourceClicks[index];
    if (!runtime || !source) continue;
    result.set(runtime.id, {
      kind: 'click',
      target: source.target,
      evidence: source.evidence,
      confidence: source.confidence,
    });
  }

  for (const interaction of evidence.interactions) {
    if (result.has(interaction.nodeId)) continue;
    const node = byId.get(interaction.nodeId);
    if (!node || isNestedClickableDuplicate(node, evidence, byId)) continue;
    result.set(interaction.nodeId, {
      kind: interaction.kind,
      ...(interaction.label ? { target: interaction.label } : {}),
      evidence: interaction.evidence.join(' | '),
      confidence: interaction.label ? 'medium' : 'low',
    });
  }

  return result;
}

function extractSourceClickTargets(evidence: PageCanonical): Array<{
  target: string;
  evidence: string;
  confidence: MappingConfidence;
}> {
  const template = evidence.sourceFacts?.analysis.sfc?.template ?? '';
  const matches = [...template.matchAll(/@click(?:\.[\w-]+)*\s*=\s*"([^"]+)"/g)]
    .map((match) => match[1]?.trim())
    .filter((target): target is string => Boolean(target));
  const fromTemplate = matches.map((target) => ({
    target,
    evidence: `@click="${target}"`,
    confidence: 'high' as const,
  }));
  if (fromTemplate.length) return fromTemplate;
  return (evidence.sourceFacts?.analysis.sfc?.interactions ?? [])
    .filter((interaction) => interaction.kind === 'click' && interaction.target)
    .map((interaction) => ({
      target: interaction.target as string,
      evidence: interaction.evidence,
      confidence: 'medium' as const,
    }));
}

function canonicalRuntimeClickNodes(
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): PageSnapshotNode[] {
  return evidence.interactions
    .filter((interaction) => interaction.kind === 'tap')
    .map((interaction) => byId.get(interaction.nodeId))
    .filter((node): node is PageSnapshotNode => Boolean(node))
    .filter((node) => !isNestedClickableDuplicate(node, evidence, byId))
    .sort((left, right) => left.bbox.y - right.bbox.y || left.bbox.x - right.bbox.x);
}

function isNestedClickableDuplicate(
  node: PageSnapshotNode,
  evidence: PageCanonical,
  byId: Map<string, PageSnapshotNode>,
): boolean {
  if (!node.parentId) return false;
  const interactionNodeIds = new Set(evidence.interactions.map((interaction) => interaction.nodeId));
  let parentId: string | undefined = node.parentId;
  while (parentId) {
    if (interactionNodeIds.has(parentId)) return true;
    const parent = byId.get(parentId);
    parentId = parent?.parentId;
  }
  return false;
}

function semanticNameForInteraction(target: string): string | undefined {
  const normalized = target.toLowerCase();
  const routeMatch = target.match(/['"]([^'"]+)['"]/);
  const route = routeMatch?.[1]?.toLowerCase() ?? '';
  if (/\bhistory\b|历史|record/.test(normalized) || /history|record/.test(route)) return 'history';
  if (/rules?|showrules|提示|规则|help/.test(normalized) || /rules?|help/.test(route)) return 'rules';
  if (/all-features|feature|back|返回/.test(normalized) || /all-features|feature/.test(route)) return 'back';
  if (/dnesheet|dne|do\s*not\s*exercise/.test(normalized)) return 'dne';
  if (/exercisesheet|exercise/.test(normalized)) return 'exercise';
  if (/pricesort|value|sortprice/.test(normalized)) return 'sortValue';
  if (/expsort|expiration|sortexp/.test(normalized)) return 'sortExpiration';
  if (/adjustqty|qty|quantity/.test(normalized)) return 'adjustQuantity';
  if (/setmax|max/.test(normalized)) return 'max';
  const functionName = target.match(/^([A-Za-z_$][\w$]*)/)?.[1];
  return functionName;
}

function suggestedCallbackForSemanticName(semanticName: string): string {
  return `on${toPascalCase(semanticName)}`;
}

function toAuditChild(node: PageSnapshotNode): UiNodeAuditChild {
  return {
    nodeId: node.id,
    role: node.role,
    ...(node.text?.trim() ? { text: node.text.trim() } : {}),
    ...(node.assetRefs?.length ? { assetRefs: node.assetRefs } : {}),
    bbox: node.bbox,
    style: pickAuditStyle(node, { includeText: true }),
  };
}

function toAuditControl(node: PageSnapshotNode, actionTargetByNodeId: Map<string, UiInteractionTarget> = new Map()): UiNodeAuditControl {
  const style = node.computedStyle;
  const interactionTarget = actionTargetByNodeId.get(node.id);
  const semanticName = interactionTarget?.target ? semanticNameForInteraction(interactionTarget.target) : undefined;
  const suggestedCallback = semanticName ? suggestedCallbackForSemanticName(semanticName) : undefined;
  return {
    ...toAuditChild(node),
    kind: node.role === 'button'
      ? 'button'
      : isLikelyChip(node)
        ? 'chip'
        : node.role === 'icon'
          ? 'icon'
          : node.role === 'image'
            ? 'image'
            : 'unknown',
    ...(style?.padding ? { padding: style.padding } : {}),
    height: `${roundCssNumber(node.bbox.height)}px`,
    ...(style?.borderRadius ? { borderRadius: style.borderRadius } : {}),
    ...(interactionTarget ? { interactionTarget } : {}),
    ...(semanticName ? { semanticName } : {}),
    ...(suggestedCallback ? { suggestedCallback } : {}),
  };
}

function buildActionMappingsForAudit(
  node: PageSnapshotNode,
  kind: UiNodeAuditKind,
  controls: UiNodeAuditControl[],
): UiActionMapping[] {
  return controls
    .filter((control) => control.interactionTarget)
    .map((control) => ({
      nodeId: control.nodeId,
      ...(control.assetRefs?.[0] ? { assetRef: control.assetRefs[0] } : {}),
      role: actionRoleForAudit(kind, control),
      ...(control.semanticName ? { semanticName: control.semanticName } : {}),
      ...(control.interactionTarget?.target ? { sourceInteraction: control.interactionTarget.target } : {}),
      ...(control.interactionTarget?.evidence ? { interactionEvidence: control.interactionTarget.evidence } : {}),
      ...(control.suggestedCallback ? { suggestedCallback: control.suggestedCallback } : {}),
      confidence: control.interactionTarget?.confidence ?? 'low',
      reason: control.interactionTarget?.target
        ? `Visible control ${control.nodeId} is bound to source interaction ${control.interactionTarget.target}.`
        : `Visible control ${control.nodeId} has runtime interaction evidence but no resolved source target.`,
    }));
}

function actionRoleForAudit(kind: UiNodeAuditKind, control: UiNodeAuditControl): UiNodeAuditKind {
  if (kind === 'app-bar' || kind === 'appbar-action') return 'appbar-action';
  if (kind === 'bottom-action') return 'bottom-action';
  if (kind === 'filter' || kind === 'sort-control') return 'sort-control';
  if (control.kind === 'chip') return 'chip';
  if (control.kind === 'button') return 'button';
  return kind;
}

function groupAuditRows(children: UiNodeAuditChild[]): UiNodeAudit['rows'] {
  const rows: UiNodeAudit['rows'] = [];
  for (const child of children) {
    const centerY = child.bbox.y + child.bbox.height / 2;
    const existing = rows.find((row) => centerY >= row.yRange.min - 4 && centerY <= row.yRange.max + 4);
    if (existing) {
      existing.children.push(child);
      existing.yRange.min = Math.min(existing.yRange.min, child.bbox.y);
      existing.yRange.max = Math.max(existing.yRange.max, child.bbox.y + child.bbox.height);
      continue;
    }
    rows.push({
      index: rows.length + 1,
      yRange: { min: child.bbox.y, max: child.bbox.y + child.bbox.height },
      children: [child],
    });
  }
  return rows
    .map((row, index) => ({
      ...row,
      index: index + 1,
      yRange: {
        min: roundCssNumber(row.yRange.min),
        max: roundCssNumber(row.yRange.max),
      },
      children: row.children.sort((left, right) => left.bbox.x - right.bbox.x),
    }))
    .sort((left, right) => left.yRange.min - right.yRange.min);
}

function detectLayoutConflicts(
  node: PageSnapshotNode,
  directChildren: UiNodeAuditChild[],
  rows: UiNodeAudit['rows'],
): UiNodeAuditLayoutConflict[] {
  const style = node.computedStyle;
  if (style?.display !== 'flex' || style.flexDirection !== 'row') return [];
  if (directChildren.length < 2 || rows.length < 2) return [];
  const directRows = groupAuditRows(directChildren);
  if (directRows.length < 2) return [];
  return [{
    kind: 'row-flex-multiple-y-bands',
    severity: 'warning',
    message: `Parent is row flex (${style.alignItems ? `alignItems=${style.alignItems}` : 'alignItems unknown'}) but direct children occupy ${directRows.length} visual bands.`,
    parentStyle: pickAuditStyle(node, { includeBox: true }),
    directChildren: directChildren.slice(0, 12),
    observedBands: directRows.slice(0, 6),
    manualConfirmation: 'Confirm whether this source section is intentionally wrapped into multiple visual bands or should be implemented as one row with overflow/width/text constraints fixed.',
  }];
}

function auditKindForNode(node: PageSnapshotNode): UiNodeAuditKind {
  if (node.role === 'card') return 'card';
  if (node.role === 'list-item') return 'list-item';
  if (node.role === 'button') return 'button';
  if (node.role === 'tab-bar') return 'tab';
  if (node.role === 'bottom-bar') return 'bottom-action';
  if (node.role === 'app-bar') return 'appbar-action';
  if (node.role === 'section') return inferSectionAuditKind(node);
  if (isLikelyChip(node)) return 'chip';
  return 'unknown';
}

function priorityForAudit(
  node: PageSnapshotNode,
  kind: UiNodeAuditKind,
  rows: UiNodeAudit['rows'],
  controls: UiNodeAuditControl[],
  absenceHints: string[],
): UiNodeAuditPriority {
  if (kind === 'card' || kind === 'list-item') return 'p0';
  if (kind === 'sort-control' || kind === 'filter' || kind === 'app-bar' || kind === 'appbar-action' || kind === 'bottom-action' || kind === 'tab') return 'p0';
  if (controls.length > 0 && (controls.some((control) => control.padding || control.borderRadius) || kind === 'button')) return 'p1';
  if (absenceHints.length > 1) return 'p1';
  if (rows.length >= 2 || node.assetRefs?.length) return 'p1';
  return 'p2';
}

function noiseLevelForAudit(node: PageSnapshotNode, kind: UiNodeAuditKind): UiNodeAuditNoiseLevel {
  if (kind === 'unknown') return 'high';
  if ((kind === 'section' || kind === 'bottom-action') && node.bbox.height >= 300) return 'medium';
  if (kind === 'button' || kind === 'chip') return 'medium';
  return 'low';
}

function shouldDisplayAuditInReview(priority: UiNodeAuditPriority, noiseLevel: UiNodeAuditNoiseLevel): boolean {
  if (noiseLevel === 'high') return false;
  if (priority === 'p0') return true;
  return priority === 'p1' && noiseLevel === 'low';
}

function buildAuditImplementationSummary(input: {
  node: PageSnapshotNode;
  kind: UiNodeAuditKind;
  rows: UiNodeAudit['rows'];
  controls: UiNodeAuditControl[];
  absenceHints: string[];
  implementationHints: string[];
  layoutConflicts: UiNodeAuditLayoutConflict[];
}): UiNodeAudit['implementationSummary'] {
  const rowSummaries = input.rows.map((row) => row.children.map((child) => child.text ?? child.assetRefs?.join(',') ?? child.role).join(' -> '));
  const mustPreserve = [
    ...rowSummaries.map((summary, index) => `第 ${index + 1} 行：${summary}`),
    ...input.implementationHints,
  ].filter(Boolean).slice(0, 10);
  const doNotInvent = input.absenceHints
    .filter((hint) => /do not|No available|不存在|不要|absent/i.test(hint))
    .slice(0, 6);
  const controlSummary = input.controls
    .map((control) => [
      control.text ?? control.assetRefs?.join(',') ?? control.nodeId,
      control.padding ? `padding ${control.padding}` : '',
      control.height ? `height ${control.height}` : '',
      control.borderRadius ? `radius ${control.borderRadius}` : '',
    ].filter(Boolean).join(', '))
    .slice(0, 8);
  const layoutSummary = input.layoutConflicts.length
    ? layoutSummaryWithConflicts(input.kind, input.rows, input.layoutConflicts)
    : layoutSummaryForAudit(input.kind, input.rows);
  return {
    targetWidgetHint: targetWidgetHintForAudit(input.kind),
    layoutSummary,
    mustPreserve,
    doNotInvent,
    controlSummary,
    riskLevel: input.layoutConflicts.some((conflict) => conflict.severity === 'warning' || conflict.severity === 'error')
      ? 'high'
      : input.kind === 'card' || input.kind === 'list-item' || input.kind === 'sort-control' || input.kind === 'filter'
      ? 'high'
      : input.controls.length > 0
        ? 'medium'
        : 'low',
  };
}

function targetWidgetHintForAudit(kind: UiNodeAuditKind): string | undefined {
  const hints: Partial<Record<UiNodeAuditKind, string>> = {
    card: '重复项卡片 Widget',
    'app-bar': 'AppBar / 目标导航栏组件',
    list: '列表 / 刷新列表组件',
    'list-item': '重复列表项 Widget',
    button: '独立操作按钮',
    chip: '状态标签 / pill',
    'sort-control': '排序/筛选头部控件',
    filter: '筛选控件组',
    'appbar-action': 'AppBar 操作按钮',
    'bottom-action': '底部操作区',
    tab: 'Tab/筛选选择器',
    section: '语义区块 Widget',
  };
  return hints[kind];
}

function layoutSummaryForAudit(kind: UiNodeAuditKind, rows: UiNodeAudit['rows']): string {
  if (rows.length === 0) return `${kind} 视觉证据，无直接文本行。`;
  if ((kind === 'card' || kind === 'list-item') && rows.length === 3) {
    return '3 行卡片：主信息行 / 价格或主值行 / 数量与操作行。';
  }
  if (kind === 'app-bar') return `${rows.length} 行 AppBar/header 结构。`;
  if (kind === 'appbar-action') return `${rows.length} 行 AppBar 结构。`;
  if (kind === 'sort-control' || kind === 'filter') return `${rows.length} 行排序/筛选控件结构。`;
  return `${rows.length} 行 ${kind} 结构。`;
}

function layoutSummaryWithConflicts(
  kind: UiNodeAuditKind,
  rows: UiNodeAudit['rows'],
  conflicts: UiNodeAuditLayoutConflict[],
): string {
  const flexBandConflict = conflicts.find((conflict) => conflict.kind === 'row-flex-multiple-y-bands');
  if (flexBandConflict) {
    return `parent row flex; observed children occupy ${flexBandConflict.observedBands.length} visual bands. Do not treat this as a confirmed ${rows.length}-row ${kind} layout until flex-wrap/overflow/width/text constraints are confirmed.`;
  }
  return layoutSummaryForAudit(kind, rows);
}

function inferSectionAuditKind(node: PageSnapshotNode): UiNodeAuditKind {
  const text = node.text?.toLowerCase() ?? '';
  if (text.includes('sort')) return 'sort-control';
  if (text.includes('filter')) return 'filter';
  return 'section';
}

function pickAuditStyle(node: PageSnapshotNode, options: { includeBox?: boolean; includeText?: boolean }): UiNodeAuditStyle {
  const style = node.computedStyle ?? {};
  return {
    ...(style.display ? { display: style.display } : {}),
    ...(style.flexDirection ? { flexDirection: style.flexDirection } : {}),
    ...(style.flexWrap ? { flexWrap: style.flexWrap } : {}),
    ...(style.alignItems ? { alignItems: style.alignItems } : {}),
    ...(style.justifyContent ? { justifyContent: style.justifyContent } : {}),
    ...(style.gap ? { gap: style.gap } : {}),
    ...(style.padding ? { padding: style.padding } : {}),
    ...(style.margin ? { margin: style.margin } : {}),
    ...(options.includeBox ? { width: `${roundCssNumber(node.bbox.width)}px`, height: `${roundCssNumber(node.bbox.height)}px` } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
    ...(options.includeText && style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(options.includeText && style.fontWeight ? { fontWeight: style.fontWeight } : {}),
    ...(options.includeText && style.lineHeight ? { lineHeight: style.lineHeight } : {}),
    ...(style.borderRadius ? { borderRadius: style.borderRadius } : {}),
    ...(style.border ? { border: style.border } : {}),
    ...(style.boxShadow ? { boxShadow: style.boxShadow } : {}),
    ...(style.overflow ? { overflow: style.overflow } : {}),
    ...(style.whiteSpace ? { whiteSpace: style.whiteSpace } : {}),
    ...(style.minWidth ? { minWidth: style.minWidth } : {}),
    ...(style.maxWidth ? { maxWidth: style.maxWidth } : {}),
  };
}

function buildAbsenceHints(
  node: PageSnapshotNode,
  visibleChildren: PageSnapshotNode[],
  profile: UiSemanticLexicon,
): string[] {
  const hints = [
    'Representative node rows list the visible display fields; do not add extra sibling fields unless sourceSemantics or user confirmation requires them.',
  ];
  const text = visibleChildren.map((child) => child.text ?? '').join(' ').toLowerCase();
  const quantityLike = profileQuantityTermPattern(profile).test(text);
  if ((node.role === 'card' || node.role === 'list-item') && quantityLike && !/\bavail(?:able)?\b|可用/.test(text)) {
    hints.push('No available quantity field is visible in this representative card/list item.');
  }
  return hints;
}

function focusedSectionPattern(profile: UiSemanticLexicon): RegExp {
  const terms = [
    'sort',
    'filter',
    '排序',
    '筛选',
    'history',
    'record',
    'help',
    'value',
    ...profile.listHeadingTerms,
  ];
  return termsPattern(terms);
}

function profileQuantityPattern(profile: UiSemanticLexicon): RegExp {
  const terms = profile.dynamicQuantityTerms;
  const pattern = terms.map(escapeRegExp).join('|');
  return pattern ? new RegExp(`(?:${pattern})\\s*\\d+`, 'i') : /$a/;
}

function profileQuantityTermPattern(profile: UiSemanticLexicon): RegExp {
  return termsPattern(profile.dynamicQuantityTerms);
}

function profileStatusPattern(profile: UiSemanticLexicon): RegExp {
  return termsPattern(profile.statusTerms);
}

function profileTimeBadgePattern(profile: UiSemanticLexicon): RegExp {
  const pattern = profile.timeBadgePattern;
  return pattern ? new RegExp(pattern, 'i') : /$a/;
}

function termsPattern(terms: string[]): RegExp {
  const pattern = terms.filter(Boolean).map(escapeRegExp).join('|');
  return pattern ? new RegExp(pattern, 'i') : /$a/;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNodeAuditImplementationHints(
  node: PageSnapshotNode,
  controls: UiNodeAuditControl[],
  layoutConflicts: UiNodeAuditLayoutConflict[],
): string[] {
  const hints = [
    'Restore row order and visible text/icon order from rows before applying target component abstractions.',
  ];
  for (const conflict of layoutConflicts) {
    hints.push(`${conflict.message} ${conflict.manualConfirmation}`);
  }
  if (controls.some((control) => control.padding || control.borderRadius)) {
    hints.push('Controls include padding/radius evidence; prefer padding-driven layout over fixed height when target APIs allow it.');
  }
  if (node.role === 'card' || node.role === 'list-item') {
    hints.push('Use this representative item as the contract for repeated item widgets.');
  }
  return hints;
}

export function buildNodeAuditValidationHints(audits: UiNodeAudit[]): string[] {
  if (audits.length === 0) return [];
  const hints = [`visualPlan.nodeAudits 中有 ${audits.length} 个代表性节点审计，覆盖重复列表或高风险 UI 单元。`];
  if (audits.some((audit) => audit.controls.some((control) => control.kind === 'button' || control.kind === 'chip'))) {
    hints.push('实现按钮或标签前，先查看 visualPlan.nodeAudits[*].controls；如果存在 padding、radius 和文字顺序证据，需要保持一致。');
  }
  if (audits.some((audit) => audit.kind === 'card' || audit.kind === 'list-item')) {
    hints.push('编写重复卡片或列表项 Widget 前，先查看 visualPlan.nodeAudits 中的 card/list 行结构；absenceHints 表示不应臆造的字段。');
  }
  if (audits.some((audit) => audit.targetComponentCandidates?.some((candidate) => candidate.recommendation === 'prefer-target-component'))) {
    hints.push('当 visualPlan.nodeAudits 的 targetComponentCandidates 标记为 prefer-target-component 时，先尝试已检测到的目标组件，并用 rows、controls、bbox 作为适配检查；不匹配时再回退到本地 Widget。');
  }
  if (audits.some((audit) => audit.layoutConflicts.some((conflict) => conflict.kind === 'row-flex-multiple-y-bands'))) {
    hints.push('当 nodeAudit 报告 row-flex-multiple-y-bands 时，需要保留 directChildren 结构，并确认这些视觉分带是否为有意换行，再决定是否实现为多行 Flutter 布局。');
  }
  return hints;
}

export function buildComponentMappings(evidence: PageCanonical, components: FlutterComponentRef[]): ComponentMapping[] {
  const roles = new Map<SnapshotNodeRole, string[]>();
  const byId = new Map(evidence.nodes.map((node) => [node.id, node]));
  const hasSourceAppBar = sourceComponents(evidence).some((component) => sourceComponentRole(component) === 'app-bar');
  for (const node of evidence.nodes) {
    const role = componentMappingRoleForNode(node, byId, evidence, hasSourceAppBar);
    if (!roles.has(role)) roles.set(role, []);
    roles.get(role)?.push(node.id);
  }

  const runtimeMappings = [...roles.entries()]
    .filter(([role]) => role !== 'unknown' && role !== 'text')
    .map(([role, nodeIds]) => {
      const component = bestComponentForRole(role, components);
      return {
        sourceRole: role,
        nodeIds: nodeIds.slice(0, 20),
        ...(component ? { targetSymbol: component.symbol } : {}),
        confidence: component?.confidence ?? 'low',
        reason: component
          ? `Evidence role ${role} can likely use ${component.symbol}.`
          : `No clear target component was detected for evidence role ${role}; implement with local Widget and target theme.`,
      };
    });

  const sourceMappings = sourceComponents(evidence)
    .map((component) => {
      const role = sourceComponentRole(component);
      const targetComponent = bestComponentForRole(role, components);
      return {
        sourceRole: role,
        nodeIds: [`source:${component.name}`],
        ...(targetComponent ? { targetSymbol: targetComponent.symbol } : {}),
        confidence: targetComponent?.confidence ?? 'medium',
        reason: targetComponent
          ? `Source component ${component.name} (${component.role}) can likely use ${targetComponent.symbol}.`
          : `Source component ${component.name} (${component.role}) should become a local widget unless target examples show a reusable component.`,
      } satisfies ComponentMapping;
    });

  return dedupeBy([...runtimeMappings, ...sourceMappings], (mapping) => `${mapping.sourceRole}:${mapping.nodeIds.join(',')}`);
}

function componentMappingRoleForNode(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
  hasSourceAppBar: boolean,
): SnapshotNodeRole {
  if (node.role === 'section' && hasSourceAppBar && isLikelyTopAppBarNode(node, byId, evidence)) return 'app-bar';
  return node.role;
}

function isLikelyTopAppBarNode(
  node: PageSnapshotNode,
  byId: Map<string, PageSnapshotNode>,
  evidence: PageCanonical,
): boolean {
  const viewportWidth = evidence.viewport?.width ?? node.bbox.width;
  const fullWidth = viewportWidth <= 0 || node.bbox.width >= viewportWidth * 0.88;
  const style = node.computedStyle;
  if (!fullWidth || node.bbox.y > 8 || node.bbox.height < 40 || node.bbox.height > 88) return false;
  if (style?.display !== 'flex' || style.alignItems !== 'center') return false;
  const descendants = collectDescendants(node, byId).filter((item) => item.id !== node.id);
  const hasTitle = descendants.some((item) => item.text?.trim());
  const hasIcon = descendants.some((item) => item.role === 'icon' || Boolean(item.assetRefs?.length));
  return hasTitle && hasIcon;
}

export function bestComponentForRole(role: SnapshotNodeRole, components: FlutterComponentRef[]): FlutterComponentRef | undefined {
  const preferred: Partial<Record<SnapshotNodeRole, FlutterComponentRole[]>> = {
    'app-bar': ['app-bar'],
    button: ['button'],
    image: ['image'],
    icon: ['image'],
    modal: ['sheet'],
    list: ['refresh'],
    'bottom-bar': ['button'],
  };
  const targetRoles = preferred[role] ?? [];
  return components.find((component) => targetRoles.includes(component.role));
}
