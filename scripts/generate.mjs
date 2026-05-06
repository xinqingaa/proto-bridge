#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const DEFAULT_CONFIG_FILE = 'proto-bridge.config.json';
const invocationDir = process.env.INIT_CWD ?? process.cwd();
const cliArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const configPath = resolveConfigPath(cliArgs);

try {
  await access(configPath);
} catch {
  console.error(`proto-bridge: Missing required config file: ${configPath}`);
  console.error(`Create it from the example first: cp proto-bridge.config.example.json ${DEFAULT_CONFIG_FILE}`);
  console.error('Then edit source.root and target.root for your local machine.');
  process.exit(1);
}

await run('pnpm', ['--filter', '@proto-bridge/core', 'build']);
await run('pnpm', ['--filter', '@proto-bridge/cli', 'build']);
await run('pnpm', ['--filter', '@proto-bridge/cli', 'generate', '--', ...cliArgs]);

function resolveConfigPath(args) {
  const inline = args.find((arg) => arg.startsWith('--config='));
  if (inline) return resolveFromInvocation(inline.slice('--config='.length));

  const configIndex = args.indexOf('--config');
  if (configIndex >= 0) {
    const value = args[configIndex + 1];
    if (!value || value.startsWith('--')) {
      console.error('proto-bridge: --config requires a file path.');
      process.exit(1);
    }
    return resolveFromInvocation(value);
  }

  return path.resolve(invocationDir, DEFAULT_CONFIG_FILE);
}

function resolveFromInvocation(value) {
  return path.isAbsolute(value) ? value : path.resolve(invocationDir, value);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: invocationDir,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}
