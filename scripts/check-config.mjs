#!/usr/bin/env node

import { access } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CONFIG_FILE = 'proto-bridge.config.json';
const invocationDir = process.env.INIT_CWD ?? process.cwd();
const configPath = path.resolve(invocationDir, DEFAULT_CONFIG_FILE);

try {
  await access(configPath);
} catch {
  console.error(`proto-bridge: Missing required config file: ${configPath}`);
  console.error(`Create it from the example first: cp proto-bridge.config.example.json ${DEFAULT_CONFIG_FILE}`);
  console.error('Then edit prototypeRoot and flutterRoot for your local machine.');
  process.exitCode = 1;
}
