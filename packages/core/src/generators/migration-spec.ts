import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  GenerateMigrationSpecInput,
  GenerateMigrationSpecResult,
  MigrationContext,
  TokenMapping,
} from '../types/index.js';
import { createMigrationContext } from './migration-context.js';
import { relativeOrAbsolute, writeJsonFile, writeTextFile } from '../utils/path.js';

export async function generateMigrationSpec(
  input: GenerateMigrationSpecInput,
): Promise<GenerateMigrationSpecResult> {
  const outDir = path.resolve(input.outDir);
  await mkdir(outDir, { recursive: true });

  const context = await createMigrationContext({
    ...input,
    outDir,
  });

  const migrationContext = path.join(outDir, 'migration-context.json');
  const migrationSpec = path.join(outDir, 'migration-spec.md');

  await writeJsonFile(migrationContext, context);
  await writeTextFile(migrationSpec, renderMigrationSpec(context));

  return {
    context,
    files: {
      migrationContext,
      migrationSpec,
      screenshot: context.capture?.screenshotPath,
      domSnapshot: context.capture?.domSnapshotPath,
    },
  };
}

export function renderMigrationSpec(context: MigrationContext): string {
  const source = context.source;
  const title = source.label ?? source.title ?? source.screenId ?? source.name ?? '未命名页面';
  const lines: string[] = [];

  lines.push(`# ${title} Flutter 迁移说明书`);
  lines.push('');
  lines.push('## 页面元信息');
  lines.push(`- 原型路由：${source.route ?? '待确认'}`);
  lines.push(`- screenId：${source.screenId ?? '待确认'}`);
  lines.push(`- 原型文件：${source.vueRelativePath ?? source.vuePath}`);
  lines.push(`- 页面类型：${source.pageType}`);
  lines.push(`- 原型模块：${source.moduleLabel ?? source.module ?? '待确认'}`);
  lines.push(`- 推荐 Flutter 模块：${context.target.suggestedModule ?? '待确认'}`);
  lines.push(`- 推荐实现形态：${context.recommendations.implementationShape}`);
  lines.push(`- 原型状态：${source.status ?? '待确认'}`);
  lines.push(`- 维护角色：${source.owner ?? '待确认'}`);
  lines.push('');

  lines.push('## 一、迁移结论');
  lines.push(`- 页面复杂度：${inferComplexity(context)}`);
  lines.push(`- Flutter 实现复杂度：${context.recommendations.implementationPlan.complexity}`);
  lines.push(`- 建议是否直接实现：${context.recommendations.risks.length <= 2 ? '可以进入实现' : '先确认风险后实现'}`);
  lines.push(`- 主要风险：${context.recommendations.risks[0] ?? '暂无明显阻塞'}`);
  lines.push(`- 实现规划：${context.recommendations.implementationPlan.summary}`);
  lines.push('');

  lines.push('## 二、Flutter 实现规划');
  lines.push('### 目标文件拆分');
  lines.push(markdownTable(['文件', '职责', '备注'], context.recommendations.implementationPlan.fileTree.map((file) => [
    file.path,
    file.responsibility,
    file.notes ?? '',
  ])));
  lines.push('');

  lines.push('### Widget 组合树');
  lines.push(markdownTable(['Widget', '父级', '角色', '构建建议', '状态访问'], context.recommendations.implementationPlan.widgetTree.map((widget) => [
    widget.name,
    widget.parent ?? 'root',
    widget.role,
    widget.buildHint,
    widget.stateAccess,
  ])));
  lines.push('');

  lines.push('### Widget 输入契约');
  lines.push(markdownTable(['Widget', '输入', '回调', '是否直接读 Controller', '备注'], context.recommendations.implementationPlan.widgetContracts.map((contract) => [
    contract.widget,
    contract.inputs.join(', ') || '无 / 待确认',
    contract.callbacks.join(', ') || '无',
    contract.shouldReadController ? '是' : '否',
    contract.notes,
  ])));
  lines.push('');

  lines.push('### 状态管理组合建议');
  lines.push(markdownTable(['关注点', '建议 owner', '建议', '证据'], context.recommendations.implementationPlan.stateStrategy.map((strategy) => [
    strategy.concern,
    strategy.owner,
    strategy.recommendation,
    strategy.evidence,
  ])));
  lines.push('');

  lines.push('### Controller/Adapter 边界');
  lines.push(markdownTable(['边界', '职责', '负责', '避免'], context.recommendations.implementationPlan.controllerBoundaries.map((boundary) => [
    boundary.name,
    boundary.responsibility,
    boundary.owns.join(', '),
    boundary.avoids.join(', '),
  ])));
  lines.push('');

  lines.push('### 禁止直译项');
  for (const item of context.recommendations.implementationPlan.doNotTranslate) {
    lines.push(`- ${item}`);
  }
  lines.push('');

  lines.push('## 三、页面结构拆分');
  for (const widget of context.recommendations.widgetBreakdown) {
    lines.push(`- ${widget.name}：${widget.responsibility}`);
  }
  lines.push('');

  if (source.sfc?.sections.length) {
    lines.push('### Vue Template 识别依据');
    lines.push(markdownTable(['区块', '类型', '选择器/标题', '证据'], source.sfc.sections.map((section) => [
      section.name,
      section.kind,
      section.title ?? section.selector ?? '',
      section.evidence,
    ])));
    lines.push('');
  }

  lines.push('## 四、Flutter Widget 拆分建议');
  lines.push(markdownTable(['Widget', '类型', '职责', '备注'], context.recommendations.widgetBreakdown.map((widget) => [
    widget.name,
    widget.type,
    widget.responsibility,
    widget.suggestedFlutterWidget ?? widget.notes ?? '',
  ])));
  lines.push('');

  if (source.sfc?.components.length) {
    lines.push('### 语义组件实现矩阵');
    lines.push(markdownTable(['组件', '角色', '数据线索', '交互线索', '布局线索', '证据'], source.sfc.components.map((component) => [
      component.name,
      component.role,
      component.dataHints.join(', ') || '待确认',
      component.interactionHints.join('<br>') || '无直接交互',
      component.layoutHints.join('<br>') || '按父布局确认',
      component.evidence,
    ])));
    lines.push('');
  }

  lines.push('## 五、状态与交互');
  if (source.sfc?.state.length) {
    lines.push('### 状态模型');
    lines.push(markdownTable(['名称', '类型', '分类', '迁移建议', '证据'], source.sfc.state.map((state) => [
      state.name,
      state.kind,
      state.category,
      state.migrationHint,
      state.evidence,
    ])));
    lines.push('');
  }
  if (source.sfc?.lifecycle.length) {
    lines.push('### 生命周期与副作用');
    lines.push(markdownTable(['Hook/副作用', '目标', '迁移建议', '证据'], source.sfc.lifecycle.map((item) => [
      item.hook,
      item.target ?? '待确认',
      item.migrationHint,
      item.evidence,
    ])));
    lines.push('');
  }
  lines.push('### 交互事件');
  lines.push(markdownTable(['原型状态/事件', 'Flutter 建议', '备注'], inferInteractionRows(context)));
  lines.push('');

  lines.push('## 六、路由与参数');
  lines.push(markdownTable(['原型 route/query', 'Flutter GetX 建议'], [
    [
      source.route ?? '待确认',
      context.target.routesFiles.length > 0
        ? `在 ${context.target.routesFiles.join(', ')} 中补充或复用路由`
        : '确认 YouFi 路由文件位置后接入',
    ],
  ]));
  if (source.sfc?.routes.length) {
    lines.push('');
    lines.push('### Vue 路由行为');
    lines.push(markdownTable(['行为', '目标/参数', 'Flutter 迁移建议', '证据'], source.sfc.routes.map((route) => [
      route.action,
      [route.target, route.params].filter(Boolean).join(' / ') || '待确认',
      route.migrationHint,
      route.evidence,
    ])));
  }
  lines.push('');

  if (source.sfc?.layout.length) {
    lines.push('## 七、布局模型');
    lines.push(markdownTable(['选择器', '布局特征', 'Flutter 迁移建议', '证据'], source.sfc.layout.map((layout) => [
      layout.selector,
      layout.kind,
      layout.migrationHint,
      layout.evidence,
    ])));
    lines.push('');
  }

  lines.push('## 八、主题 Token 映射');
  if (source.sfc?.styleTokens.length) {
    lines.push('### Vue Token 使用位置');
    lines.push(markdownTable(['选择器', '属性', 'Token/硬编码值', 'fallback', '证据'], source.sfc.styleTokens.map((token) => [
      token.selector,
      token.property,
      token.token,
      token.fallback ?? '',
      token.evidence,
    ])));
    lines.push('');
  }
  lines.push('### Colors');
  lines.push(tokenTable(context.tokenMap.colors));
  lines.push('');
  lines.push('### Typography');
  lines.push(tokenTable(context.tokenMap.typography));
  lines.push('');
  if (context.tokenMap.unresolved.length > 0) {
    lines.push('### Unresolved');
    lines.push(tokenTable(context.tokenMap.unresolved));
    lines.push('');
  }

  lines.push('## 九、文案与 i18n');
  lines.push(i18nTable(context.source.i18n));
  lines.push('');

  lines.push('## 十、资源迁移');
  lines.push(assetTable(context));
  lines.push('');

  lines.push('## 十一、可复用 Flutter 组件');
  lines.push(markdownTable(['场景', '推荐组件'], context.target.reusableWidgets.map((widget) => ['通用能力', widget])));
  lines.push('');

  lines.push('## 原型 Notes');
  lines.push(source.notes ? source.notes.trim() : '未找到 notes 文档，需人工补充页面业务说明。');
  lines.push('');

  lines.push('## Capture');
  lines.push(`- screenshot：${context.capture?.screenshotPath ? relativeOrAbsolute(process.cwd(), context.capture.screenshotPath) : '未生成'}`);
  lines.push(`- dom-snapshot：${context.capture?.domSnapshotPath ? relativeOrAbsolute(process.cwd(), context.capture.domSnapshotPath) : '未生成'}`);
  lines.push('');

  lines.push('## 十二、人工确认项');
  for (const question of context.recommendations.manualQuestions) {
    lines.push(`- [ ] ${question}`);
  }
  for (const checklist of context.recommendations.implementationPlan.checklist) {
    lines.push(`- [ ] ${checklist.priority}：${checklist.item}`);
  }
  lines.push('');

  lines.push('## 十三、AI 实现提示词');
  lines.push('```text');
  lines.push(`请基于本文档在 YouFi Flutter App 中实现 ${title} 页面。`);
  lines.push(`目标模块优先放在 lib/app/modules/${context.target.suggestedModule ?? '<待确认模块>'}。`);
  lines.push('实现时优先复用本文档列出的 common widgets、themeService.colors、themeService.textStyles 和现有翻译体系。');
  lines.push('不要直译 Vue DOM；请按 Flutter 页面、Controller、私有 Widget、i18n、资源几个部分拆分实现。');
  lines.push('```');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function inferComplexity(context: MigrationContext): string {
  const source = context.source.sourceCode ?? '';
  const interactionCount = context.source.sfc?.interactions.length ?? (source.match(/@click|v-model|ref\(|reactive\(|computed\(/g) ?? []).length;
  const semanticWeight =
    (context.source.sfc?.state.length ?? 0) +
    (context.source.sfc?.routes.length ?? 0) +
    (context.source.sfc?.lifecycle.length ?? 0) +
    (context.source.sfc?.layout.filter((item) => ['fixed', 'sticky', 'scroll'].includes(item.kind)).length ?? 0);
  if (interactionCount > 8 || context.recommendations.widgetBreakdown.length >= 8 || semanticWeight > 20) return '高';
  if (interactionCount > 2 || context.recommendations.widgetBreakdown.length >= 4 || semanticWeight > 8) return '中';
  return '低';
}

function inferInteractionRows(context: MigrationContext): string[][] {
  const sfcInteractions = context.source.sfc?.interactions ?? [];
  if (sfcInteractions.length > 0) {
    return sfcInteractions.slice(0, 20).map((interaction) => [
      interaction.evidence,
      suggestInteractionMigration(interaction.kind),
      interaction.target ?? '',
    ]);
  }

  const rows: string[][] = [];
  const source = context.source.sourceCode ?? '';

  if (/@click/.test(source)) {
    rows.push(['@click 事件', '放入 Controller 方法或 Widget callback', '需要确认是否涉及接口、弹窗或路由跳转']);
  }
  if (/v-model/.test(source)) {
    rows.push(['v-model 表单状态', '使用 TextEditingController / Rx 字段管理', '注意输入校验和焦点状态']);
  }
  if (/\b(ref|reactive|computed)\s*\(/.test(source)) {
    rows.push(['Vue reactive/computed 状态', '迁移为 GetX Controller 状态和 getter', '避免把 mock 状态写死在 Widget']);
  }

  return rows.length > 0 ? rows : [['待确认', '阅读 Vue script 和 notes 后补充', 'Phase 1 未做完整交互语义分析']];
}

function suggestInteractionMigration(kind: string): string {
  if (kind === 'click') return '迁移为 Controller 方法或 Widget callback，并确认路由/弹窗/埋点。';
  if (kind === 'model') return '迁移为 TextEditingController、Rx 字段或表单状态。';
  if (kind === 'conditional') return '迁移为 Obx/Visibility/条件渲染，确认默认状态。';
  if (kind === 'loop') return '迁移为 ListView/Column map，确认数据模型和空态。';
  if (kind === 'state') return '迁移为 Controller 中的 Rx/普通字段，避免写死 mock。';
  if (kind === 'computed') return '迁移为 Controller getter 或派生状态。';
  if (kind === 'watch') return '迁移为状态监听、生命周期或 worker。';
  return '阅读 Vue template/script 后补充。';
}

function tokenTable(mappings: TokenMapping[]): string {
  if (mappings.length === 0) return '暂无命中。';
  return markdownTable(['原型样式', 'Flutter 写法', '命中情况'], mappings.map((mapping) => [
    mapping.source,
    mapping.target ?? '待确认',
    `${mapping.confidence}${mapping.reason ? `：${mapping.reason}` : ''}`,
  ]));
}

function assetTable(context: MigrationContext): string {
  const assets = context.source.sfc?.assets ?? [];
  if (assets.length === 0) {
    return markdownTable(['资源', '原型路径/选择器', 'Flutter 建议路径', '迁移建议'], [
      [
        '待从 Vue template/style 中人工确认',
        context.source.vueRelativePath ?? context.source.vuePath,
        context.target.assetDirectories.join(', ') || 'assets/images',
        '如存在 dark_images 等价资源则同步补齐',
      ],
    ]);
  }

  return markdownTable(['类型', '原型资源/选择器', 'Flutter 建议路径', '迁移建议', '证据'], assets.map((asset) => [
    asset.kind,
    asset.source ?? asset.selector ?? 'inline / class based',
    context.target.assetDirectories.join(', ') || 'assets/images',
    asset.migrationHint,
    asset.evidence,
  ]));
}

function i18nTable(i18n: Record<string, unknown> | undefined): string {
  if (!i18n) return '未找到 i18n JSON。';

  const locales = ['zh_CN', 'zh_HK', 'en_US'];
  const localeMaps = Object.fromEntries(
    locales.map((locale) => [locale, isRecord(i18n[locale]) ? (i18n[locale] as Record<string, unknown>) : {}]),
  ) as Record<string, Record<string, unknown>>;
  const keys = [
    ...new Set(locales.flatMap((locale) => Object.keys(localeMaps[locale] ?? {}))),
  ].slice(0, 120);

  if (keys.length === 0) return 'i18n JSON 未识别出 zh_CN / zh_HK / en_US 文案。';

  return markdownTable(
    ['key', 'zh_CN', 'zh_HK', 'en_US', 'Flutter 建议'],
    keys.map((key) => [
      key,
      stringifyCell(localeMaps.zh_CN?.[key]),
      stringifyCell(localeMaps.zh_HK?.[key]),
      stringifyCell(localeMaps.en_US?.[key]),
      `'${key}'.tr`,
    ]),
  );
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escapedRows = rows.length > 0 ? rows : [headers.map(() => '')];
  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...escapedRows.map((row) => `| ${headers.map((_, index) => escapeCell(row[index] ?? '')).join(' | ')} |`),
  ].join('\n');
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function stringifyCell(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return '';
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
