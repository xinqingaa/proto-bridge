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
    ...(plan.routeMapping ? [`- 路由映射：${plan.routeMapping.sourceRoute ?? 'unknown'} → ${plan.routeMapping.targetRouteSymbol ?? plan.routeMapping.targetRoute ?? 'unresolved'} (${confidenceLabel(plan.routeMapping.confidence)})`] : []),
    ...(plan.routeIntentMappings?.length ? [`- 跳转映射：${plan.routeIntentMappings.length} 个 source 跳转目标已匹配 target 路由配置`] : []),
    `- 逻辑来源：${plan.implementationContract.logicalPlanSource}`,
    '- 机器契约只看 `ui-build-plan.json`；本文档只是该 JSON 的中文审查视图。',
    '- 权威边界：page / sourceSemantics / visualPlan / stylePlan.facts 描述必须还原的页面；integrationGuidance 仅是 B 接入建议。',
    '- 若目标约定未知，不得从名称相似度猜 route、module、component 或 theme token；实现 agent 应阅读 B 或询问用户。',
    '',
    '### B 接入建议（非页面事实）',
    '',
    '_JSON 来源：`ui-build-plan.json#/integrationGuidance`_',
    '',
    ...renderIntegrationGuidance(plan),
    '',
    '### 实现索引',
    '',
    '_JSON 来源：`ui-build-plan.json#/implementationContract/implementationIndex`_',
    '',
    ...renderImplementationIndex(plan),
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
    '### Widget 与契约',
    '',
    ...renderWidgetContractTable(plan),
    '',
    '### 状态与边界',
    '',
    ...markdownTable(
      ['关注点', 'Owner', '建议'],
      plan.implementationContract.stateStrategy.map((strategy) => [
        strategy.concern,
        ownerLabel(strategy.owner),
        strategy.recommendation,
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
    '### 契约规则',
    '',
    ...listOrFallback(plan.implementationContract.rules.map((rule) => `- ${translateRule(rule)}`)),
    '',
    '### P0 冲突与覆盖层契约',
    '',
    ...renderImplementationConflicts(plan),
    '',
    ...renderOverlayPlan(plan),
    '',
    '## 页面视觉与样式事实',
    '',
    '_JSON 来源：`ui-build-plan.json#/visualPlan`、`#/stylePlan/facts`、`#/componentMappings`_',
    '',
    `- 视口：${plan.visualPlan.viewport.width}x${plan.visualPlan.viewport.height}`,
    `- 截图：${plan.visualPlan.screenshotRefs.join('、') || '无'}`,
    '',
    '### 节点级还原证据',
    '',
    '_JSON 来源：`ui-build-plan.json#/visualPlan/nodeAudits`_',
    '',
    ...renderNodeAudits(plan),
    '',
    '### 动态文案提示',
    '',
    '_JSON 来源：`ui-build-plan.json#/visualPlan/dynamicTextHints`、`#/i18nPlan/texts[*].dynamic`_',
    '',
    ...renderDynamicTextHints(plan),
    '',
    '### 区块证据',
    '',
    ...markdownTable(
      ['角色', '标题/ID', 'bbox', '节点数', '提示'],
      reviewVisualSections(plan).map((section) => [
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
      ['来源角色', '状态', '目标/候选组件', '置信度', '节点/来源', '下一步'],
      plan.componentMappings.map((mapping) => [
        mapping.sourceRole,
        mapping.status,
        mapping.targetSymbol ?? mapping.candidateSymbols?.join('、') ?? '未确认',
        confidenceLabel(mapping.confidence),
        mapping.nodeIds.slice(0, 6).join('、'),
        mapping.nextAction,
      ]),
    ),
    '',
    '### 来源样式事实与目标主题提示',
    '',
    ...renderThemeMappingGroups(plan),
    '',
    ...markdownTable(
      ['类型', '来源', '值', '事实来源', 'B 主题状态', '目标提示', '下一步'],
      plan.stylePlan.facts.slice(0, 40).map((mapping) => [
        mapping.kind ?? 'style',
        mapping.source,
        codeCell(mapping.value),
        mapping.authority ?? 'source/runtime',
        mapping.targetStatus ?? 'unresolved',
        mapping.target ?? mapping.candidateTargets?.join('、') ?? '未确认',
        mapping.nextAction ?? '',
      ]),
    ),
    '',
    '## 文案与交互',
    '',
    '_JSON 来源：`ui-build-plan.json#/i18nPlan`、`#/interactionPlan`_',
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
    ...markdownTable(
      ['类别', '提示'],
      plan.validationHints.map((hint) => validationHintRow(hint)),
    ),
    '',
  ].join('\n');
}

function renderIntegrationGuidance(plan: UiBuildPlan): string[] {
  const guidance = plan.integrationGuidance;
  const rows = [
    ['模块', guidance.module],
    ['路由/页面入口', guidance.route],
    ['目标组件', guidance.components],
    ['目标主题', guidance.theme],
  ] as const;
  return [
    `- 总体状态：${guidance.status}`,
    `- 原则：${guidance.rule}`,
    '',
    ...markdownTable(
      ['维度', '状态', '置信度', '已选/候选', '下一步'],
      rows.map(([label, item]) => [
        label,
        item.status,
        confidenceLabel(item.confidence),
        item.selected ?? (item.candidates.join('、') || '无'),
        item.nextAction,
      ]),
    ),
  ];
}

function renderImplementationIndex(plan: UiBuildPlan): string[] {
  const index = plan.implementationContract.implementationIndex;
  return [
    ...markdownTable(
      ['类别', '引用'],
      [
        ['先决冲突', index.layoutConflictNodes.map(codeCell).join('、') || '无'],
        ['主屏节点', index.mainScreenNodes.slice(0, 20).map(codeCell).join('、') || '无'],
        ['重复项节点', index.repeatedItemNodes.slice(0, 20).map(codeCell).join('、') || '无'],
        ['重复项组', index.repeatedGroups.map((group) => `${group.groupId}: ${codeCell(group.representativeNodeId)} (${group.instanceNodeIds.length})`).join('；') || '无'],
        ['AppBar 节点', index.appBarNodes.map(codeCell).join('、') || '无'],
        ['Overlay', index.overlayRefs.map(codeCell).join('、') || '无'],
        ['Source-only deferred', index.sourceOnlyDeferred.map(codeCell).join('、') || '无'],
      ],
    ),
    '',
    'Phase 提示：',
    '',
    ...markdownTable(
      ['阶段', '引用', '说明'],
      index.phaseHints.map((hint) => [
        hint.phase,
        hint.refs.slice(0, 16).map(codeCell).join('、'),
        translateImplementationGuidance(hint.guidance),
      ]),
    ),
    '',
    '高风险优先项：',
    '',
    ...listOrFallback(index.highRiskFirst.slice(0, 12).map((item) => `- ${codeCell(item.ref)}：${translateImplementationGuidance(item.reason)}`)),
  ];
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
    ...markdownTable(
      ['区块', '父级', '角色', '职责', '输入', '回调'],
      semantics.businessSections.slice(0, 20).map((section) => [
        section.name,
        section.parent ?? '页面入口',
        section.role,
        section.responsibility,
        section.inputs.join('、') || '无',
        section.callbacks.join('、') || '无',
      ]),
    ),
    '',
    '### 状态意图',
    '',
    ...markdownTable(
      ['关注点', 'Owner', '建议'],
      semantics.stateIntent.slice(0, 16).map((item) => [
        item.concern,
        ownerLabel(item.owner),
        item.recommendation,
      ]),
    ),
    '',
    '### 路由意图',
    '',
    ...markdownTable(
      ['动作', '目标', '目标路由', '参数', '迁移意图'],
      semantics.routeIntent.slice(0, 12).map((item) => [
        item.action,
        item.target ?? '待确认',
        item.routeMapping
          ? `${item.routeMapping.targetRouteSymbol ?? item.routeMapping.targetRoute ?? 'unresolved'} (${confidenceLabel(item.routeMapping.confidence)})`
          : '',
        item.params ?? '',
        item.evidence ?? '',
      ]),
    ),
    '',
    '### 生命周期意图',
    '',
    ...markdownTable(
      ['Hook', '目标', '迁移意图'],
      semantics.lifecycleIntent.slice(0, 12).map((item) => [
        item.hook,
        item.target ?? '待确认',
        item.evidence ?? '',
      ]),
    ),
    '',
    '### 交互意图',
    '',
    ...markdownTable(
      ['类型', '目标', '来源证据'],
      semantics.interactionIntent.slice(0, 16).map((item) => [
        item.kind,
        item.target ?? '待确认',
        item.evidence ?? '',
      ]),
    ),
    '',
    '### 禁止直译',
    '',
    ...listOrFallback(semantics.doNotTranslate.map((item) => `- ${item}`)),
  ];
}

function renderThemeMappingGroups(plan: UiBuildPlan): string[] {
  const groups = plan.themeMappingGroups;
  return [
    '分层规则：`resolved` 可作为默认实现强提示；`candidates` 需要对照节点证据后使用；`familyOnly` 只说明目标工程有该 token 家族，不参与默认实现决策。',
    '',
    ...markdownTable(
      ['分层', '数量', '示例'],
      [
        ['resolved', String(groups.resolved.length), themeMappingExamples(groups.resolved)],
        ['candidates', String(groups.candidates.length), themeMappingExamples(groups.candidates)],
        ['familyOnly', String(groups.familyOnly.length), themeMappingExamples(groups.familyOnly)],
      ],
    ),
  ];
}

function themeMappingExamples(mappings: UiBuildPlan['themeMappings']): string {
  return mappings.slice(0, 5).map((mapping) =>
    `${mapping.source} → ${mapping.target ?? '人工确认'} (${confidenceLabel(mapping.confidence)})`,
  ).join('；') || '无';
}

function renderArchitectureProfile(plan: UiBuildPlan): string[] {
  const profile = plan.targetConventions.architectureProfile;
  const themeFamilies = plan.stylePlan.targetThemeGuidance.families;
  const scopedComponents = plan.target.reusableComponents.map((component) => component.symbol);
  return [
    ...markdownTable(
      ['维度', '识别结果', '置信度', '来源'],
      [
        ['状态 overall', profile.state.pattern, confidenceLabel(profile.state.confidence), 'page/global/package evidence'],
        ['状态 package', profile.state.package?.pattern ?? 'unknown', confidenceLabel(profile.state.package?.confidence ?? 'low'), 'pubspec.yaml'],
        ['状态 global', profile.state.global?.pattern ?? 'unknown', confidenceLabel(profile.state.global?.confidence ?? 'low'), 'main/app/preferences Dart usage'],
        ['状态 page', profile.state.page?.pattern ?? 'unknown', confidenceLabel(profile.state.page?.confidence ?? 'low'), 'target module / similar module Dart usage'],
        ['路由 overall', profile.routing.pattern, confidenceLabel(profile.routing.confidence), 'route files / navigation calls'],
        ['路由注册', profile.routing.registration?.pattern ?? 'unknown', confidenceLabel(profile.routing.registration?.confidence ?? 'low'), 'lib/app/routes/**/*.dart'],
        ['路由调用', profile.routing.navigation?.pattern ?? 'unknown', confidenceLabel(profile.routing.navigation?.confidence ?? 'low'), 'non-generated Dart usage'],
        ['i18n lookup', profile.i18n.lookup?.pattern ?? profile.i18n.pattern, confidenceLabel(profile.i18n.lookup?.confidence ?? profile.i18n.confidence), 'translations / Dart usage'],
        ['主题 family', themeFamilies.join('、') || 'unknown', confidenceLabel(profile.theme.confidence), 'current module / shared Dart usage；完整表达保留在 JSON'],
        ['组件候选范围', scopedComponents.join('、') || '未识别', confidenceLabel(profile.components.confidence), 'current module / true shared directories'],
        ['文件组织', profile.fileOrganization.pattern, confidenceLabel(profile.fileOrganization.confidence), 'target Dart path structure'],
      ],
    ),
    '',
    '### 代码扫描证据样例',
    '',
    '代码扫描仍是 targetConventions 的最高优先级证据；文档证据只作为补充，不能覆盖真实代码扫描结果。',
    '',
    ...markdownTable(
      ['维度', '符号', '文件', '片段'],
      [
        ...profile.state.examples.slice(0, 2).map((item) => evidenceRow('状态', item)),
        ...profile.routing.examples.slice(0, 2).map((item) => evidenceRow('路由', item)),
        ...profile.i18n.examples.slice(0, 2).map((item) => evidenceRow('i18n', item)),
        ...profile.theme.examples.slice(0, 2).map((item) => evidenceRow('主题', item)),
        ...profile.components.examples.slice(0, 3).map((item) => evidenceRow('组件', item)),
        ...profile.fileOrganization.examples.slice(0, 1).map((item) => evidenceRow('文件组织', item)),
      ],
    ),
    '',
    '### Target 文档证据',
    '',
    ...renderTargetDocumentation(plan),
    '',
    ...(plan.targetConventions.unresolved.length
      ? ['### 未解析项', '', ...plan.targetConventions.unresolved.map((item) => `- ${translateWarning(item)}`)]
      : []),
  ];
}

function renderTargetDocumentation(plan: UiBuildPlan): string[] {
  const docs = plan.targetConventions.documentation;
  if (!docs || docs.files.length === 0) return ['- 未发现 README/AGENT/CLAUDE/Cursor rules/docs 等 target 文档证据。'];
  const visibleHints = docs.architectureHints.filter((hint) => hint.confidence !== 'low');
  return [
    ...markdownTable(
      ['文件', '摘要'],
      docs.files.slice(0, 12).map((file) => [
        codeCell(file.path),
        file.summary.slice(0, 3).join('；') || `${file.size} bytes`,
      ]),
    ),
    '',
    ...markdownTable(
      ['类型', '模式/关键词', '置信度', '文件', '证据'],
      visibleHints.slice(0, 16).map((hint) => [
        hint.kind,
        hint.pattern,
        confidenceLabel(hint.confidence),
        codeCell(hint.file),
        hint.evidence,
      ]),
    ),
    '',
    ...(docs.conflicts.length
      ? ['文档与代码扫描冲突：', '', ...docs.conflicts.map((item) => `- ${translateWarning(item)}`), '']
      : []),
    ...(docs.warnings.length
      ? ['文档扫描警告：', '', ...docs.warnings.map((item) => `- ${translateWarning(item)}`)]
      : []),
  ];
}

function renderNodeAudits(plan: UiBuildPlan): string[] {
  const audits = plan.visualPlan.nodeAudits ?? [];
  const visibleAudits = audits.filter((audit) => audit.displayInReview);
  const repeatedAudits = visibleAudits.filter((audit) => audit.repeatedGroup);
  if (!audits.length) return ['- 未生成节点级还原证据；请回退查看 `page-canonical.json`。'];
  const suppressed = plan.visualPlan.nodeAuditSummary?.suppressed ?? [];
  return [
    ...(repeatedAudits.length
      ? [
        '### 重复节点组',
        '',
        ...renderRepeatedNodeAuditGroups(repeatedAudits),
        '',
      ]
      : []),
    ...markdownTable(
      ['优先级', '单元', '实现提示', '目标组件', '布局摘要', '必须保留', '不要补/注意'],
      visibleAudits.slice(0, 16).map((audit) => [
        audit.priority.toUpperCase(),
        `${audit.kind} ${codeCell(audit.sourceNodeId)}`,
        audit.implementationSummary.targetWidgetHint ?? audit.coverageReason,
        targetComponentSummary(audit),
        audit.implementationSummary.layoutSummary,
        audit.implementationSummary.mustPreserve.slice(0, 3).map((item) => translateWarning(item)).join('；'),
        [
          ...audit.implementationSummary.doNotInvent.slice(0, 2).map((item) => translateWarning(item)),
          ...audit.layoutConflicts.slice(0, 1).map((conflict) => translateWarning(conflict.message)),
          audit.noiseLevel !== 'low' ? `审查噪音=${audit.noiseLevel}` : '',
        ].filter(Boolean).join('；'),
      ]),
    ),
    '',
    ...visibleAudits
      .filter((audit) => audit.priority === 'p0')
      .slice(0, 8)
      .flatMap((audit) => renderNodeAuditDetail(audit)),
    '',
    ...(suppressed.length
      ? [
        '未展开的辅助/重复节点：',
        '',
        ...suppressed.slice(0, 8).map((item) => `- ${codeCell(item.nodeId)}：${translateWarning(item.reason)}`),
        ...(suppressed.length > 8 ? [`- 另有 ${suppressed.length - 8} 条折叠记录保留在 plan 中。`] : []),
      ]
      : []),
  ];
}

function renderRepeatedNodeAuditGroups(audits: UiBuildPlan['visualPlan']['nodeAudits']): string[] {
  return [
    ...markdownTable(
      ['Group', '代表节点', '实例数', '结构', '主要差异'],
      audits.map((audit) => [
        audit.repeatedGroup?.groupId ?? audit.sourceNodeId,
        codeCell(audit.repeatedGroup?.representativeNodeId ?? audit.sourceNodeId),
        String(audit.repeatedGroup?.instanceCount ?? audit.instances?.length ?? 1),
        audit.implementationSummary.layoutSummary,
        repeatedAuditDeltaSummary(audit),
      ]),
    ),
    '',
    ...audits.flatMap((audit) => renderRepeatedNodeAuditDetail(audit)),
  ];
}

function renderRepeatedNodeAuditDetail(audit: UiBuildPlan['visualPlan']['nodeAudits'][number]): string[] {
  const instances = audit.instances ?? [];
  return [
    `#### ${audit.repeatedGroup?.groupId ?? audit.sourceNodeId} instances`,
    '',
    ...markdownTable(
      ['节点', 'bbox', 'Row text', 'Deltas'],
      instances.slice(0, 24).map((instance) => [
        codeCell(instance.nodeId),
        `${instance.bbox.x},${instance.bbox.y},${instance.bbox.width},${instance.bbox.height}`,
        instance.rowText.map((row) => row.join(' → ')).join(' / '),
        [
          ...instance.textDeltas.slice(0, 4).map((delta) => deltaSummary(delta)),
          ...instance.stateDeltas.slice(0, 2).map((delta) => deltaSummary(delta)),
          ...instance.controlDeltas.slice(0, 2).map((delta) => deltaSummary(delta)),
        ].join('；') || '代表项',
      ]),
    ),
    '',
  ];
}

function repeatedAuditDeltaSummary(audit: UiBuildPlan['visualPlan']['nodeAudits'][number]): string {
  const instances = audit.instances ?? [];
  const fields = new Map<string, Set<string>>();
  for (const instance of instances) {
    for (const [field, value] of Object.entries(instance.fieldValues)) {
      if (!fields.has(field)) fields.set(field, new Set());
      fields.get(field)?.add(value);
    }
  }
  return [...fields.entries()]
    .filter(([, values]) => values.size > 1)
    .slice(0, 6)
    .map(([field, values]) => `${field}: ${[...values].slice(0, 5).join('/')}`)
    .join('；') || '无主要文本差异';
}

function deltaSummary(delta: {
  field: string;
  base?: string | undefined;
  actual?: string | undefined;
}): string {
  return `${delta.field}: ${delta.base ?? '无'} -> ${delta.actual ?? '无'}`;
}

function reviewVisualSections(plan: UiBuildPlan): UiBuildPlan['visualPlan']['sections'] {
  const suppressed = new Set((plan.visualPlan.nodeAuditSummary?.suppressed ?? []).map((item) => item.nodeId));
  const roleCounts = new Map<string, number>();
  const result: UiBuildPlan['visualPlan']['sections'] = [];
  for (const section of plan.visualPlan.sections) {
    const rootNodeId = section.nodeIds[0];
    if (rootNodeId && suppressed.has(rootNodeId)) continue;
    const count = roleCounts.get(section.role) ?? 0;
    const limit = section.role === 'card'
      ? 4
      : section.role === 'bottom-bar'
        ? 2
        : section.role === 'section'
          ? 10
          : section.role === 'list'
            ? 2
            : 4;
    if (count >= limit) continue;
    roleCounts.set(section.role, count + 1);
    result.push(section);
    if (result.length >= 32) break;
  }
  return result;
}

function renderNodeAuditDetail(audit: UiBuildPlan['visualPlan']['nodeAudits'][number]): string[] {
  return [
    `#### ${audit.priority.toUpperCase()} ${audit.kind} · ${audit.sourceNodeId}`,
    '',
    `- 布局：${audit.implementationSummary.layoutSummary}`,
    ...audit.rows.slice(0, 6).map((row) =>
      `- 第 ${row.index} 行：${row.children.map((child) => auditChildSummary(child)).join(' → ') || '无'}`,
    ),
    ...(audit.implementationSummary.controlSummary.length
      ? [`- 控件：${audit.implementationSummary.controlSummary.join('；')}`]
      : []),
    ...(audit.actionMappings.length
      ? [
        '- Action 绑定：',
        ...audit.actionMappings.slice(0, 8).map((mapping) =>
          `  - ${codeCell(mapping.nodeId)}${mapping.assetRef ? ` / ${mapping.assetRef}` : ''}：${mapping.semanticName ?? '未命名'} → ${mapping.sourceInteraction ?? 'runtime interaction'}，callback=${mapping.suggestedCallback ?? '人工确认'}，置信度=${confidenceLabel(mapping.confidence)}`,
        ),
      ]
      : []),
    ...(audit.targetComponentCandidates?.length
      ? [
        '- 目标组件候选：',
        ...audit.targetComponentCandidates.slice(0, 4).map((candidate) =>
          `  - ${candidate.symbol}（${candidate.role}，${candidate.recommendation}）：${candidate.fitChecks.join('；') || '检查目标组件 API 是否能承载本节点视觉约束。'}${candidate.risks.length ? ` 风险：${candidate.risks.join('；')}` : ''}`,
        ),
      ]
      : []),
    ...(audit.layoutConflicts.length
      ? [
        '- 布局冲突：',
        ...audit.layoutConflicts.slice(0, 4).map((conflict) =>
          `  - ${conflict.kind}：${translateWarning(conflict.message)} ${translateWarning(conflict.manualConfirmation)}`,
        ),
        ...(audit.directChildren.length
          ? [`- 直接子节点：${audit.directChildren.slice(0, 8).map((child) => `${codeCell(child.nodeId)} ${child.text ?? child.assetRefs?.join(',') ?? child.role}`).join(' → ')}`]
          : []),
      ]
      : []),
    ...(audit.implementationSummary.doNotInvent.length
      ? [`- 不要补：${audit.implementationSummary.doNotInvent.map((item) => translateWarning(item)).join('；')}`]
      : []),
    ...(audit.assetRefs.length ? [`- 资源线索：${audit.assetRefs.join('、')}`] : []),
    '',
  ];
}

function renderImplementationConflicts(plan: UiBuildPlan): string[] {
  const conflicts = plan.implementationContract.conflicts ?? [];
  if (!conflicts.length) return ['- 未识别到 source 结构与 runtime 布局的顶层冲突。'];
  return [
    ...markdownTable(
      ['级别', '节点', '冲突', 'source 意图', 'runtime 观察', '决策项'],
      conflicts.map((conflict) => [
        conflict.severity.toUpperCase(),
        codeCell(conflict.sourceNodeId),
        conflict.type,
        conflict.sourceIntentLayout ?? conflict.sourceStructure,
        conflict.runtimeObservation,
        conflict.decisionOptions.join(' / '),
      ]),
    ),
  ];
}

function renderOverlayPlan(plan: UiBuildPlan): string[] {
  const overlays = plan.implementationContract.overlayPlan ?? [];
  if (!overlays.length) return ['- 未识别到需要实现 UI shell 的 source-only overlay。'];
  return [
    'Overlay 规则：`uiShellRequired=true` 表示需要实现弹层/Sheet UI；`businessBehaviorRequired=false` 表示提交、接口、真实副作用保留 TODO。',
    '',
    ...markdownTable(
      ['Overlay', '触发', '来源组件/状态', '目标组件', '视觉证据', '实现级别', '风险'],
      overlays.map((overlay) => [
        overlay.id,
        overlay.trigger ?? '人工确认',
        [overlay.sourceComponent, overlay.sourceState].filter(Boolean).join(' / '),
        overlay.targetComponent ?? '本地 Widget/人工确认',
        overlay.visualEvidence,
        overlay.uiShellRequired ? `${overlay.implementationLevel}; UI shell required` : overlay.implementationLevel,
        overlay.visualFidelityRisk,
      ]),
    ),
  ];
}

function targetComponentSummary(audit: UiBuildPlan['visualPlan']['nodeAudits'][number]): string {
  const candidates = audit.targetComponentCandidates ?? [];
  if (!candidates.length) return '';
  return candidates
    .slice(0, 2)
    .map((candidate) => {
      const prefix = candidate.recommendation === 'prefer-target-component'
        ? '优先'
        : candidate.recommendation === 'manual-check'
          ? '检查'
          : '回退';
      return `${prefix} ${candidate.symbol}`;
    })
    .join('；');
}

function renderDynamicTextHints(plan: UiBuildPlan): string[] {
  const hints = plan.visualPlan.dynamicTextHints ?? [];
  if (!hints.length) return ['- 未识别到需要从数据模型派生的动态文案。'];
  const groups = new Map<string, typeof hints>();
  for (const hint of hints) {
    groups.set(hint.kind, [...(groups.get(hint.kind) ?? []), hint]);
  }
  return [
    ...markdownTable(
      ['类型', '数量', '示例', '关联节点', '建议'],
      [...groups.entries()].map(([kind, items]) => [
        kind,
        String(items.length),
        items.slice(0, 4).map((hint) => `${codeCell(hint.nodeId)} ${hint.text}`).join('；'),
        items.map((hint) => hint.relatedNodeId).filter(Boolean).slice(0, 3).map((nodeId) => codeCell(nodeId as string)).join('、'),
        translateRecommendation(items[0]?.recommendation ?? ''),
      ]),
    ),
    '',
    ...(hints.length > 12
      ? [`_完整 ${hints.length} 条动态文案证据保留在 \`ui-build-plan.json#/visualPlan/dynamicTextHints\`。_`, '']
      : []),
  ];
}

function auditChildSummary(child: {
  nodeId: string;
  role: string;
  text?: string | undefined;
  assetRefs?: string[] | undefined;
}): string {
  const label = child.text
    ? child.text
    : child.assetRefs?.length
      ? child.assetRefs.join(',')
      : child.role;
  return `${codeCell(child.nodeId)} ${child.role}${label ? `: ${label}` : ''}`;
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

function renderWidgetContractTable(plan: UiBuildPlan): string[] {
  const contracts = new Map(plan.implementationContract.widgetContracts.map((contract) => [contract.widget, contract]));
  return markdownTable(
    ['Widget', '父级', '角色', '状态访问', '输入', '回调', '构建提示'],
    plan.implementationContract.widgetTree.map((widget) => {
      const contract = contracts.get(widget.name);
      return [
        widget.name,
        widget.parent ?? '页面入口',
        widget.role,
        contract?.shouldReadController
          ? '可读取页面状态边界'
          : stateAccessLabel(widget.stateAccess),
        contract?.inputs.join('、') || '无',
        contract?.callbacks.join('、') || '无',
        widget.buildHint,
      ];
    }),
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
    .replace('Do not create implementation widgets, files, inputs, or callbacks from fixed business page templates; contracts must be backed by source structure, runtime evidence, or target conventions.', '不得从固定业务页面模板生成实现 widget、文件、输入或回调；合同必须由 source 结构、runtime 证据或 targetConventions 支撑。')
    .replace('For app-bar/header actions, bind each visible action to source interactions before naming callbacks or choosing icons.', 'AppBar/header 操作必须先绑定 source interaction，再命名 callback 或选择图标。')
    .replace('When source structure and runtime layout disagree, treat implementationContract.conflicts as a required decision before coding the container layout.', 'source 结构与 runtime 布局不一致时，先处理 implementationContract.conflicts，再实现容器布局。')
    .replace('When implementationContract.overlayPlan marks uiShellRequired=true, implement the overlay shell even if business behavior remains TODO.', 'implementationContract.overlayPlan 标记 uiShellRequired=true 时，即使业务行为 TODO，也要实现弹层 UI shell。')
    .replace('If target conventions are unknown, report warnings instead of guessing.', '目标约定未知时输出警告，不要猜。');
}

function translateImplementationGuidance(value: string): string {
  return value
    .replace('Resolve source/runtime layout conflicts before coding affected containers.', '实现受影响容器前，先解决 source/runtime 布局冲突。')
    .replace('Implement app bar, section/filter structure, repeated cards/list items, and visible controls first.', '先实现 AppBar、section/filter 结构、重复卡片/列表项和可见控件。')
    .replace('Overlay evidence is retained and UI shells are required, but source-only visual fidelity may be implemented after the main screen pass.', 'Overlay 证据已保留且 UI shell 必须实现；source-only 视觉细节可在主屏之后处理。')
    .replace('source-structure-vs-runtime-layout: resolve source/runtime layout decision before coding.', 'source 结构与 runtime 布局不一致：编码前先做布局决策。')
    .replace('Visible controls have source-bound action mappings; preserve callback semantics and visual order.', '可见控件已有 source action 绑定；保留 callback 语义和视觉顺序。')
    .replace('Source-only overlay UI shell is required even when business behavior remains TODO.', '即使业务行为保留 TODO，也需要实现 source-only overlay UI shell。');
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
    .replace('Derive this count from the backing list/model length instead of hard-coding it in a translation key.', '该数量应从列表或 UI model 长度派生，不要写死到翻译 key。')
    .replace('Format this value from UI model data with the target currency/number formatter.', '该金额应来自 UI model，并使用目标工程的货币/数字格式化。')
    .replace('Format this percentage from UI model data instead of treating it as static copy.', '该百分比应来自 UI model，不要当作静态文案。')
    .replace('Format this date from UI model data with the target date formatter.', '该日期应来自 UI model，并使用目标工程的日期格式化。')
    .replace('Format this quantity from UI model data; translate only the label portion.', '该数量应来自 UI model，只翻译标签部分。')
    .replace('Render this value from UI model data instead of static copy.', '该值应来自 UI model，不要当作静态文案。')
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
    .replace('Representative node rows list the visible display fields; do not add extra sibling fields unless sourceSemantics or user confirmation requires them.', '代表节点行结构只列出可见展示字段；除非 sourceSemantics 或用户确认要求，不要额外补同级字段。')
    .replace('No available quantity field is visible in this representative card/list item.', '该代表卡片/列表项没有可见的可用数量字段。')
    .replace('Restore row order and visible text/icon order from rows before applying target component abstractions.', '先保留行顺序和文本/图标顺序，再套目标组件抽象。')
    .replace('Controls include padding/radius evidence; prefer padding-driven layout over fixed height when target APIs allow it.', '控件已有 padding/radius 证据；目标 API 允许时优先用 padding 撑开，而不是固定高度。')
    .replace('Use this representative item as the contract for repeated item widgets.', '将该代表项作为重复项 Widget 的还原契约。')
    .replace(/^Row (\d+): /, '第 $1 行：')
    .replace('large wrapper is covered by more specific child nodeAudits.', '大 wrapper 已由更具体的子节点审查覆盖。')
    .replace('list wrapper is covered by child card/list-item nodeAudits.', '列表 wrapper 已由子 card/list-item 审查覆盖。')
    .replace('bottom action row is covered by parent card/list-item nodeAudit controls.', '底部操作行已由父级 card/list-item 的 controls 覆盖。')
    .replace(/^additional (.+) audit retained in plan but omitted from review after representative coverage\.$/, '额外 $1 审查已保留在 plan 中，review 按代表项折叠。')
    .replace(/^additional (.+) audit omitted after representative coverage\.$/, '额外 $1 审查已由代表项覆盖，未在 review 展开。')
    .replace('control is covered by a parent card/list-item nodeAudit.', '控件已由父级 card/list-item 审查覆盖。')
    .replace('page-level state pattern was not detected from target module or similar module files.', '未从目标模块或相似模块文件识别到页面级状态模式。')
    .replace('i18n pattern was not detected from translations or Dart usage.', '未从翻译文件或 Dart 使用中识别到 i18n 模式。')
    .replace(/only global\/app-level (.+) state evidence was detected; page-level state expression remains unresolved\./, '只识别到全局/应用级 $1 状态证据；页面级状态表达仍未确认。')
    .replace('page-level controller/binding files from the source-aware draft were omitted until target page state conventions are confirmed.', 'source-aware 初稿中的页面级状态边界文件已省略，直到确认目标页面级状态约定。')
    .replace('page-level state-boundary registration files from the source-aware draft were omitted until target page state conventions are confirmed.', 'source-aware 初稿中的页面级状态边界注册文件已省略，直到确认目标页面级状态约定。')
    .replace('i18n pattern is unknown; do not invent translation API.', 'i18n 模式未知；不要发明翻译 API。')
    .replace('Widget callbacks include source-bound actions; do not replace them with generic onMore/onTap names or hide visible app-bar/header actions.', 'Widget callbacks 已包含 source 绑定动作；不要替换成泛化 onMore/onTap，也不要隐藏可见 AppBar/header action。')
    .replace('Resolve implementationContract.conflicts before coding affected layout containers; these are source-structure versus runtime-layout decisions, not ordinary visual hints.', '实现受影响布局容器前，先解决 implementationContract.conflicts；这是 source 结构与 runtime 布局决策，不是普通视觉提示。')
    .replace('Implement overlay UI shells listed in implementationContract.overlayPlan even when businessBehaviorRequired=false; keep API submission and real business side effects as TODO.', '即使 businessBehaviorRequired=false，也要实现 implementationContract.overlayPlan 中列出的 overlay UI shell；接口提交和真实业务副作用保留 TODO。')
    .replace(/^Confirm target convention: /, '确认目标约定：');
}

function validationHintRow(hint: string): string[] {
  const translated = translateValidationHint(hint);
  const category = validationHintCategory(hint);
  return [category, translated];
}

function validationHintCategory(hint: string): string {
  if (/typography|CSS colors|spacing|layout|theme|fontSize|fontWeight|textStyles/i.test(hint)) return '视觉/主题';
  if (/business data|API|permission|risk|tracking/i.test(hint)) return '业务边界';
  if (/similar module|common widgets|one-to-one DOM/i.test(hint)) return '工程复用';
  if (/callbacks|source-bound|app-bar|header actions|controls|buttons|chips|按钮|标签/i.test(hint)) return '交互绑定';
  if (/overlay|uiShell|businessBehaviorRequired/i.test(hint)) return 'Overlay';
  if (/conflicts|source-structure|runtime-layout|row-flex-multiple-y-bands|视觉分带/i.test(hint)) return '冲突决策';
  if (/screenshot|source screenshot/i.test(hint)) return '视觉校验';
  if (/nodeAudits|代表性节点审计|repeated|high-risk|重复|高风险/i.test(hint)) return '业务边界';
  return '校验';
}

function translateValidationHint(hint: string): string {
  return translateWarning(hint)
    .replace(/^visualPlan\.nodeAudits contains (\d+) representative node audit\(s\) for repeated or high-risk UI units\.$/, 'visualPlan.nodeAudits 中有 $1 个代表性节点审计，覆盖重复列表或高风险 UI 单元。')
    .replace('Review visualPlan.nodeAudits[*].controls before implementing buttons or chips; preserve padding, radius, and text order where present.', '实现按钮或标签前，先查看 visualPlan.nodeAudits[*].controls；如果存在 padding、radius 和文字顺序证据，需要保持一致。')
    .replace('Review visualPlan.nodeAudits card/list rows before writing repeated item widgets; absenceHints identify fields that should not be invented.', '编写重复卡片或列表项 Widget 前，先查看 visualPlan.nodeAudits 中的 card/list 行结构；absenceHints 表示不应臆造的字段。')
    .replace('When visualPlan.nodeAudits includes targetComponentCandidates with prefer-target-component, try the detected target component first and use rows/controls/bbox as fit checks before falling back to a local Widget.', '当 visualPlan.nodeAudits 的 targetComponentCandidates 标记为 prefer-target-component 时，先尝试已检测到的目标组件，并用 rows、controls、bbox 作为适配检查；不匹配时再回退到本地 Widget。')
    .replace('When a nodeAudit reports row-flex-multiple-y-bands, preserve directChildren structure and confirm whether the visual bands are intentional wrap before implementing as multiple Flutter rows.', '当 nodeAudit 报告 row-flex-multiple-y-bands 时，需要保留 directChildren 结构，并确认这些视觉分带是否为有意换行，再决定是否实现为多行 Flutter 布局。')
    .replace('Compare the generated Flutter screen against the source screenshot before adding business behavior.', '添加业务行为前，先把生成的 Flutter 页面与来源截图对齐。')
    .replace('Treat typography, CSS colors, spacing, and layout as P0 visual fidelity items; prefer exact evidence matches before approximate fallback.', '字体、CSS 颜色、间距和布局是 P0 视觉保真项；优先使用精确证据匹配，再考虑近似 fallback。')
    .replace('Use node-level themeMappings first; when a theme token is resolved exactly, do not replace it with a larger or heavier nearby token.', '优先使用节点级 themeMappings；当 token 精确命中时，不要替换成更大或更粗的相近 token。')
    .replace('If a typography themeMapping has lockToken=true, use the target textStyles token directly and do not override fontSize, height, fontWeight, or fontFamily unless the plan explicitly lists a source override.', '如果 typography themeMapping 标记 lockToken=true，必须直接使用目标 textStyles token；除非 plan 明确列出来源覆盖证据，不得覆盖 fontSize、height、fontWeight、fontFamily。')
    .replace('Check spacing, radius, border, and shadow values against reusable target widgets before introducing local constants.', '新增本地常量前，先用目标可复用组件核对 spacing、radius、border、shadow。')
    .replace('Keep business data, API fields, permission checks, risk controls, and tracking as TODOs unless confirmed by target examples.', '业务数据、API 字段、权限、风控和埋点，除非目标示例已确认，否则保留 TODO。')
    .replace('Prefer similar module examples and common widgets over one-to-one DOM translation.', '优先参考相似模块示例和公共组件，不要逐层翻译 DOM。');
}

function listOrFallback(items: string[]): string[] {
  return items.length > 0 ? items : ['- 无'];
}
