#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  findFlutterTargetExamples,
  getFlutterTargetConventions,
} from '@proto-bridge/core/target/flutter-app/query';
import {
  findTargetExamples,
  readTargetConventions,
} from '@proto-bridge/core/target';
import { parseServerOptions } from './services/config.js';
import { startMcpServer } from './server/stdio-json-rpc.js';

export {
  findTargetExamples,
  readTargetConventions,
  findFlutterTargetExamples,
  getFlutterTargetConventions,
};
export type {
  FindFlutterTargetExamplesInput,
} from '@proto-bridge/core/target/flutter-app/query';
export type {
  FindTargetExamplesInput,
  ReadTargetConventionsInput,
} from '@proto-bridge/core/target';

if (isDirectRun()) {
  startMcpServer(parseServerOptions(process.argv.slice(2)));
}

function isDirectRun(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return fileURLToPath(import.meta.url) === process.argv[1];
  }
}
