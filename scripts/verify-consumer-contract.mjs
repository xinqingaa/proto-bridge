#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prompt = await readFile(path.join(root, 'packages/core/src/v2/prompts/handoff-consumer.md'), 'utf8');
const generated = await readFile(path.join(root, 'packages/core/src/v2/prompts/generated-assets.ts'), 'utf8');
const guide = await readFile(path.join(root, 'packages/mcp-server/src/consumer-guide.ts'), 'utf8');
const registry = await readFile(path.join(root, 'packages/mcp-server/src/tools/registry.ts'), 'utf8');
const runtime = await readFile(path.join(root, 'packages/mcp-server/src/runtime-info.ts'), 'utf8');
const projection = await readFile(path.join(root, 'packages/core/src/v2/consumer-projection.ts'), 'utf8');
const failures = [];

if (!generated.includes(JSON.stringify(prompt).slice(1, -1))) failures.push('generated Core prompt asset drifted from handoff-consumer.md');
if (!guide.includes("PROMPT_ASSETS['handoff-consumer']")) failures.push('MCP consumer guide is not derived from Core prompt asset');
for (const name of ['read_implementation_plan', 'read_implementation_tranche', 'inspect_target_readiness']) {
  if (!registry.includes(`'${name}'`)) failures.push(`MCP registry missing ${name}`);
}
for (const capability of ['implementation-plan', 'implementation-tranche', 'target-readiness-contract']) {
  const source = capability.startsWith('implementation-') ? projection : runtime;
  if (!source.includes(`'${capability}'`)) failures.push(`MCP runtime missing capability ${capability}`);
}
for (const marker of ['read_implementation_plan', 'read_implementation_tranche', 'inspect_target_readiness']) {
  if (!prompt.includes(marker)) failures.push(`Core consumer contract missing ${marker}`);
}
for (const marker of ['read_reconstruction_obligations', 'summarize_reconstruction_review', 'projection contract version']) {
  if (!prompt.includes(marker)) failures.push(`Core consumer contract missing verifier/schema marker ${marker}`);
}
for (const marker of ['MCP_TOOL_CONTRACT_VERSION', 'CONSUMER_PROJECTION_VERSION']) {
  if (!runtime.includes(marker)) failures.push(`MCP runtime missing contract marker ${marker}`);
}
for (const marker of ['start_target_review', 'verify_target_claims', 'render_target_case', 'target-review-authoritative']) {
  if (prompt.includes(marker) || registry.includes(`'${marker}'`) || runtime.includes(`'${marker}'`)) {
    failures.push(`Default consumer surface still exposes experimental Flutter Review marker ${marker}`);
  }
}
if (failures.length) {
  console.error(`Consumer contract verification failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Consumer contract verification passed.');
}
