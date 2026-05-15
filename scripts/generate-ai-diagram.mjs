#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readInputs } from './diagram/read-inputs.mjs';
import { extractStructure } from './diagram/extract-structure.mjs';
import { renderSvg } from './diagram/render-svg.mjs';
import { renderPng } from './diagram/render-png.mjs';
import { checkDiagram } from './diagram/check-diagram.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.input.length) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const outBase = path.resolve(cwd, args.out || 'docs/assets/generated/diagram');
const input = await readInputs({
  cwd,
  inputPatterns: args.input,
  codePatterns: args.code,
});

const diagram = extractStructure(input, {
  type: args.type,
  title: args.title,
  subtitle: args.subtitle,
});

const check = checkDiagram(diagram);
const svg = renderSvg(diagram);

await mkdir(path.dirname(outBase), { recursive: true });
await writeFile(`${outBase}.json`, `${JSON.stringify({ diagram, check }, null, 2)}\n`, 'utf8');
await writeFile(`${outBase}.svg`, svg, 'utf8');
await renderPng(svg, `${outBase}.png`);

console.log(`Generated diagram: ${outBase}`);
console.log(`- JSON: ${path.relative(cwd, `${outBase}.json`)}`);
console.log(`- SVG:  ${path.relative(cwd, `${outBase}.svg`)}`);
console.log(`- PNG:  ${path.relative(cwd, `${outBase}.png`)}`);
if (check.ok) {
  console.log('- Check: ok');
} else {
  console.log('- Check warnings:');
  for (const issue of check.issues) console.log(`  - ${issue}`);
}

function parseArgs(argv) {
  const parsed = {
    input: [],
    code: [],
    type: 'auto',
    out: '',
    title: '',
    subtitle: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--input' || arg === '-i') parsed.input.push(...readValues(argv, index += 1));
    else if (arg === '--code') parsed.code.push(...readValues(argv, index += 1));
    else if (arg === '--type' || arg === '-t') parsed.type = argv[++index] ?? 'auto';
    else if (arg === '--out' || arg === '-o') parsed.out = argv[++index] ?? '';
    else if (arg === '--title') parsed.title = argv[++index] ?? '';
    else if (arg === '--subtitle') parsed.subtitle = argv[++index] ?? '';
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else parsed.input.push(arg);
  }

  return parsed;
}

function readValues(argv, startIndex) {
  const value = argv[startIndex];
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-ai-diagram.mjs --input README.md,docs/*.md --type architecture --out docs/assets/generated/proto-bridge-architecture

Options:
  --input, -i     Markdown files, directories, or globs. Required.
  --code         Optional code/config files, directories, or globs.
  --type, -t     auto | architecture | workflow | artifact-loop | cover. Default: auto.
  --out, -o      Output path without extension. Default: docs/assets/generated/diagram.
  --title        Optional diagram title override.
  --subtitle     Optional diagram subtitle override.
`);
}
