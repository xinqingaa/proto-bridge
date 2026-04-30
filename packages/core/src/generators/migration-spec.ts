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
  lines.push(`- 建议是否直接实现：${context.recommendations.risks.length <= 2 ? '可以进入实现' : '先确认风险后实现'}`);
  lines.push(`- 主要风险：${context.recommendations.risks[0] ?? '暂无明显阻塞'}`);
  lines.push('');

  lines.push('## 二、页面结构拆分');
  for (const widget of context.recommendations.widgetBreakdown) {
    lines.push(`- ${widget.name}：${widget.responsibility}`);
  }
  lines.push('');

  lines.push('## 三、Flutter Widget 拆分建议');
  lines.push(markdownTable(['Widget', '类型', '职责', '备注'], context.recommendations.widgetBreakdown.map((widget) => [
    widget.name,
    widget.type,
    widget.responsibility,
    widget.suggestedFlutterWidget ?? widget.notes ?? '',
  ])));
  lines.push('');

  lines.push('## 四、状态与交互');
  lines.push(markdownTable(['原型状态/事件', 'Flutter 建议', '备注'], inferInteractionRows(context)));
  lines.push('');

  lines.push('## 五、路由与参数');
  lines.push(markdownTable(['原型 route/query', 'Flutter GetX 建议'], [
    [
      source.route ?? '待确认',
      context.target.routesFiles.length > 0
        ? `在 ${context.target.routesFiles.join(', ')} 中补充或复用路由`
        : '确认 YouFi 路由文件位置后接入',
    ],
  ]));
  lines.push('');

  lines.push('## 六、主题 Token 映射');
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

  lines.push('## 七、文案与 i18n');
  lines.push(i18nTable(context.source.i18n));
  lines.push('');

  lines.push('## 八、资源迁移');
  lines.push(markdownTable(['资源', '原型路径', 'Flutter 建议路径', '暗色模式'], [
    [
      '待从 Vue template/style 中人工确认',
      source.vueRelativePath ?? source.vuePath,
      context.target.assetDirectories.join(', ') || 'assets/images',
      '如存在 dark_images 等价资源则同步补齐',
    ],
  ]));
  lines.push('');

  lines.push('## 九、可复用 Flutter 组件');
  lines.push(markdownTable(['场景', '推荐组件'], context.target.reusableWidgets.map((widget) => ['通用能力', widget])));
  lines.push('');

  lines.push('## 原型 Notes');
  lines.push(source.notes ? source.notes.trim() : '未找到 notes 文档，需人工补充页面业务说明。');
  lines.push('');

  lines.push('## Capture');
  lines.push(`- screenshot：${context.capture?.screenshotPath ? relativeOrAbsolute(process.cwd(), context.capture.screenshotPath) : '未生成'}`);
  lines.push(`- dom-snapshot：${context.capture?.domSnapshotPath ? relativeOrAbsolute(process.cwd(), context.capture.domSnapshotPath) : '未生成'}`);
  lines.push('');

  lines.push('## 十、人工确认项');
  for (const question of context.recommendations.manualQuestions) {
    lines.push(`- [ ] ${question}`);
  }
  lines.push('');

  lines.push('## 十一、AI 实现提示词');
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
  const interactionCount = (source.match(/@click|v-model|ref\(|reactive\(|computed\(/g) ?? []).length;
  if (interactionCount > 8 || context.recommendations.widgetBreakdown.length >= 5) return '高';
  if (interactionCount > 2 || context.recommendations.widgetBreakdown.length >= 4) return '中';
  return '低';
}

function inferInteractionRows(context: MigrationContext): string[][] {
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

function tokenTable(mappings: TokenMapping[]): string {
  if (mappings.length === 0) return '暂无命中。';
  return markdownTable(['原型样式', 'Flutter 写法', '命中情况'], mappings.map((mapping) => [
    mapping.source,
    mapping.target ?? '待确认',
    `${mapping.confidence}${mapping.reason ? `：${mapping.reason}` : ''}`,
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
