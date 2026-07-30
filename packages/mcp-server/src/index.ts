#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  findFlutterTargetExamples,
  getFlutterTargetConventions,
} from '@proto-bridge/core/target/flutter-app/query';
import { parseServerOptions } from './services/config.js';
import { startMcpServer } from './server/stdio-json-rpc.js';

export {
  findFlutterTargetExamples,
  getFlutterTargetConventions,
};
export type {
  FindFlutterTargetExamplesInput,
} from '@proto-bridge/core/target/flutter-app/query';

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
