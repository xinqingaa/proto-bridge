#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = path.join(repoRoot, 'examples/vue3-to-flutter');
const targetRoot = path.join(repoRoot, 'examples/vue3-to-flutter/target-flutter');
const outputRoot = path.join(exampleRoot, 'output');

const protoPaths = [
  path.join(targetRoot, 'lib/main_proto.dart'),
  path.join(targetRoot, 'lib/app/app_proto.dart'),
  path.join(targetRoot, 'lib/app/routes/app_pages_proto.dart'),
  path.join(targetRoot, 'lib/app/modules/account/_proto'),
];

const cleanPaths = [
  ...protoPaths,
  outputRoot,
];

for (const filePath of cleanPaths) {
  await rm(filePath, { recursive: true, force: true });
  console.log(`removed ${path.relative(repoRoot, filePath)}`);
}

console.log('● Example generated output and Flutter _proto install output cleaned.');
