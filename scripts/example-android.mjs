#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = path.join(repoRoot, 'examples/vue3-to-flutter/target-flutter');
const protoMain = path.join(targetRoot, 'lib/main_proto.dart');
const androidRoot = path.join(targetRoot, 'android');
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== '--');

step('Preparing Flutter Android target...');
if (!existsSync(androidRoot)) {
  await run('flutter', ['create', '--platforms=android', '.'], { cwd: targetRoot });
}

await run('flutter', ['pub', 'get'], { cwd: targetRoot });

const runArgs = ['run'];
if (existsSync(protoMain)) {
  runArgs.push('-t', 'lib/main_proto.dart');
} else {
  console.log('● Generated _proto entry not found. Run pnpm run example to generate pages; showing fallback app.');
}

if (passthroughArgs.length > 0) {
  runArgs.push(...passthroughArgs);
} else {
  runArgs.push('-d', 'android');
}

await run('flutter', runArgs, { cwd: targetRoot });

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}`));
    });
  });
}

function step(message) {
  console.log(`● ${message}`);
}
