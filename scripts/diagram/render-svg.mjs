import { protoBridgeStyle } from './styles/proto-bridge.mjs';

export function renderSvg(diagram, options = {}) {
  const style = protoBridgeStyle;
  const layout = layoutDiagram(diagram, style);
  const body = [
    frame(diagram, style),
    ...layout.groups.map((group) => groupBox(group, style)),
    ...(layout.groupEdges?.map((edge) => groupEdgePath(edge, layout.groupsById, style)) ?? []),
    ...(!layout.groupEdges?.length ? layout.edges.map((edge) => edgePath(edge, layout.nodesById, style)) : []),
    ...layout.nodes.map((node) => nodeCard(node, style)),
    ...layout.notes.map((note) => noteBand(note, style)),
  ].join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${style.height}" viewBox="0 0 ${style.width} ${style.height}">
  ${defs(style)}
  <style>
    .title { font: 760 48px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.title}; letter-spacing: 0; }
    .subtitle { font: 400 24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.body}; letter-spacing: 0; }
    .label { font: 720 23px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.ink}; letter-spacing: 0; }
    .body { font: 400 18px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.body}; letter-spacing: 0; }
    .small { font: 400 16px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.faint}; letter-spacing: 0; }
    .mono { font: 600 13px "SFMono-Regular", Consolas, monospace; fill: ${style.colors.faint}; letter-spacing: 0; }
    .chip { font: 700 17px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; fill: ${style.colors.white}; letter-spacing: 0; }
  </style>
  ${body}
</svg>`;
}

export function layoutDiagram(diagram, style = protoBridgeStyle) {
  if (diagram.kind === 'artifact-loop') return layoutArtifactLoop(diagram, style);
  if (diagram.kind === 'workflow') return layoutWorkflow(diagram, style);
  return layoutArchitecture(diagram, style);
}

function layoutArchitecture(diagram, style) {
  const groupOrder = orderedGroups(diagram, ['入口', '输入', '共享处理', '处理', '输出']);
  const nodes = [];
  const groups = [];
  let y = 225;

  for (const groupName of groupOrder) {
    const groupNodes = diagram.nodes.filter((node) => node.group === groupName);
    if (!groupNodes.length) continue;
    const cols = groupName === '输出'
      ? Math.min(4, groupNodes.length)
      : groupNodes.length <= 3 ? groupNodes.length : 3;
    const cardW = groupName === '输出' ? 210 : cols === 1 ? 420 : 360;
    const cardH = groupName === '输出' ? 82 : 86;
    const gapX = groupName === '输出' ? 34 : 54;
    const gapY = 18;
    const rows = Math.ceil(groupNodes.length / cols);
    const groupW = cols * cardW + (cols - 1) * gapX + 72;
    const groupH = rows * cardH + (rows - 1) * gapY + 66;
    const x = (style.width - groupW) / 2;
    groups.push({ id: groupName, title: groupName, x, y, w: groupW, h: groupH, color: groupColor(groupName, style) });
    groupNodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      nodes.push({
        ...node,
        x: x + 36 + col * (cardW + gapX),
        y: y + 52 + row * (cardH + gapY),
        w: cardW,
        h: cardH,
        color: groupColor(groupName, style),
      });
    });
    y += groupH + 22;
  }

  const groupEdges = groupOrder.slice(0, -1).map((from, index) => ({ from, to: groupOrder[index + 1] }));
  return finalizeLayout(diagram, nodes, groups, [], groupEdges);
}

function layoutWorkflow(diagram, style) {
  const cardW = 210;
  const cardH = 142;
  const gap = 30;
  const x0 = (style.width - diagram.nodes.length * cardW - (diagram.nodes.length - 1) * gap) / 2;
  const y = 365;
  const nodes = diagram.nodes.map((node, index) => ({
    ...node,
    x: x0 + index * (cardW + gap),
    y,
    w: cardW,
    h: cardH,
    color: groupColor(node.group, style),
  }));
  return finalizeLayout(diagram, nodes, [], notesFor(diagram, 650));
}

function layoutArtifactLoop(diagram, style) {
  const cardW = 210;
  const cardH = 178;
  const gap = 36;
  const x0 = (style.width - diagram.nodes.length * cardW - (diagram.nodes.length - 1) * gap) / 2;
  const y = 285;
  const nodes = diagram.nodes.map((node, index) => ({
    ...node,
    x: x0 + index * (cardW + gap),
    y,
    w: cardW,
    h: cardH,
    color: nodeColor(index, style),
    step: index + 1,
  }));
  return finalizeLayout(diagram, nodes, [], notesFor(diagram, 635));
}

function finalizeLayout(diagram, nodes, groups, notes, groupEdges = []) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  return {
    nodes,
    nodesById,
    groups,
    groupsById,
    groupEdges,
    notes,
    edges: diagram.edges,
  };
}

function orderedGroups(diagram, preferred) {
  const names = [...new Set(diagram.nodes.map((node) => node.group || '默认'))];
  return [
    ...preferred.filter((group) => names.includes(group)),
    ...names.filter((group) => !preferred.includes(group)),
  ];
}

function notesFor(diagram, y) {
  return (diagram.notes ?? []).slice(0, 1).map((text) => ({ text, x: 330, y, w: 940, color: protoBridgeStyle.colors.green }));
}

function frame(diagram, style) {
  return `
    <rect width="${style.width}" height="${style.height}" fill="url(#pageBg)"/>
    <rect width="${style.width}" height="${style.height}" fill="url(#washBlue)"/>
    <rect width="${style.width}" height="${style.height}" fill="url(#washWarm)"/>
    <rect x="54" y="46" width="1492" height="868" rx="38" fill="rgba(255,255,255,0.72)" stroke="rgba(114,132,154,0.24)"/>
    <text x="96" y="124" class="title">${esc(diagram.title)}</text>
    <text x="100" y="166" class="subtitle">${esc(diagram.subtitle)}</text>
    <rect x="100" y="194" width="290" height="6" rx="3" fill="${style.colors.blue}" opacity="0.92"/>
    <rect x="260" y="194" width="170" height="6" rx="3" fill="${style.colors.teal}" opacity="0.92"/>
  `;
}

function groupBox(group, style) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${group.x}" y="${group.y}" width="${group.w}" height="${group.h}" rx="28" fill="rgba(255,255,255,0.72)" stroke="${tint(group.color, 0.26)}"/>
      <rect x="${group.x - 28}" y="${group.y - 18}" width="160" height="38" rx="19" fill="${tint(group.color, 0.1)}" stroke="${tint(group.color, 0.38)}"/>
      <text x="${group.x + 52}" y="${group.y + 7}" text-anchor="middle" class="small" style="font-weight:740; fill:${group.color}">${esc(group.title)}</text>
    </g>
  `;
}

function nodeCard(node) {
  const tags = node.tags?.length ? node.tags.slice(0, 1) : [];
  return `
    <g filter="url(#softShadow)">
      <rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="22" fill="rgba(255,255,255,0.9)" stroke="${tint(node.color, 0.42)}"/>
      ${node.step ? `<circle cx="${node.x + 28}" cy="${node.y + 28}" r="17" fill="${node.color}" opacity="0.94"/><text x="${node.x + 28}" y="${node.y + 35}" text-anchor="middle" class="chip">${node.step}</text>` : `<circle cx="${node.x + 28}" cy="${node.y + 36}" r="10" fill="${node.color}" opacity="0.9"/>`}
      <text x="${node.x + (node.step ? 20 : 52)}" y="${node.y + (node.step ? 72 : 38)}" class="label">${esc(node.title)}</text>
      ${wrapText(node.subtitle, node.x + 20, node.y + (node.step ? 102 : 66), node.w - 40, 22, 'body', 2)}
      ${tags.map((tag) => `<text x="${node.x + 20}" y="${node.y + node.h - 18}" class="mono">${esc(tag)}</text>`).join('')}
    </g>
  `;
}

function edgePath(edge, nodesById, style) {
  const from = nodesById.get(edge.from);
  const to = nodesById.get(edge.to);
  if (!from || !to) return '';
  const color = from.color ?? style.colors.teal;
  const id = `arrow-${hashColor(color)}`;
  const fromRight = from.x + from.w;
  const toLeft = to.x;
  if (fromRight < toLeft) {
    return arrowLine(fromRight + 8, from.y + from.h / 2, toLeft - 8, to.y + to.h / 2, color, id);
  }
  const x = from.x + from.w / 2;
  return arrowLine(x, from.y + from.h + 8, to.x + to.w / 2, to.y - 8, color, id);
}

function groupEdgePath(edge, groupsById, style) {
  const from = groupsById.get(edge.from);
  const to = groupsById.get(edge.to);
  if (!from || !to) return '';
  const color = style.groupColors[to.id] ?? style.colors.teal;
  const id = `arrow-${hashColor(color)}`;
  const x = from.x + from.w / 2;
  return arrowLine(x, from.y + from.h + 8, to.x + to.w / 2, to.y - 8, color, id, 3, 0.5);
}

function arrowLine(x1, y1, x2, y2, color, id, width = 4, opacity = 0.72) {
  return `
    <defs>
      <marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="${color}"/>
      </marker>
    </defs>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-opacity="${opacity}" marker-end="url(#${id})"/>
  `;
}

function noteBand(note) {
  return `
    <g filter="url(#softShadow)">
      <rect x="${note.x}" y="${note.y}" width="${note.w}" height="58" rx="29" fill="${tint(note.color, 0.08)}" stroke="${tint(note.color, 0.32)}"/>
      <circle cx="${note.x + 34}" cy="${note.y + 29}" r="10" fill="${note.color}" opacity="0.86"/>
      <text x="${note.x + 58}" y="${note.y + 37}" class="label" style="font-size:22px">${esc(note.text)}</text>
    </g>
  `;
}

function defs(style) {
  return `
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
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#3c5873" flood-opacity="0.14"/>
    </filter>
  </defs>`;
}

function groupColor(group, style) {
  return style.groupColors[group] ?? style.colors.teal;
}

function nodeColor(index, style) {
  return [style.colors.blue, style.colors.sky, style.colors.green, style.colors.amber, style.colors.violet, style.colors.coral][index % 6];
}

function wrapText(text, x, y, widthPx, lineHeight, className, maxLines) {
  const chunks = wrapByVisualWidth(text, widthPx, className);
  return chunks.slice(0, maxLines).map((chunk, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${esc(chunk)}</text>`,
  ).join('');
}

function wrapByVisualWidth(text, widthPx, className) {
  const fontPx = className === 'label' ? 23 : className === 'small' ? 16 : 18;
  const maxUnits = Math.max(6, widthPx / fontPx);
  const chunks = [];
  let line = '';
  let units = 0;
  for (const char of Array.from(text ?? '')) {
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
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
