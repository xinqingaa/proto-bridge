import path from 'node:path';
import type {
  BuildUiImplementationPlanInput,
  BuildUiImplementationPlanResult,
  ComponentMapping,
  FlutterComponentRef,
  FlutterComponentRole,
  FlutterPlannedFile,
  FlutterWidgetPlan,
  InteractionPlan,
  PageSnapshot,
  SnapshotNodeRole,
  ThemeMapping,
  UiImplementationPlan,
} from '../types/index.js';
import { findFlutterTargetExamples, getFlutterTargetConventions } from '../adapters/target/flutter-app/target-connect.js';
import { toPascalCase, toSnakeCase } from '../adapters/target/flutter-app/planners/naming-strategy.js';
import { writeJsonFile } from '../utils/path.js';

export async function buildUiImplementationPlan(
  input: BuildUiImplementationPlanInput,
): Promise<BuildUiImplementationPlanResult> {
  const targetRoot = path.resolve(input.targetRoot);
  const conventions = await getFlutterTargetConventions({
    flutterRoot: targetRoot,
    module: input.targetModule,
    roles: rolesForSnapshot(input.snapshot),
  });
  const moduleName = input.targetModule ?? inferModule(input.snapshot, conventions.existingModules) ?? 'feature';
  const examples = await findFlutterTargetExamples({
    flutterRoot: targetRoot,
    module: moduleName,
    pattern: inferPattern(input.snapshot),
    roles: rolesForSnapshot(input.snapshot),
    screenId: input.snapshot.page.route,
    limit: 8,
  });
  const pageName = inferPageName(input.snapshot);
  const baseDir = `lib/app/modules/${moduleName}/${toSnakeCase(pageName)}`;
  const widgetTree = buildWidgetTree(pageName, input.snapshot);
  const plan: UiImplementationPlan = {
    id: createPlanId(input.snapshot.id),
    snapshotId: input.snapshot.id,
    target: {
      root: targetRoot,
      module: moduleName,
      existingModules: conventions.existingModules,
      routesFiles: conventions.routesFiles,
      translationFiles: conventions.translationFiles,
      assetDirectories: conventions.assetDirectories,
      reusableComponents: conventions.components,
      similarExamples: examples,
      warnings: conventions.warnings,
    },
    page: {
      title: input.snapshot.page.title,
      route: input.snapshot.page.route,
      summary: buildSummary(input.snapshot),
      viewport: input.snapshot.source.viewport,
    },
    fileTree: buildFileTree(baseDir, pageName, widgetTree),
    widgetTree,
    componentMappings: buildComponentMappings(input.snapshot, conventions.components),
    themeMappings: buildThemeMappings(input.snapshot),
    i18nPlan: buildI18nPlan(input.snapshot),
    assetPlan: buildAssetPlan(input.snapshot),
    interactionPlan: buildInteractionPlan(input.snapshot),
    businessQuestions: buildBusinessQuestions(input.snapshot),
    risks: buildRisks(input.snapshot),
    validationHints: [
      'Compare the generated Flutter screen against the source screenshot before adding business behavior.',
      'Use YouFi themeService colors/textStyles instead of hard-coded visual values where a close token exists.',
      'Check spacing, radius, border, and shadow values against reusable YouFi widgets before introducing local constants.',
      'Keep business data, API fields, permission checks, risk controls, and tracking as TODOs unless confirmed by YouFi examples.',
      'Prefer similar module examples and common widgets over one-to-one DOM translation.',
    ],
  };

  const planPath = path.join(input.outDir, 'ui-implementation-plan.json');
  await writeJsonFile(planPath, plan);
  return {
    plan,
    files: {
      uiImplementationPlan: planPath,
    },
  };
}

function rolesForSnapshot(snapshot: PageSnapshot): FlutterComponentRole[] {
  const roles = new Set<FlutterComponentRole>(['page-base', 'theme', 'i18n']);
  if (snapshot.nodes.some((node) => node.role === 'app-bar')) roles.add('app-bar');
  if (snapshot.nodes.some((node) => node.role === 'button')) roles.add('button');
  if (snapshot.nodes.some((node) => node.role === 'image' || node.role === 'icon')) roles.add('image');
  if (snapshot.nodes.some((node) => node.role === 'modal')) roles.add('sheet');
  if (snapshot.visualSections.some((section) => section.role === 'list')) roles.add('refresh');
  return [...roles];
}

function inferModule(snapshot: PageSnapshot, existingModules: string[]): string | undefined {
  const route = snapshot.page.route ?? snapshot.source.url ?? '';
  const segments = route.split(/[/?#&.=_-]+/).filter((item) => item.length >= 3);
  for (const segment of segments) {
    if (existingModules.includes(segment)) return segment;
  }
  const lowered = route.toLowerCase();
  if (lowered.includes('stock') && existingModules.includes('order')) return 'order';
  if (lowered.includes('option') && existingModules.includes('option')) return 'option';
  if ((lowered.includes('asset') || lowered.includes('account')) && existingModules.includes('account')) return 'account';
  if (lowered.includes('auth') && existingModules.includes('auth')) return 'auth';
  return existingModules[0];
}

function inferPattern(snapshot: PageSnapshot): string {
  if (snapshot.visualSections.some((section) => section.role === 'list')) return 'list';
  if (snapshot.nodes.some((node) => node.role === 'input')) return 'form';
  if (snapshot.visualSections.length >= 6) return 'dashboard';
  return 'detail';
}

function inferPageName(snapshot: PageSnapshot): string {
  const route = snapshot.page.route ?? snapshot.source.url ?? snapshot.page.title ?? 'SnapshotPage';
  const lastSegment = route.split(/[/?#]/)[0]?.split('/').filter(Boolean).at(-1);
  return toPascalCase(lastSegment ?? snapshot.page.title ?? 'SnapshotPage');
}

function buildSummary(snapshot: PageSnapshot): string {
  const sectionCount = snapshot.visualSections.length;
  const textCount = snapshot.page.text.length;
  const assetCount = snapshot.assets.length;
  return `该计划来自 URL Snapshot，聚焦可见 UI 还原；识别到 ${sectionCount} 个视觉区块、${textCount} 条文案线索和 ${assetCount} 个资源线索。业务接口、权限、风控和埋点不在本计划中做确定性推断。`;
}

function buildFileTree(baseDir: string, pageName: string, widgetTree: FlutterWidgetPlan[]): FlutterPlannedFile[] {
  const pageSnake = toSnakeCase(pageName);
  const files: FlutterPlannedFile[] = [
    {
      path: `${baseDir}/${pageSnake}_page.dart`,
      responsibility: '页面入口，按 YouFi 页面基类、Scaffold/SafeArea 和可见区块编排 UI。',
      notes: '只实现可见 UI；业务数据和接口接入保留 TODO。',
    },
    {
      path: `${baseDir}/${pageSnake}_controller.dart`,
      responsibility: '承载轻量 UI 状态，例如 tab、选中项、展开态和点击事件占位。',
      notes: '不得在 Phase 1 中伪造接口字段、权限或交易规则。',
    },
    {
      path: `${baseDir}/${pageSnake}_binding.dart`,
      responsibility: '注册页面 Controller，保持与 YouFi 模块内相似页面一致。',
    },
  ];

  for (const widget of widgetTree.filter((item) => item.parent).slice(0, 10)) {
    files.push({
      path: `${baseDir}/widgets/${toSnakeCase(widget.name)}.dart`,
      responsibility: widget.buildHint,
      notes: widget.role,
    });
  }

  return dedupeBy(files, (file) => file.path);
}

function buildWidgetTree(pageName: string, snapshot: PageSnapshot): FlutterWidgetPlan[] {
  const rootName = `${pageName}Page`;
  const widgets: FlutterWidgetPlan[] = [
    {
      name: rootName,
      role: 'page',
      buildHint: '使用 YouFi 页面基类承载整体结构，按 snapshot visualSections 编排子 Widget。',
      stateAccess: 'controller',
    },
  ];

  for (const section of snapshot.visualSections.slice(0, 12)) {
    const nameHint = section.title ? toPascalCase(section.title).slice(0, 40) : toPascalCase(section.role);
    widgets.push({
      name: `${pageName}${nameHint || toPascalCase(section.role)}`,
      parent: rootName,
      role: section.role,
      buildHint: `还原 ${section.role} 区块，bbox=${section.bbox.x},${section.bbox.y},${section.bbox.width},${section.bbox.height}。`,
      stateAccess: section.role === 'tab-bar' || section.role === 'bottom-bar' ? 'controller-slice' : 'props',
    });
  }

  return widgets;
}

function buildComponentMappings(snapshot: PageSnapshot, components: FlutterComponentRef[]): ComponentMapping[] {
  const roles = new Map<SnapshotNodeRole, string[]>();
  for (const node of snapshot.nodes) {
    if (!roles.has(node.role)) roles.set(node.role, []);
    roles.get(node.role)?.push(node.id);
  }

  return [...roles.entries()]
    .filter(([role]) => role !== 'unknown' && role !== 'text')
    .map(([role, nodeIds]) => {
      const component = bestComponentForRole(role, components);
      return {
        sourceRole: role,
        nodeIds: nodeIds.slice(0, 20),
        ...(component ? { targetSymbol: component.symbol } : {}),
        confidence: component?.confidence ?? 'low',
        reason: component
          ? `Snapshot role ${role} can likely use ${component.symbol}.`
          : `No clear YouFi component was detected for snapshot role ${role}; implement with local Widget and target theme.`,
      };
    });
}

function bestComponentForRole(role: SnapshotNodeRole, components: FlutterComponentRef[]): FlutterComponentRef | undefined {
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

function buildThemeMappings(snapshot: PageSnapshot): ThemeMapping[] {
  return snapshot.tokens.slice(0, 80).map((token) => {
    const target = token.kind === 'typography'
      ? 'themeService.textStyles.*'
      : token.kind === 'color'
        ? 'themeService.colors.*'
        : undefined;
    const source = token.cssVar ? `${token.source} (${token.cssVar})` : token.source;
    return {
      source,
      value: token.value,
      ...(target ? { target } : {}),
      confidence: target ? 'medium' : 'low',
      reason: target
        ? `Map snapshot ${token.kind} evidence to the closest YouFi theme token during implementation.`
        : `No direct YouFi token family is inferred for ${token.kind}; confirm manually.`,
    };
  });
}

function buildI18nPlan(snapshot: PageSnapshot): UiImplementationPlan['i18nPlan'] {
  const texts = snapshot.page.text
    .filter((text) => text.length <= 120)
    .slice(0, 120)
    .map((text) => ({
      text,
      nodeIds: snapshot.nodes.filter((node) => node.text === text).map((node) => node.id).slice(0, 8),
      ...suggestedKey(text),
    }));
  return {
    texts,
    recommendation: 'Visible text should use YouFi .tr conventions when the target module already has translations; otherwise keep local constants with TODO for translation keys.',
  };
}

function suggestedKey(text: string): { suggestedKey?: string } {
  const key = toSnakeCase(text).slice(0, 48);
  return key ? { suggestedKey: key } : {};
}

function buildAssetPlan(snapshot: PageSnapshot): UiImplementationPlan['assetPlan'] {
  return {
    assets: snapshot.assets.slice(0, 80).map((asset) => ({
      source: asset.source,
      kind: asset.kind,
      nodeId: asset.nodeId,
      recommendation: asset.source
        ? 'Match this source with an existing YouFi asset first; add a TODO if no local asset exists.'
        : 'Inline or generated visual asset detected; recreate with YouFi icon/SVG/image conventions.',
    })),
    recommendation: 'Prefer existing assets/images, assets/dark_images, assets/svg, and assets/json entries before adding new files.',
  };
}

function buildInteractionPlan(snapshot: PageSnapshot): InteractionPlan[] {
  return snapshot.interactions.slice(0, 80).map((interaction) => ({
    kind: interaction.kind,
    label: interaction.label,
    nodeId: interaction.nodeId,
    recommendation: 'Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.',
  }));
}

function buildBusinessQuestions(snapshot: PageSnapshot): string[] {
  const questions = [
    '确认页面真实数据来源、接口字段和加载/空态策略。',
    '确认点击、跳转、弹层、筛选和输入行为的业务规则。',
    '确认权限、风控、埋点和异常处理是否需要在本页面接入。',
  ];
  if (snapshot.interactions.length > 0) {
    questions.push(`Snapshot 识别到 ${snapshot.interactions.length} 个可交互区域，需要逐项确认业务动作。`);
  }
  return questions;
}

function buildRisks(snapshot: PageSnapshot): string[] {
  const risks = [
    'URL Snapshot 只能证明可见 UI，不能证明隐藏状态或业务逻辑。',
    'Computed style 与 YouFi 主题 token 之间可能存在语义差异，需要实现时二次确认。',
  ];
  if (snapshot.assets.length > 0) risks.push('图片、SVG 或背景资源需要确认是否已有 YouFi 本地资产可复用。');
  if (snapshot.warnings.length > 0) risks.push(...snapshot.warnings);
  return risks;
}

function createPlanId(snapshotId: string): string {
  return `plan_${snapshotId.replace(/^snapshot_/, '')}_${Date.now().toString(36)}`;
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(item);
  }
  return result;
}
