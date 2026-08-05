#!/usr/bin/env node

import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const receiptPath = path.join(runDir, 'phase-5-verify.json');
const logPath = path.join(runDir, 'phase-5-verify.log');
const commands = [
  'pnpm install --frozen-lockfile',
  'pnpm docs:verify',
  'pnpm build',
  'pnpm typecheck',
  'pnpm --filter @proto-bridge/core test',
  'pnpm --filter @proto-bridge/local-service test',
  'pnpm --filter @proto-bridge/cli test',
  'pnpm --filter @proto-bridge/pbwork test',
  'pnpm --filter @proto-bridge/pbwork build',
  'pnpm test:e2e:runtime',
  'pnpm test:e2e:mcp',
  'pnpm test:e2e:consumer',
  'pnpm test:e2e:evidence-slice',
];
const startedAt = new Date();
const startedSteps = [];
let outputTail = '';
let spawnError;
const log = createWriteStream(logPath, { flags: 'w' });

const child = spawn('pnpm', ['verify'], {
  cwd: repoRoot,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    const text = String(chunk);
    process.stdout.write(text);
    log.write(text);
    outputTail = `${outputTail}${text}`.slice(-12_000);
    for (const match of text.matchAll(/^\[product\] (.+)$/gm)) {
      const command = match[1]?.trim();
      if (command && !startedSteps.includes(command)) startedSteps.push(command);
    }
  });
}
child.once('error', (error) => {
  spawnError = error;
});

const exitCode = await new Promise((resolve) => {
  child.once('exit', (code) => resolve(code ?? 1));
});
log.end();
await new Promise((resolve) => log.once('close', resolve));

const completedAt = new Date();
const failedCommand = startedSteps.at(-1);
const stepReceipts = commands.map((command) => ({
  command,
  status: exitCode === 0
    ? 'passed'
    : startedSteps.includes(command)
      ? command === failedCommand ? 'failed' : 'passed'
      : 'not-run',
}));
const receipt = {
  schemaVersion: 1,
  status: exitCode === 0 ? 'passed' : 'failed',
  command: 'pnpm verify',
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  elapsedMs: completedAt.getTime() - startedAt.getTime(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: repoRoot,
  },
  steps: stepReceipts,
  logPath: path.relative(repoRoot, logPath),
  ...(exitCode === 0
    ? {}
    : {
        exitCode,
        failedCommand: failedCommand ?? 'process-start',
        outputTail,
        ...(spawnError ? { spawnError: String(spawnError) } : {}),
      }),
};
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`\nPhase 5 verify receipt: ${receiptPath}\n`);
if (exitCode !== 0) process.exitCode = exitCode;
