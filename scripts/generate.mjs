#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const invocationDir = process.env.INIT_CWD ?? process.cwd();
const cliArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const command = cliArgs.find((arg) => !arg.startsWith('--')) ?? 'generate';
const skipsConfigCheck = command === 'init' || cliArgs.includes('--help') || command === 'help';
const ICON = {
  step: '●',
  error: '✖',
};
const COLOR = {
  bold: '\x1b[1m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

void skipsConfigCheck;

step('Building core package...');
await run('pnpm', ['--filter', '@proto-bridge/core', 'build']);
step('Building CLI package...');
await run('pnpm', ['--filter', '@proto-bridge/cli', 'build']);
step('Starting proto-bridge CLI...');
await run('node', [path.resolve(repoRoot, 'packages/cli/dist/index.js'), ...cliArgs]);

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: invocationDir,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      printError(`Failed to start ${command}: ${error.message}`);
      process.exit(1);
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      process.exit(code ?? 1);
    });
  });
}

function step(message) {
  console.log(`${color(ICON.step, COLOR.cyan)} ${color(message, COLOR.dim)}`);
}

function printError(message) {
  const lines = message.split('\n');
  console.error();
  console.error(`${color(ICON.error, COLOR.red)} ${color(lines[0] ?? 'Error', COLOR.red, COLOR.bold)}`);
  for (const line of lines.slice(1)) {
    console.error(`  ${line}`);
  }
}

function color(text, ...styles) {
  if (!process.stdout.isTTY && !process.env.FORCE_COLOR) return text;
  return `${styles.join('')}${text}${COLOR.reset}`;
}
