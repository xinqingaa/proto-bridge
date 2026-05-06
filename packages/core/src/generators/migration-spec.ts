import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  GenerateMigrationSpecInput,
  GenerateMigrationSpecResult,
  MigrationContext,
  TokenMapping,
} from '../types/index.js';
import { createMigrationContext } from './migration-context.js';
import { writeJsonFile, writeTextFile } from '../utils/path.js';

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
  lines.push(`- 目标路由来源：${source.route ?? '待确认'}`);
  lines.push(`- screenId：${source.screenId ?? '待确认'}`);
  lines.push(`- 推荐 Flutter 模块：${context.target.suggestedModule ?? '待确认'}`);
  lines.push(`- 推荐实现形态：${context.recommendations.implementationShape}`);
  lines.push(`- 需求状态：${source.status ?? '待确认'}`);
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
  lines.push(markdownTable(['关注点', '建议 owner', '建议'], context.recommendations.implementationPlan.stateStrategy.map((strategy) => [
    strategy.concern,
    strategy.owner,
    strategy.recommendation,
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
  for (const widget of context.recommendations.implementationPlan.widgetTree) {
    lines.push(`- ${widget.name}：${widget.role}；${widget.buildHint}`);
  }
  lines.push('');

  lines.push('## 四、Flutter Widget 拆分建议');
  lines.push(markdownTable(['Widget', '父级', '职责', '状态访问'], context.recommendations.implementationPlan.widgetTree.map((widget) => [
    widget.name,
    widget.parent ?? 'root',
    widget.buildHint,
    widget.stateAccess,
  ])));
  lines.push('');

  lines.push('## 五、状态与交互');
  if (source.sfc?.state.length) {
    lines.push('### 状态模型');
    lines.push(markdownTable(['状态/能力', '分类', 'Flutter owner 建议', '迁移建议'], source.sfc.state.map((state) => [
      state.name,
      state.category,
      ownerForStateCategory(state.category),
      state.migrationHint,
    ])));
    lines.push('');
  }
  if (source.sfc?.lifecycle.length) {
    lines.push('### 生命周期与副作用');
    lines.push(markdownTable(['副作用类型', '目标', '迁移建议'], source.sfc.lifecycle.map((item) => [
      lifecycleLabel(item.hook),
      item.target ?? '待确认',
      item.migrationHint,
    ])));
    lines.push('');
  }
  lines.push('### 交互事件');
  lines.push(markdownTable(['交互类型', 'Flutter 建议', '目标状态/动作'], inferInteractionRows(context)));
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
    lines.push('### 页面路由行为');
    lines.push(markdownTable(['行为', '目标/参数', 'Flutter 迁移建议'], source.sfc.routes.map((route) => [
      routeActionLabel(route.action),
      [route.target, route.params].filter(Boolean).join(' / ') || '待确认',
      route.migrationHint,
    ])));
  }
  lines.push('');

  if (source.sfc?.layout.length) {
    lines.push('## 七、布局模型');
    lines.push(markdownTable(['布局特征', 'Flutter 迁移建议'], compactLayoutRows(context)));
    lines.push('');
  }

  lines.push('## 八、主题 Token 映射');
  if (source.sfc?.styleTokens.length) {
    lines.push('### 样式 Token 使用位置');
    lines.push(markdownTable(['样式属性', 'Token/硬编码值', 'fallback'], source.sfc.styleTokens.map((token) => [
      token.property,
      token.token,
      token.fallback ?? '',
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
  lines.push('请按 Flutter 页面、Controller、私有 Widget、i18n、资源几个部分拆分实现；不要逐层照搬来源页面结构。');
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
      interactionLabel(interaction.kind),
      suggestInteractionMigration(interaction.kind),
      interactionTargetLabel(interaction.target ?? ''),
    ]);
  }

  return [['待确认', '根据业务需求补充 callback、表单状态或导航行为。', '待确认']];
}

function ownerForStateCategory(category: string): string {
  if (category === 'ui-state') return 'Controller 或局部 StatefulWidget';
  if (category === 'mock-data') return 'Repository / UI model';
  if (category === 'chart-data') return 'Adapter / Service';
  if (category === 'navigation') return 'Controller';
  if (category === 'handler') return 'Controller callback';
  if (category === 'derived-data') return 'Controller getter / Adapter';
  return '人工确认';
}

function lifecycleLabel(hook: string): string {
  if (hook === 'onMounted') return '页面初始化';
  if (hook === 'onBeforeUnmount') return '页面销毁清理';
  if (hook === 'event-listener') return '事件监听';
  if (hook === 'watch') return '状态监听';
  return '副作用';
}

function routeActionLabel(action: string): string {
  if (action === 'navigate') return '页面跳转';
  if (action === 'back') return '返回上一页';
  if (action === 'read-query') return '读取路由参数';
  return '路由行为';
}

function compactLayoutRows(context: MigrationContext): string[][] {
  const grouped = new Map<string, string[]>();
  for (const item of context.source.sfc?.layout ?? []) {
    const label = layoutKindLabel(item.kind);
    const values = grouped.get(label) ?? [];
    values.push(item.migrationHint);
    grouped.set(label, values);
  }
  return [...grouped.entries()].map(([kind, hints]) => [kind, [...new Set(hints)].slice(0, 3).join('<br>')]);
}

function layoutKindLabel(kind: string): string {
  if (kind === 'fixed') return '固定区域';
  if (kind === 'sticky') return '吸顶区域';
  if (kind === 'scroll') return '滚动容器';
  if (kind === 'safe-area') return '安全区适配';
  if (kind === 'z-index') return '层级遮挡';
  if (kind === 'absolute') return '叠层定位';
  if (kind === 'flex') return '弹性布局';
  if (kind === 'grid') return '网格布局';
  if (kind === 'spacing') return '间距系统';
  return '布局约束';
}

function interactionLabel(kind: string): string {
  if (kind === 'click') return '点击事件';
  if (kind === 'model') return '表单输入';
  if (kind === 'conditional') return '条件展示';
  if (kind === 'loop') return '列表渲染';
  if (kind === 'state') return '状态字段';
  if (kind === 'computed') return '派生状态';
  if (kind === 'watch') return '状态监听';
  return '交互';
}

function interactionTargetLabel(target: string): string {
  if (!target) return '待确认';
  if (/pushPage|toNamed|Navigator|route/i.test(target)) return '页面跳转';
  if (/history\.back|Get\.back|goBack|back/i.test(target)) return '返回上一页';
  if (/handleTrade|buy|sell/i.test(target)) return '交易操作';
  if (/option/i.test(target)) return '期权入口';
  if (/favorite/i.test(target)) return '收藏状态';
  const assignment = target.match(/^([a-zA-Z_$][\w$]*)\s*=/)?.[1];
  if (assignment) return assignment;
  const call = target.match(/^([a-zA-Z_$][\w$]*)\s*\(/)?.[1];
  if (call) return call;
  return sanitizeImplementationText(target);
}

function suggestInteractionMigration(kind: string): string {
  if (kind === 'click') return '迁移为 Controller 方法或 Widget callback，并确认路由/弹窗/埋点。';
  if (kind === 'model') return '迁移为 TextEditingController、Rx 字段或表单状态。';
  if (kind === 'conditional') return '迁移为 Obx/Visibility/条件渲染，确认默认状态。';
  if (kind === 'loop') return '迁移为 ListView/Column map，确认数据模型和空态。';
  if (kind === 'state') return '迁移为 Controller 中的 Rx/普通字段，避免写死 mock。';
  if (kind === 'computed') return '迁移为 Controller getter、Adapter 输出或派生状态。';
  if (kind === 'watch') return '迁移为状态监听、生命周期或 worker。';
  return '根据 Flutter 页面结构和业务需求补充。';
}

function tokenTable(mappings: TokenMapping[]): string {
  if (mappings.length === 0) return '暂无命中。';
  return markdownTable(['样式来源', 'Flutter 写法', '命中情况'], mappings.map((mapping) => [
    mapping.source,
    mapping.target ?? '待确认',
    `${mapping.confidence}${mapping.reason ? `：${mapping.reason}` : ''}`,
  ]));
}

function assetTable(context: MigrationContext): string {
  const assets = context.source.sfc?.assets ?? [];
  if (assets.length === 0) {
    return markdownTable(['资源', 'Flutter 建议路径', '迁移建议'], [
      [
        '待确认资源清单',
        context.target.assetDirectories.join(', ') || 'assets/images',
        '如存在 dark_images 等价资源则同步补齐',
      ],
    ]);
  }

  return markdownTable(['类型', '资源线索', 'Flutter 建议路径', '迁移建议'], assets.map((asset) => [
    asset.kind,
    asset.source ? sanitizeImplementationText(asset.source) : asset.kind === 'inline-svg' ? '内联矢量图' : '图标/图片资源',
    context.target.assetDirectories.join(', ') || 'assets/images',
    sanitizeImplementationText(asset.migrationHint),
  ]));
}

function sanitizeImplementationText(value: string): string {
  return value
    .replace(/Vue\s*/gi, '')
    .replace(/DOM/gi, '页面结构')
    .replace(/@click=\"([^\"]+)\"/g, '$1')
    .replace(/v-if=\"([^\"]+)\"/g, '$1')
    .replace(/v-for=\"([^\"]+)\"/g, '$1')
    .replace(/v-model=\"([^\"]+)\"/g, '$1')
    .replace(/class=\"[^\"]+\"/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\b(ref|reactive|computed|watch)\b/g, (match) => {
      if (match === 'ref' || match === 'reactive') return 'state';
      if (match === 'computed') return 'derived state';
      return 'state listener';
    })
    .replace(/\s+/g, ' ')
    .trim();
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
