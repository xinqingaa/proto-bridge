import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

// Documentation inventory only. It neither promotes draft CSS nor resolves themes.
const draft = new URL('../../../drafts/yike/styles/', import.meta.url);
const destination = new URL('../docs/draft-extraction.md', import.meta.url);
const names = (await readdir(draft)).filter(name => /\.(css|vue|ts)$/.test(name)).sort();
const sources = new Map(await Promise.all(names.map(async name => [name, await readFile(new URL(name, draft), 'utf8')])));
const css = postcss.parse(sources.get('styles.css'), { from: fileURLToPath(new URL('styles.css', draft)) });
const themes = ['mechanical', 'water', 'sundial'];
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const lines = [
  '# 草稿资源原始提取（生成）', '',
  '> 由 `node apps/pbwork/src/prototypes/yike/scripts/extract-draft-resources.mjs` 生成；加 `--check` 校验新鲜度。不要手工编辑。', '',
  '本文件保留草稿事实，不是正式 Token 表、完成记录或 Evidence。映射与组件归属见 [resources.md](./resources.md)，当前验收见 [implementation.md](./implementation.md)。', '',
  '范围：批准的 `drafts/yike/styles/`。包含浅深主题变量、CSS 中含数字的声明（含设备壳与工具样式，必须甄别）、模板动态样式/SVG 位置与展示状态。JS 几何、SVG 路径和最终浏览器合成效果仍需人工审阅；不会自动认定为可提升 Token。', '',
  '## 来源指纹', '', '| 文件 | SHA-256 |', '| --- | --- |',
  ...[...sources].map(([name, source]) => `| [${name}](../../../drafts/yike/styles/${name}) | \`${createHash('sha256').update(source).digest('hex')}\` |`), '',
  '## 主题变量', '',
  '深色未重新声明的变量继承该主题浅色块。下表只展开这一显式覆盖关系，不模拟浏览器级联；字体公共声明另列。', '',
];
for (const theme of themes) {
  const modes = [{}, {}];
  css.walkRules(rule => {
    const index = rule.selector === `.ys-${theme}` ? 0 : rule.selector === `.ys-${theme}.is-dark` ? 1 : -1;
    if (index < 0) return;
    rule.walkDecls(decl => { if (decl.prop.startsWith('--')) modes[index][decl.prop] = { value: decl.value, line: decl.source.start.line }; });
  });
  if (!Object.keys(modes[0]).length || !Object.keys(modes[1]).length) throw new Error(`Missing draft theme: ${theme}`);
  lines.push(`### ${theme}`, '', '| 变量 | 浅色原值 | 深色原值 | CSS 行（浅 / 深） |', '| --- | --- | --- | --- |');
  for (const key of new Set([...Object.keys(modes[0]), ...Object.keys(modes[1])])) {
    const light = modes[0][key];
    const dark = modes[1][key] ?? light;
    lines.push(`| \`${key}\` | \`${cell(light?.value ?? '未声明')}\` | \`${cell(dark?.value ?? '未声明')}\` | ${light?.line ?? '—'} / ${modes[1][key]?.line ?? '继承浅色'} |`);
  }
  lines.push('');
}
lines.push('## 公共变量', '', '| 选择器 | 变量 | 原值 | CSS 行 |', '| --- | --- | --- | --- |');
css.walkDecls(decl => {
  if (decl.prop.startsWith('--') && !themes.some(theme => [`.ys-${theme}`, `.ys-${theme}.is-dark`].includes(decl.parent.selector))) {
    lines.push(`| \`${cell(decl.parent.selector)}\` | \`${decl.prop}\` | \`${cell(decl.value)}\` | ${decl.source.start.line} |`);
  }
});
lines.push('', '## CSS 数值声明清单', '', '保留选择器与源行，包含字号、间距、圆角、描边、阴影、比例、动效和绘制值；相同属性和值合并列出位置。此清单也包含布局语法数字，不能全量抄入主题包。', '', '| 属性 | 原值 | 选择器与 CSS 行 |', '| --- | --- | --- |');
const values = new Map();
css.walkDecls(decl => {
  if (decl.prop.startsWith('--') || !/\d/.test(decl.value)) return;
  const key = `${decl.prop}\0${decl.value}`;
  if (!values.has(key)) values.set(key, { prop: decl.prop, value: decl.value, origins: [] });
  const contexts = [];
  for (let parent = decl.parent.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule') contexts.unshift(`@${parent.name} ${parent.params}`);
  }
  values.get(key).origins.push(`${contexts.length ? `${contexts.join(' → ')} → ` : ''}${decl.parent.selector ?? decl.parent.name}:${decl.source.start.line}`);
});
for (const entry of values.values()) lines.push(`| \`${cell(entry.prop)}\` | \`${cell(entry.value)}\` | ${entry.origins.map(origin => `\`${cell(origin)}\``).join('；')} |`);
lines.push('', '## 动态样式与 SVG 人工审阅入口', '', '| 文件 | 行 | 源码 |', '| --- | --- | --- |');
for (const [name, source] of sources) {
  if (!name.endsWith('.vue')) continue;
  source.split('\n').forEach((line, index) => {
    if (/:style=|\bstyle=|<svg\b|viewBox=/.test(line)) lines.push(`| ${name} | ${index + 1} | \`${cell(line.trim())}\` |`);
  });
}
const states = [...sources.get('gallery.ts').matchAll(/\{ page: "([^"]+)", state: "([^"]+)", label: "([^"]+)" \}/g)];
if (!states.length) throw new Error('No gallery states found; review gallery format before regenerating.');
lines.push('', '## 草稿展示状态', '', `共 ${states.length} 个状态，按三套主题、浅深模式复用。展示状态不等于正式 Runtime Variant 或 Case。`, '', '| 页面 | 草稿状态 | 名称 |', '| --- | --- | --- |');
for (const [, page, state, label] of states) lines.push(`| ${page} | ${state} | ${label} |`);
const output = `${lines.join('\n')}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== output) throw new Error('draft-extraction.md is stale; rerun extraction.');
  console.log(`Yike draft extraction is current: ${states.length} states, ${values.size} CSS property/value groups.`);
} else {
  await writeFile(destination, output);
  console.log(`Extracted ${themes.length} themes, ${states.length} states and ${values.size} CSS property/value groups.`);
}
