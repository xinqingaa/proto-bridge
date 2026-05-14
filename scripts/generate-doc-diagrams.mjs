import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'docs/assets/diagrams');
const width = 1600;
const height = 960;

const colors = {
  bg: '#08111f',
  panel: '#101b2e',
  panel2: '#0c1728',
  stroke: '#2b4164',
  muted: '#8fa3bd',
  text: '#edf5ff',
  title: '#ffffff',
  blue: '#4f8cff',
  cyan: '#36d1dc',
  green: '#62d394',
  amber: '#f4b860',
  red: '#f07178',
};

const diagrams = [
  ['01-delivery-upgrade', deliveryUpgrade()],
  ['02-capability-architecture', capabilityArchitecture()],
  ['03-input-selection', inputSelection()],
  ['04-artifact-loop', artifactLoop()],
];

await mkdir(outDir, { recursive: true });

for (const [slug, svg] of diagrams) {
  await writeFile(path.join(outDir, `${slug}.svg`), svg, 'utf8');
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
for (const [slug, svg] of diagrams) {
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body { margin: 0; width: ${width}px; height: ${height}px; background: ${colors.bg}; }
          svg { display: block; width: ${width}px; height: ${height}px; }
        </style>
      </head>
      <body>${svg}</body>
    </html>
  `);
  await page.screenshot({ path: path.join(outDir, `${slug}.png`), type: 'png' });
}
await browser.close();

console.log(`Generated ${diagrams.length} diagrams in ${outDir}`);

function deliveryUpgrade() {
  const oldSteps = [
    ['产品 PRD', '需求和业务说明'],
    ['Figma 静态稿', '静态视觉与布局'],
    ['各端自行理解', '交互和状态靠补充解释'],
    ['联调 / UI 走查', '事后发现偏差并返工'],
  ];
  const newSteps = [
    ['交互原型平台', '产品 / UI + AI 生成可运行页面'],
    ['源码与运行态证据', '结构、状态、token、bbox、截图'],
    ['ProtoBridge 编排', '合并 evidence 与 target conventions'],
    ['可验证实现', 'plan / review / validation 闭环'],
  ];
  const x0 = 245;
  const yOld = 260;
  const yNew = 560;
  const cardW = 260;
  const gap = 80;
  const step = cardW + gap;
  return frame({
    title: '交付链路升级',
    subtitle: '从静态设计稿和人工走查，升级为交互原型、源码证据、AI 编排和可验证产物',
    body: `
      ${sideTag(105, yOld + 18, '传统链路', colors.amber)}
      ${sideTag(105, yNew + 18, '目标链路', colors.cyan)}
      ${oldSteps.map((item, i) => card(x0 + i * step, yOld, cardW, 128, item[0], item[1], colors.amber)).join('')}
      ${stepArrows(x0, yOld, oldSteps.length, cardW, gap)}
      ${newSteps.map((item, i) => card(x0 + i * step, yNew, cardW, 128, item[0], item[1], i === 2 ? colors.blue : colors.cyan)).join('')}
      ${stepArrows(x0, yNew, newSteps.length, cardW, gap)}
      ${pill(480, 430, 640, 70, ['核心变化：交互和证据前置', 'UI 走查从兜底变成确认'], colors.green)}
    `,
  });
}

function capabilityArchitecture() {
  return frame({
    title: 'Capability-first 架构',
    subtitle: 'CLI、MCP 和 Core API 只是入口，底层能力沉淀在共享 capabilities',
    body: `
      ${card(150, 250, 260, 118, 'CLI', '终端入口 / 批处理', colors.blue)}
      ${card(475, 250, 260, 118, 'MCP', 'agent / tool 调用入口', colors.cyan)}
      ${card(800, 250, 260, 118, 'Core API', '嵌入式调用入口', colors.green)}
      ${arrow(410, 309, 465, 309)}
      ${arrow(735, 309, 790, 309)}
      ${arrow(1060, 309, 1135, 309)}
      ${pill(1145, 270, 300, 78, ['reconstruct', 'PageContext'], colors.blue)}
      ${arrow(1295, 348, 1295, 455)}
      ${cluster(145, 455, 1310, 260, '共享 Capabilities', [
        ['source.analyze', 205, 540, colors.blue],
        ['runtime.capture', 465, 540, colors.cyan],
        ['screenshot.attach', 725, 540, colors.green],
        ['target.inspect', 985, 540, colors.amber],
        ['page.merge', 285, 642, colors.blue],
        ['ui.plan', 545, 642, colors.cyan],
        ['ui.review', 805, 642, colors.green],
        ['ui.validate', 1065, 642, colors.red],
      ])}
      ${arrow(800, 716, 800, 790)}
      ${pill(505, 790, 590, 78, ['统一页面上下文', '实现产物与验证结果'], colors.cyan)}
    `,
  });
}

function inputSelection() {
  const rows = [
    ['source + target', 'source.analyze', '结构 / 状态 / 交互 / token intent', colors.blue],
    ['URL + target', 'runtime.capture', '当前 DOM / bbox / computed style / screenshot', colors.cyan],
    ['source + URL + target', 'hybrid merge', '源码意图 + 运行时事实', colors.green],
    ['screenshot/OCR + target', 'screenshot.attach', '视觉和文字补证', colors.amber],
    ['target diff', 'ui.validate', '实现后变更范围和风险检查', colors.red],
  ];
  return frame({
    title: '输入组合与能力选择',
    subtitle: 'source 和 URL 都不是共同必填项，系统按可用证据选择能力',
    body: `
      ${rows.map((row, i) => decisionRow(135, 245 + i * 108, row)).join('')}
      ${pill(410, 805, 780, 70, ['原则：有多少证据就用多少证据', '不强制同时提供 source 和 URL'], colors.green)}
    `,
  });
}

function artifactLoop() {
  return frame({
    title: '产物与实现闭环',
    subtitle: '从 canonical context 到 plan/review，再到目标实现和 validation',
    body: `
      ${card(130, 360, 300, 130, 'page-canonical.json', '完整 facts、provenance、merge、trace', colors.blue)}
      ${card(500, 260, 310, 120, 'page-debug-index.json', '定位 section / node / style / risk', colors.cyan)}
      ${card(500, 500, 310, 120, 'ui-build-plan.json', 'file tree / widget tree / mappings', colors.green)}
      ${card(880, 380, 300, 120, 'ui-build-review.md', '人类可读实现交接', colors.amber)}
      ${card(1250, 300, 240, 120, 'Target 实现', 'Flutter 代码落地', colors.blue)}
      ${card(1250, 560, 240, 120, 'ui.validate', 'changed files / risks / hints', colors.red)}
      ${arrow(430, 410, 500, 320)}
      ${arrow(430, 440, 500, 560)}
      ${arrow(810, 560, 880, 440)}
      ${arrow(1180, 440, 1250, 360)}
      ${arrow(1370, 420, 1370, 560)}
      ${loopArrow(1250, 640, 430, 640, 430, 510)}
      <text x="505" y="674" class="small">validation 结果回到 review / 修正 / 再验证</text>
      ${pill(440, 755, 720, 78, ['目标：让 UI 走查从大规模人工兜底', '转向证据驱动的少量确认'], colors.green)}
    `,
  });
}

function frame({ title, subtitle, body }) {
  return svg(`
    <defs>
      <linearGradient id="bgGlow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#10294a"/>
        <stop offset="58%" stop-color="#08111f"/>
        <stop offset="100%" stop-color="#07101c"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${colors.blue}"/>
        <stop offset="100%" stop-color="${colors.cyan}"/>
      </linearGradient>
      <filter id="softShadow" x="-18%" y="-18%" width="136%" height="148%">
        <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.24"/>
      </filter>
      <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${colors.cyan}"/>
      </marker>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bgGlow)"/>
    <rect x="64" y="56" width="1472" height="848" rx="34" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.08)"/>
    <text x="100" y="126" class="title">${esc(title)}</text>
    <text x="102" y="166" class="subtitle">${esc(subtitle)}</text>
    <rect x="100" y="194" width="260" height="5" rx="3" fill="url(#accent)"/>
    ${body}
  `);
}

function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: 700 48px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.title}; letter-spacing: 0; }
    .subtitle { font: 400 24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.muted}; letter-spacing: 0; }
    .label { font: 700 24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.text}; letter-spacing: 0; }
    .body { font: 400 18px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.muted}; letter-spacing: 0; }
    .small { font: 400 18px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.muted}; letter-spacing: 0; }
    .mono { font: 600 17px "SFMono-Regular", Consolas, monospace; fill: ${colors.text}; letter-spacing: 0; }
  </style>
  ${content}
</svg>`;
}

function card(x, y, w, h, title, subtitle, accent) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${colors.panel}" stroke="${colors.stroke}"/>
      <rect x="${x}" y="${y}" width="${w}" height="5" rx="3" fill="${accent}"/>
      ${centerText(title, x + w / 2, y + 47, 'label')}
      ${subtitle ? wrapText(subtitle, x + 24, y + 82, w - 48, 22, 'body', 2) : ''}
    </g>
  `;
}

function pill(x, y, w, h, lines, accent) {
  const textLines = Array.isArray(lines) ? lines : [lines];
  const startY = y + h / 2 - ((textLines.length - 1) * 13) + 8;
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(30, h / 2)}" fill="${colors.panel2}" stroke="${accent}" stroke-opacity="0.8"/>
      ${textLines.map((line, i) => centerText(line, x + w / 2, startY + i * 26, 'label')).join('')}
    </g>
  `;
}

function sideTag(x, y, text, accent) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="112" height="128" rx="18" fill="rgba(16,27,46,0.56)" stroke="${colors.stroke}"/>
      <rect x="${x}" y="${y}" width="7" height="128" rx="4" fill="${accent}"/>
      ${centerText(text, x + 60, y + 72, 'label')}
    </g>
  `;
}

function cluster(x, y, w, h, title, items) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="rgba(16,27,46,0.82)" stroke="${colors.stroke}"/>
      <text x="${x + 34}" y="${y + 48}" class="label">${esc(title)}</text>
      ${items.map(([name, ix, iy, color]) => mini(ix, iy, name, color)).join('')}
    </g>
  `;
}

function mini(x, y, text, accent) {
  return `
    <rect x="${x}" y="${y}" width="215" height="54" rx="14" fill="${colors.panel2}" stroke="${accent}" stroke-opacity="0.72"/>
    ${centerText(text, x + 107.5, y + 34, 'mono')}
  `;
}

function decisionRow(x, y, [input, capability, output, accent]) {
  const w1 = 310;
  const w2 = 340;
  const w3 = 510;
  const gap = 80;
  const x2 = x + w1 + gap;
  const x3 = x2 + w2 + gap;
  return `
    ${card(x, y, w1, 78, input, '', accent)}
    ${arrow(x + w1 + 14, y + 39, x2 - 20, y + 39)}
    ${card(x2, y, w2, 78, capability, '', accent)}
    ${arrow(x2 + w2 + 14, y + 39, x3 - 20, y + 39)}
    ${card(x3, y, w3, 78, output, '', accent)}
  `;
}

function stepArrows(x0, y, count, cardW, gap) {
  let out = '';
  for (let i = 0; i < count - 1; i += 1) {
    const start = x0 + i * (cardW + gap) + cardW + 16;
    const end = x0 + (i + 1) * (cardW + gap) - 22;
    out += arrow(start, y + 64, end, y + 64);
  }
  return out;
}

function arrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors.cyan}" stroke-width="3" stroke-opacity="0.78" marker-end="url(#arrow)"/>`;
}

function loopArrow(x1, y1, x2, y2, x3, y3) {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}" fill="none" stroke="${colors.cyan}" stroke-width="3" stroke-opacity="0.68" marker-end="url(#arrow)"/>`;
}

function centerText(text, x, y, className) {
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${className}">${esc(text)}</text>`;
}

function wrapText(text, x, y, widthPx, lineHeight, className, maxLines) {
  const charsPerLine = Math.max(8, Math.floor(widthPx / 17));
  const chunks = [];
  let line = '';
  for (const char of Array.from(text)) {
    const next = `${line}${char}`;
    if (next.length > charsPerLine && line) {
      chunks.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) chunks.push(line);
  return chunks.slice(0, maxLines).map((chunk, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${esc(chunk)}</text>`,
  ).join('');
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
