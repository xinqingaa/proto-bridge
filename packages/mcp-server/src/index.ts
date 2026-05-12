#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildUiPlan,
  capturePageCanonical,
} from '@proto-bridge/core/workflows/ui-reconstruction';
import {
  findFlutterTargetExamples,
  getFlutterTargetConventions,
} from '@proto-bridge/core/target/flutter-app';
import { parseServerOptions } from './services/config.js';
import { startMcpServer } from './server/stdio-json-rpc.js';

export {
  buildUiPlan,
  capturePageCanonical,
  findFlutterTargetExamples,
  getFlutterTargetConventions,
};

export type {
  BuildUiPlanInput,
  CapturePageCanonicalInput,
} from '@proto-bridge/core/workflows/ui-reconstruction';
export type {
  FindFlutterTargetExamplesInput,
} from '@proto-bridge/core/target/flutter-app';

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
