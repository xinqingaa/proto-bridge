import { layoutDiagram } from './render-svg.mjs';
import { protoBridgeStyle } from './styles/proto-bridge.mjs';
import { validateDiagram } from './schema.mjs';

export function checkDiagram(diagram) {
  const issues = [...validateDiagram(diagram).issues];
  const layout = layoutDiagram(diagram, protoBridgeStyle);

  for (const node of layout.nodes) {
    if (node.x < 54 || node.y < 190 || node.x + node.w > protoBridgeStyle.width - 54 || node.y + node.h > protoBridgeStyle.height - 54) {
      issues.push(`node may be out of frame: ${node.id}`);
    }
    const titleUnits = visualUnits(node.title);
    if (titleUnits * 23 > node.w - 40) {
      issues.push(`node title may overflow: ${node.id}`);
    }
  }

  for (let i = 0; i < layout.nodes.length; i += 1) {
    for (let j = i + 1; j < layout.nodes.length; j += 1) {
      if (overlaps(layout.nodes[i], layout.nodes[j])) {
        issues.push(`nodes overlap: ${layout.nodes[i].id} / ${layout.nodes[j].id}`);
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function overlaps(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

function visualUnits(text) {
  let units = 0;
  for (const char of Array.from(text ?? '')) {
    if (/[\u4e00-\u9fff]/u.test(char)) units += 1;
    else if (/[A-Z]/.test(char)) units += 0.68;
    else if (/[a-z0-9]/.test(char)) units += 0.56;
    else if (/\s/.test(char)) units += 0.3;
    else units += 0.5;
  }
  return units;
}
