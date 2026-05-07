#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import {
  capturePrototypePage,
  defaultAdapterRegistry,
  findFlutterTargetExamples,
  generateMigrationSpec,
  getFlutterTargetConventions,
} from '@proto-bridge/core';
import { parseServerOptions } from './services/config.js';
import { startMcpServer } from './server/stdio-json-rpc.js';

export {
  capturePrototypePage,
  defaultAdapterRegistry,
  findFlutterTargetExamples,
  generateMigrationSpec,
  getFlutterTargetConventions,
};

export type {
  CapturePrototypePageInput,
  FindFlutterTargetExamplesInput,
  GenerateMigrationSpecInput,
  SourceAdapter,
  TargetAdapter,
} from '@proto-bridge/core';

if (isDirectRun()) {
  startMcpServer(parseServerOptions(process.argv.slice(2)));
}

function isDirectRun(): boolean {
  return Boolean(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]);
}
