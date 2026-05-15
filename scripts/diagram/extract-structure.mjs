import path from 'node:path';
import { createDiagram } from './schema.mjs';

const capabilityMap = [
  ['source.analyze', '读取原型源码', '看懂结构、状态和交互意图'],
  ['runtime.capture', '抓取运行画面', '记录当前可见内容和截图'],
  ['screenshot.attach', '补充截图文字', '用截图和 OCR 补证'],
  ['target.inspect', '读取客户端规范', '找到模块、组件和主题规则'],
  ['page.merge', '合并页面证据', '保留来源和冲突提示'],
  ['ui.plan', '生成实现计划', '给实现提供文件和组件建议'],
  ['ui.review', '生成交接说明', '写出人类可读任务书'],
  ['ui.validate', '检查实现风险', '实现后检查改动范围'],
];

const artifactMap = [
  ['page-canonical.json', '页面事实底稿', '完整记录页面证据、来源和冲突'],
  ['page-debug-index.json', '快速定位索引', '按区块、文字和样式查证据'],
  ['ui-build-plan.json', '实现计划', '说明目标文件、组件和复用建议'],
  ['ui-build-review.md', '交接说明', '给开发者和 AI 助手看的任务书'],
  ['screenshots/full-page.png', '视觉证据', '用于实现前后核对页面'],
  ['validation result', '实现后检查', '检查改动范围和常见风险'],
];

export function extractStructure(input, options = {}) {
  const kind = inferKind(input, options.type);
  const facts = collectFacts(input);
  if (kind === 'workflow') return buildWorkflowDiagram(input, facts, options);
  if (kind === 'artifact-loop') return buildArtifactLoopDiagram(input, facts, options);
  return buildArchitectureDiagram(input, facts, options);
}

function inferKind(input, requested) {
  if (requested && requested !== 'auto') return requested;
  const text = allText(input).toLowerCase();
  if (text.includes('validation') || text.includes('ui-build-review') || text.includes('page-canonical')) {
    return 'artifact-loop';
  }
  if (text.includes('workflow') || text.includes('工作流') || text.includes('->')) return 'workflow';
  return 'architecture';
}

function collectFacts(input) {
  const text = allText(input);
  const headings = [];
  const bullets = [];
  const arrows = [];

  for (const doc of input.documents) {
    if (doc.kind !== 'markdown') continue;
    for (const line of doc.content.split(/\r?\n/)) {
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) headings.push({ level: heading[1].length, text: clean(heading[2]), file: doc.relativePath });
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) bullets.push({ text: clean(bullet[1]), file: doc.relativePath });
      if (line.includes('->')) arrows.push(clean(line));
    }
  }

  const capabilities = capabilityMap
    .filter(([needle]) => text.includes(needle))
    .map(([raw, title, subtitle]) => ({ raw, title, subtitle }));
  const artifacts = artifactMap
    .filter(([needle]) => text.includes(needle))
    .map(([raw, title, subtitle]) => ({ raw, title, subtitle }));

  return {
    projectName: inferProjectName(input, headings),
    headings,
    bullets,
    arrows,
    capabilities,
    artifacts,
    documents: input.summary,
  };
}

function buildArchitectureDiagram(input, facts, options) {
  const hasProtoBridgeSignals = allText(input).includes('ProtoBridge');
  const nodes = hasProtoBridgeSignals
    ? [
      node('entry-cli', '命令行入口', '本地生成和批处理', '入口'),
      node('entry-ai', 'AI 工具入口', '让编码助手调用', '入口'),
      node('entry-core', '代码接入', '嵌入其它 Node.js 工具', '入口'),
      ...facts.capabilities.slice(0, 6).map((item, index) => node(`cap-${index + 1}`, item.title, item.subtitle, '共享处理')),
      node('out-facts', '页面事实', '统一页面上下文', '输出'),
      node('out-plan', '实现计划', '目标文件和组件建议', '输出'),
      node('out-review', '交接说明', '人类可读任务书', '输出'),
      node('out-check', '风险检查', '实现后验证', '输出'),
    ]
    : genericArchitectureNodes(facts);

  return createDiagram({
    kind: 'architecture',
    title: options.title || `${facts.projectName} 架构图`,
    subtitle: options.subtitle || '从输入材料到共享处理，再到可交付结果',
    nodes,
    edges: architectureEdges(nodes),
    groups: [
      { id: '入口', title: '使用入口' },
      { id: '共享处理', title: '共享处理' },
      { id: '输出', title: '输出结果' },
    ],
    notes: ['自动从文档提取结构，技术文件名只作为补充标签。'],
    metadata: sourceMetadata(input, facts),
  });
}

function buildWorkflowDiagram(input, facts, options) {
  const nodes = [
    node('input', '准备材料', '源码、网页、截图或目标工程', '主流程'),
    node('capture', '采集证据', '读取结构、运行画面和规范', '主流程'),
    node('merge', '合并上下文', '保留来源、冲突和人工确认项', '主流程'),
    node('plan', '生成交接', '实现计划和 review 文档', '主流程'),
    node('implement', '落地实现', '按目标工程规范修改', '主流程'),
    node('validate', '实现后检查', '检查范围和常见风险', '主流程'),
  ];
  return createDiagram({
    kind: 'workflow',
    title: options.title || `${facts.projectName} 工作流`,
    subtitle: options.subtitle || '手上有什么证据，就组合什么能力',
    nodes,
    edges: chain(nodes),
    groups: [{ id: '主流程', title: '主流程' }],
    notes: facts.arrows.slice(0, 3),
    metadata: sourceMetadata(input, facts),
  });
}

function buildArtifactLoopDiagram(input, facts, options) {
  const source = facts.artifacts.length ? facts.artifacts : artifactMap.map(([raw, title, subtitle]) => ({ raw, title, subtitle }));
  const nodes = source.slice(0, 6).map((item, index) => node(`artifact-${index + 1}`, item.title, item.subtitle, '产物闭环', [item.raw]));
  return createDiagram({
    kind: 'artifact-loop',
    title: options.title || `${facts.projectName} 产物闭环`,
    subtitle: options.subtitle || '让实现前、实现中、实现后都有依据',
    nodes,
    edges: chain(nodes),
    groups: [{ id: '产物闭环', title: '产物闭环' }],
    notes: ['检查结果回到计划和交接说明，修正后再次验证。'],
    metadata: sourceMetadata(input, facts),
  });
}

function genericArchitectureNodes(facts) {
  const primaryHeadings = facts.headings.filter((item) => item.level <= 2).slice(0, 8);
  if (primaryHeadings.length >= 4) {
    return primaryHeadings.map((heading, index) => node(`section-${index + 1}`, heading.text, path.basename(heading.file), index < 2 ? '输入' : index < 6 ? '处理' : '输出'));
  }
  return [
    node('input-docs', '读取文档', `${facts.documents.markdownFiles} 个 Markdown 文件`, '输入'),
    node('input-code', '读取代码', `${facts.documents.codeFiles} 个代码/配置文件`, '输入'),
    node('understand', '提取结构', '标题、列表、流程和关键术语', '处理'),
    node('organize', '整理关系', '合并节点、分组和主流程', '处理'),
    node('output', '生成图稿', '导出 JSON、SVG 和 PNG', '输出'),
  ];
}

function architectureEdges(nodes) {
  const entries = nodes.filter((item) => item.group === '入口');
  const processors = nodes.filter((item) => item.group === '共享处理' || item.group === '处理');
  const outputs = nodes.filter((item) => item.group === '输出');
  const edges = [];
  if (processors[0]) entries.forEach((entry) => edges.push({ from: entry.id, to: processors[0].id }));
  for (let index = 0; index < processors.length - 1; index += 1) {
    edges.push({ from: processors[index].id, to: processors[index + 1].id });
  }
  if (processors.at(-1)) outputs.forEach((output) => edges.push({ from: processors.at(-1).id, to: output.id }));
  return edges;
}

function chain(nodes) {
  return nodes.slice(0, -1).map((item, index) => ({ from: item.id, to: nodes[index + 1].id }));
}

function node(id, title, subtitle, group, tags = []) {
  return { id, title, subtitle, group, tags };
}

function sourceMetadata(input, facts) {
  return {
    generatedBy: 'scripts/generate-ai-diagram.mjs',
    sourceFiles: input.documents.map((doc) => doc.relativePath),
    inputSummary: input.summary,
    headingCount: facts.headings.length,
    capabilityCount: facts.capabilities.length,
    artifactCount: facts.artifacts.length,
  };
}

function inferProjectName(input, headings) {
  const firstH1 = headings.find((item) => item.level === 1)?.text;
  if (firstH1) return firstH1.replace(/^@/, '');
  return path.basename(input.cwd);
}

function allText(input) {
  return input.documents.map((doc) => doc.content).join('\n');
}

function clean(value) {
  return String(value)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}
