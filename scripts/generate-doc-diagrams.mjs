import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'docs/assets/diagrams');
const width = 1600;
const height = 960;

const colors = {
  page: '#f3f7fb',
  ink: '#152234',
  title: '#101827',
  body: '#516277',
  faint: '#73849a',
  white: '#ffffff',
  line: '#c8d7e8',
  blue: '#3d7cff',
  sky: '#20a8d8',
  teal: '#19b6a3',
  green: '#58b978',
  amber: '#f0a23a',
  coral: '#ee6d66',
  violet: '#7b6cff',
  slate: '#334155',
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
          html, body { margin: 0; width: ${width}px; height: ${height}px; background: ${colors.page}; }
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
    ['写需求', 'PRD 说明目标和规则'],
    ['画静态稿', 'Figma 展示视觉样子'],
    ['各端再理解', '交互、状态靠补充解释'],
    ['事后走查', '联调后发现偏差再修'],
  ];
  const newSteps = [
    ['做可运行原型', '产品、UI 和 AI 一起表达真实交互'],
    ['沉淀页面证据', '结构、状态、截图和样式都有来源'],
    ['整理实现交接', '把证据变成计划和说明'],
    ['实现后检查', '确认改动范围和常见风险'],
  ];

  return frame({
    title: '交付链路升级',
    subtitle: '把“靠理解和走查”变成“先准备证据，再实现和验证”',
    body: `
      ${band(110, 238, 1380, 188, '过去的交付方式', '信息到实现阶段才逐渐补齐', colors.amber, oldSteps)}
      ${dividerNote(330, 458, 940, '交互和证据提前准备好，UI 走查转为确认少数异常和冲突', colors.green)}
      ${band(110, 552, 1380, 206, '新的交付方式', '交互、证据和目标工程规范提前进入实现上下文', colors.teal, newSteps)}
    `,
  });
}

function capabilityArchitecture() {
  return frame({
    title: '同一套能力，服务不同入口',
    subtitle: '命令行、AI 工具和代码调用只是入口不同，真正处理页面的是共享能力',
    body: `
      ${softLabel(124, 222, 180, '使用入口', colors.blue)}
      ${portal(160, 266, 275, 112, '命令行', '本地生成和批量处理', colors.blue)}
      ${portal(500, 266, 275, 112, 'AI 工具', '让编码助手直接调用', colors.sky)}
      ${portal(840, 266, 275, 112, '代码接入', '嵌入其它自动化工具', colors.green)}
      ${mergeBus([
        [298, 378, colors.blue],
        [638, 378, colors.sky],
        [978, 378, colors.green],
      ], 638, 420, 638, 438, colors.violet)}
      ${hub(380, 438, 840, 72, '统一调用', '重建页面上下文', colors.violet)}
      ${arrow(800, 510, 800, 552, colors.violet, { width: 3, opacity: 0.62 })}

      ${softLabel(124, 506, 180, '共享处理', colors.teal)}
      ${cluster(160, 562, 1280, 220, '把页面材料变成可用证据', [
        ['读取原型源码', '看懂结构、状态和交互意图', colors.blue],
        ['抓取运行画面', '记录当前可见内容和截图', colors.sky],
        ['补充截图文字', '用截图和 OCR 补证', colors.green],
        ['读取客户端规范', '找到模块、组件和主题规则', colors.amber],
        ['合并页面证据', '保留来源和冲突提示', colors.violet],
        ['生成计划与说明', '给人和 AI 助手可执行交接', colors.teal],
      ])}

      ${arrow(800, 782, 800, 805, colors.teal, { width: 3, opacity: 0.68 })}
      ${outcome(425, 805, 750, 72, '输出结果', '页面事实、实现计划、交接说明和风险检查', colors.teal)}
    `,
  });
}

function inputSelection() {
  const rows = [
    ['有原型源码', '读取页面结构和交互意图', '适合先理解页面要表达什么', colors.blue],
    ['有运行中的页面', '抓取当前画面和可见状态', '适合核对真实渲染结果', colors.sky],
    ['源码和页面都有', '两边证据合并', '最完整，推荐用于正式重建', colors.teal],
    ['只有截图或文字识别', '作为视觉和文字补充', '能辅助核对，但不假装有完整源码', colors.amber],
    ['已经改了客户端', '检查改动范围和风险', '帮助实现后收尾验证', colors.coral],
  ];

  return frame({
    title: '手上有什么材料，就走哪条路',
    subtitle: '不强制同时提供源码和网页地址；证据越多，交接越完整',
    body: `
      ${columnHeader(145, 230, 310, '你现在有')}
      ${columnHeader(515, 230, 370, 'ProtoBridge 会做')}
      ${columnHeader(945, 230, 470, '得到什么帮助')}
      ${rows.map((row, index) => inputRow(145, 280 + index * 108, row)).join('')}
      ${compareCallout(385, 816, 830, 68, '选择原则', '能提供多少证据就用多少证据，不为跑工具而强行补材料', colors.green)}
    `,
  });
}

function artifactLoop() {
  const steps = [
    ['页面证据', '记录证据来源和冲突', 'page-canonical.json', colors.blue],
    ['快速定位', '按区块和文字查找', 'page-debug-index.json', colors.sky],
    ['实现计划', '拆文件、组件和复用', 'ui-build-plan.json', colors.green],
    ['交接说明', '形成自然语言任务', 'ui-build-review.md', colors.amber],
    ['客户端实现', '按计划落到目标工程', '', colors.violet],
    ['实现后检查', '检查改动范围和风险点', '', colors.coral],
  ];

  return frame({
    title: '从证据到实现，再回到检查',
    subtitle: '产物不是为了堆文件，而是让实现前、实现中、实现后都有依据',
    body: `
      ${linearLoop(80, 285, steps)}
      ${returnLaneFromStep(1431, 463, 1431, 620, 700, 620, 700, 482, colors.teal)}
      <text x="600" y="688" class="small">检查结果回到计划和交接说明，修正后再次验证</text>
      ${dividerNote(350, 778, 900, '最终目标：让 UI 走查从大规模人工兜底，转向证据驱动的少量确认', colors.green)}
    `,
  });
}

function frame({ title, subtitle, body }) {
  return svg(`
    <defs>
      <linearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fbff"/>
        <stop offset="55%" stop-color="#eef6fb"/>
        <stop offset="100%" stop-color="#f7f1ea"/>
      </linearGradient>
      <radialGradient id="washBlue" cx="16%" cy="12%" r="75%">
        <stop offset="0%" stop-color="#cfe7ff" stop-opacity="0.86"/>
        <stop offset="62%" stop-color="#eaf5ff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="washWarm" cx="85%" cy="88%" r="70%">
        <stop offset="0%" stop-color="#ffe5c2" stop-opacity="0.72"/>
        <stop offset="66%" stop-color="#fff2df" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <filter id="softShadow" x="-16%" y="-20%" width="132%" height="150%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#3c5873" flood-opacity="0.16"/>
      </filter>
      <filter id="lightBlur" x="-8%" y="-8%" width="116%" height="116%">
        <feGaussianBlur stdDeviation="18"/>
      </filter>
      <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${colors.teal}"/>
      </marker>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#pageBg)"/>
    <rect width="${width}" height="${height}" fill="url(#washBlue)"/>
    <rect width="${width}" height="${height}" fill="url(#washWarm)"/>
    <circle cx="1330" cy="170" r="150" fill="#dbeafe" opacity="0.34" filter="url(#lightBlur)"/>
    <circle cx="180" cy="800" r="170" fill="#dcfce7" opacity="0.24" filter="url(#lightBlur)"/>
    <rect x="54" y="46" width="1492" height="868" rx="38" fill="rgba(255,255,255,0.72)" stroke="rgba(114,132,154,0.24)"/>
    <text x="96" y="124" class="title">${esc(title)}</text>
    <text x="100" y="166" class="subtitle">${esc(subtitle)}</text>
    <rect x="100" y="194" width="290" height="6" rx="3" fill="${colors.blue}" opacity="0.92"/>
    <rect x="260" y="194" width="170" height="6" rx="3" fill="${colors.teal}" opacity="0.92"/>
    ${body}
  `);
}

function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: 760 48px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.title}; letter-spacing: 0; }
    .subtitle { font: 400 24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.body}; letter-spacing: 0; }
    .label { font: 720 25px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.ink}; letter-spacing: 0; }
    .body { font: 400 19px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.body}; letter-spacing: 0; }
    .small { font: 400 18px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.faint}; letter-spacing: 0; }
    .eyebrow { font: 700 18px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${colors.white}; letter-spacing: 0; }
    .mono { font: 600 15px "SFMono-Regular", Consolas, monospace; fill: ${colors.faint}; letter-spacing: 0; }
  </style>
  ${content}
</svg>`;
}

function band(x, y, w, h, title, note, accent, steps) {
  const cardW = 230;
  const gap = 45;
  const startX = x + 288;
  const cardY = y + 48;
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${tint(accent, 0.08)}" stroke="${tint(accent, 0.42)}"/>
      <rect x="${x}" y="${y}" width="12" height="${h}" rx="6" fill="${accent}" opacity="0.92"/>
      <text x="${x + 34}" y="${y + 62}" class="label">${esc(title)}</text>
      ${wrapText(note, x + 34, y + 98, 210, 24, 'body', 2)}
      ${steps.map(([stepTitle, detail], index) => stepCard(startX + index * (cardW + gap), cardY, cardW, 104, stepTitle, detail, accent, index + 1)).join('')}
      ${rangeArrows(startX, cardY, steps.length, cardW, gap, accent)}
    </g>
  `;
}

function stepCard(x, y, w, h, title, detail, accent, index) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="rgba(255,255,255,0.88)" stroke="${tint(accent, 0.52)}"/>
      <circle cx="${x + 31}" cy="${y + 31}" r="17" fill="${accent}" opacity="0.96"/>
      <text x="${x + 31}" y="${y + 38}" text-anchor="middle" class="eyebrow">${index}</text>
      <text x="${x + 60}" y="${y + 36}" class="label">${esc(title)}</text>
      ${wrapText(detail, x + 26, y + 74, w - 52, 24, 'body', 2)}
    </g>
  `;
}

function portal(x, y, w, h, title, detail, accent) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="rgba(255,255,255,0.9)" stroke="${tint(accent, 0.46)}"/>
      <rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${accent}" opacity="0.82"/>
      <text x="${x + 28}" y="${y + 55}" class="label">${esc(title)}</text>
      ${wrapText(detail, x + 28, y + 88, w - 56, 24, 'body', 2)}
    </g>
  `;
}

function cluster(x, y, w, h, title, items) {
  const cols = 3;
  const cardW = 358;
  const cardH = 62;
  const gapX = 54;
  const gapY = 22;
  const startX = x + 74;
  const startY = y + 70;
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="32" fill="rgba(255,255,255,0.76)" stroke="rgba(95,114,137,0.3)"/>
      <text x="${x + 34}" y="${y + 46}" class="label">${esc(title)}</text>
      ${items.map(([name, detail, accent], index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        return capabilityChip(startX + col * (cardW + gapX), startY + row * (cardH + gapY), cardW, cardH, name, detail, accent);
      }).join('')}
    </g>
  `;
}

function capabilityChip(x, y, w, h, title, detail, accent) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${tint(accent, 0.1)}" stroke="${tint(accent, 0.5)}"/>
      <circle cx="${x + 30}" cy="${y + h / 2}" r="10" fill="${accent}" opacity="0.9"/>
      <text x="${x + 52}" y="${y + 27}" class="label" style="font-size:20px">${esc(title)}</text>
      <text x="${x + 52}" y="${y + 51}" class="small">${esc(detail)}</text>
    </g>
  `;
}

function inputRow(x, y, [input, action, result, accent]) {
  const h = 80;
  return `
    ${plainCard(x, y, 310, h, input, '', accent, true)}
    ${arrow(x + 326, y + h / 2, x + 362, y + h / 2, accent)}
    ${plainCard(x + 370, y, 370, h, action, '', accent, false)}
    ${arrow(x + 758, y + h / 2, x + 794, y + h / 2, accent)}
    ${plainCard(x + 800, y, 470, h, result, '', accent, false)}
  `;
}

function columnHeader(x, y, w, text) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="38" rx="19" fill="rgba(255,255,255,0.64)" stroke="rgba(95,114,137,0.24)"/>
    <text x="${x + w / 2}" y="${y + 25}" text-anchor="middle" class="small" style="font-weight:700">${esc(text)}</text>
  `;
}

function plainCard(x, y, w, h, title, subtitle, accent, stronger) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${stronger ? tint(accent, 0.12) : 'rgba(255,255,255,0.9)'}" stroke="${tint(accent, 0.38)}"/>
      <rect x="${x + 14}" y="${y + 18}" width="7" height="${h - 36}" rx="4" fill="${accent}" opacity="0.86"/>
      <text x="${x + 38}" y="${y + 49}" class="label">${esc(title)}</text>
      ${subtitle ? wrapText(subtitle, x + 30, y + 76, w - 60, 22, 'body', 1) : ''}
    </g>
  `;
}

function artifactCard(x, y, w, h, title, detail, filename, accent) {
  const fileBadge = filename
    ? `
      <rect x="${x + 24}" y="${y + h - 38}" width="${Math.min(w - 48, filename.length * 8.2 + 28)}" height="26" rx="13" fill="${tint(accent, 0.09)}" stroke="${tint(accent, 0.32)}"/>
      <text x="${x + 38}" y="${y + h - 19}" class="mono">${esc(filename)}</text>
    `
    : '';
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="rgba(255,255,255,0.9)" stroke="${tint(accent, 0.52)}"/>
      <rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="${accent}" opacity="0.86"/>
      <text x="${x + 26}" y="${y + 50}" class="label">${esc(title)}</text>
      ${wrapText(detail, x + 26, y + 82, w - 52, 24, 'body', 2)}
      ${fileBadge}
    </g>
  `;
}

function outcome(x, y, w, h, title, detail, accent) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${tint(accent, 0.11)}" stroke="${tint(accent, 0.56)}"/>
      <text x="${x + 34}" y="${y + 37}" class="label">${esc(title)}</text>
      <text x="${x + 170}" y="${y + 37}" class="body">${esc(detail)}</text>
    </g>
  `;
}

function hub(x, y, w, h, title, detail, accent) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${tint(accent, 0.1)}" stroke="${tint(accent, 0.58)}"/>
      <text x="${x + 300}" y="${y + 45}" text-anchor="middle" class="label">${esc(title)}</text>
      <text x="${x + 450}" y="${y + 45}" class="body">${esc(detail)}</text>
    </g>
  `;
}

function pill(x, y, w, h, lines, accent) {
  const textLines = Array.isArray(lines) ? lines : [lines];
  const startY = y + h / 2 - ((textLines.length - 1) * 14) + 9;
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(30, h / 2)}" fill="${tint(accent, 0.1)}" stroke="${tint(accent, 0.58)}"/>
      ${textLines.map((line, i) => centerText(line, x + w / 2, startY + i * 28, 'label')).join('')}
    </g>
  `;
}

function compareCallout(x, y, w, h, label, text, accent) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(255,255,255,0.9)" stroke="${tint(accent, 0.5)}"/>
      <rect x="${x + 18}" y="${y + 17}" width="104" height="${h - 34}" rx="${(h - 34) / 2}" fill="${accent}" opacity="0.94"/>
      <text x="${x + 70}" y="${y + h / 2 + 8}" text-anchor="middle" class="eyebrow">${esc(label)}</text>
      <text x="${x + 150}" y="${y + h / 2 + 8}" class="label" style="font-size:23px">${esc(text)}</text>
    </g>
  `;
}

function dividerNote(x, y, w, text, accent) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="58" rx="29" fill="${tint(accent, 0.08)}" stroke="${tint(accent, 0.32)}"/>
      <circle cx="${x + 34}" cy="${y + 29}" r="10" fill="${accent}" opacity="0.86"/>
      <text x="${x + 58}" y="${y + 37}" class="label" style="font-size:22px">${esc(text)}</text>
    </g>
  `;
}

function softLabel(x, y, w, text, accent) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="42" rx="21" fill="${tint(accent, 0.1)}" stroke="${tint(accent, 0.42)}"/>
    <text x="${x + w / 2}" y="${y + 28}" text-anchor="middle" class="small" style="font-weight:740; fill:${accent}">${esc(text)}</text>
  `;
}

function arrow(x1, y1, x2, y2, accent = colors.teal, options = {}) {
  const id = `arrow-${hashColor(accent)}`;
  const width = options.width ?? 4;
  const opacity = options.opacity ?? 0.82;
  const markerSize = options.markerSize ?? 9;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="${markerSize}" markerHeight="${markerSize}" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-width="${width}" stroke-linecap="round" stroke-opacity="${opacity}" marker-end="url(#${id})"/>
  `;
}

function mergeBus(sources, busCenterX, busY, outX, outY, accent) {
  const id = `arrow-${hashColor(accent)}`;
  const minX = Math.min(...sources.map(([x]) => x));
  const maxX = Math.max(...sources.map(([x]) => x));
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <g>
      ${sources.map(([x, y, color]) => `
        <path d="M ${x} ${y} L ${x} ${busY}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.58"/>
      `).join('')}
      <path d="M ${minX} ${busY} L ${maxX} ${busY}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.46"/>
      <path d="M ${busCenterX} ${busY} L ${outX} ${outY}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-opacity="0.64" marker-end="url(#${id})"/>
    </g>
  `;
}

function busArrow(x1, y1, x2, y2, accent = colors.teal) {
  const id = `arrow-${hashColor(accent)}`;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <path d="M ${x1} ${y1} C ${x1 + 52} ${y1}, ${x2 - 92} ${y2}, ${x2 - 8} ${y2}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.68" marker-end="url(#${id})"/>
  `;
}

function elbowArrow(x1, y1, x2, y2, x3, y3, x4, y4, accent = colors.teal) {
  const id = `arrow-${hashColor(accent)}`;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <path d="M ${x1} ${y1} C ${x2} ${y2}, ${x3} ${y3}, ${x4} ${y4}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.72" marker-end="url(#${id})"/>
  `;
}

function loopArrow(x1, y1, x2, y2, x3, y3, accent = colors.teal) {
  const id = `arrow-${hashColor(accent)}`;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <path d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.72" marker-end="url(#${id})"/>
  `;
}

function returnLane(x1, y1, x2, y2, x3, y3, accent = colors.teal) {
  const id = `arrow-${hashColor(accent)}`;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <path d="M ${x2} ${y2} L ${x1} ${y1} L ${x3} ${y3}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10" stroke-opacity="0.54" marker-end="url(#${id})"/>
  `;
}

function returnLaneFromStep(x1, y1, x2, y2, x3, y3, x4, y4, accent = colors.teal) {
  const id = `arrow-${hashColor(accent)}`;
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${accent}"/>
      </marker>
    </defs>
    <path d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14 14" stroke-opacity="0.5" marker-end="url(#${id})"/>
  `;
}

function linearLoop(x, y, steps) {
  const cardW = 210;
  const cardH = 178;
  const gap = 36;
  const cards = steps.map(([title, detail, filename, accent], index) =>
    flowArtifactCard(x + index * (cardW + gap), y, cardW, cardH, index + 1, title, detail, filename, accent),
  ).join('');
  const arrows = steps.slice(0, -1).map(([, , , accent], index) => {
    const startX = x + index * (cardW + gap) + cardW + 8;
    const endX = x + (index + 1) * (cardW + gap) - 8;
    return arrow(startX, y + 82, endX, y + 82, accent);
  }).join('');
  return `
    <g>
      ${cards}
      ${arrows}
    </g>
  `;
}

function flowArtifactCard(x, y, w, h, index, title, detail, filename, accent) {
  const fileBadge = filename
    ? `
      <text x="${x + 20}" y="${y + h - 22}" class="mono" style="font-size:13px">${esc(filename)}</text>
    `
    : '';
  return `
    <g filter="url(#softShadow)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="rgba(255,255,255,0.92)" stroke="${tint(accent, 0.42)}"/>
      <rect x="${x + 16}" y="${y + 16}" width="38" height="38" rx="19" fill="${accent}" opacity="0.94"/>
      <text x="${x + 35}" y="${y + 42}" text-anchor="middle" class="eyebrow">${index}</text>
      <text x="${x + 20}" y="${y + 86}" class="label" style="font-size:22px">${esc(title)}</text>
      ${wrapText(detail, x + 20, y + 116, w - 40, 22, 'body', 2)}
      ${fileBadge}
    </g>
  `;
}

function rangeArrows(x0, y, count, cardW, gap, accent) {
  let out = '';
  for (let i = 0; i < count - 1; i += 1) {
    const start = x0 + i * (cardW + gap) + cardW + 16;
    const end = x0 + (i + 1) * (cardW + gap) - 18;
    out += arrow(start, y + 52, end, y + 52, accent);
  }
  return out;
}

function centerText(text, x, y, className) {
  return `<text x="${x}" y="${y}" text-anchor="middle" class="${className}">${esc(text)}</text>`;
}

function wrapText(text, x, y, widthPx, lineHeight, className, maxLines) {
  const chunks = wrapByVisualWidth(text, widthPx, className);
  return chunks.slice(0, maxLines).map((chunk, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${esc(chunk)}</text>`,
  ).join('');
}

function wrapByVisualWidth(text, widthPx, className) {
  const fontPx = className === 'label' ? 25 : className === 'small' ? 18 : 19;
  const maxUnits = Math.max(6, widthPx / fontPx);
  const chunks = [];
  let line = '';
  let units = 0;
  for (const char of Array.from(text)) {
    const nextUnits = units + visualUnits(char);
    if (nextUnits > maxUnits && line) {
      chunks.push(line.trim());
      line = char;
      units = visualUnits(char);
    } else {
      line += char;
      units = nextUnits;
    }
  }
  if (line) chunks.push(line.trim());
  return chunks;
}

function visualUnits(char) {
  if (/[\u4e00-\u9fff]/u.test(char)) return 1;
  if (/[A-Z]/.test(char)) return 0.68;
  if (/[a-z0-9]/.test(char)) return 0.56;
  if (/\s/.test(char)) return 0.3;
  return 0.5;
}

function tint(hex, opacity) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${opacity})`;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function hashColor(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
