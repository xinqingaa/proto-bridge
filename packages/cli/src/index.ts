#!/usr/bin/env node

import path from 'node:path';
import { generateMigrationSpec, type GenerateMigrationSpecInput, type TargetPlatform } from '@proto-bridge/core';

type ParsedArgs = {
  command: string;
  values: Record<string, string | boolean>;
};

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.values.help || parsed.command === 'help') {
    console.log(usage());
    return;
  }

  if (parsed.command !== 'generate') {
    throw new Error(`Unknown command: ${parsed.command || '(missing)'}`);
  }

  const input = buildGenerateInput(parsed.values);
  const result = await generateMigrationSpec(input);

  console.log(`screenId: ${result.context.source.screenId ?? 'unknown'}`);
  console.log(`migration-context: ${result.files.migrationContext}`);
  console.log(`migration-spec: ${result.files.migrationSpec}`);
  if (result.files.screenshot) console.log(`screenshot: ${result.files.screenshot}`);
  if (result.files.domSnapshot) console.log(`dom-snapshot: ${result.files.domSnapshot}`);
  if (result.context.recommendations.risks.length > 0) {
    console.log(`warnings: ${result.context.recommendations.risks.length}`);
  }
}

function buildGenerateInput(values: Record<string, string | boolean>): GenerateMigrationSpecInput {
  const prototypeRoot = readString(values, 'prototype-root');
  const flutterRoot = readString(values, 'flutter-root');
  const route = readString(values, 'route');
  const vue = readString(values, 'vue');
  const prototypeUrl = readString(values, 'prototype-url');
  const target = (readString(values, 'target') ?? 'flutter') as TargetPlatform;
  const noCapture = Boolean(values['no-capture']);
  const outDir = resolveOutDir(readString(values, 'out') ?? defaultOutDir(route, vue));

  if (!prototypeRoot) throw new Error('--prototype-root is required');
  if (!flutterRoot) throw new Error('--flutter-root is required');
  if (!route && !vue) throw new Error('Provide either --route or --vue');
  if (route && vue) throw new Error('Use either --route or --vue, not both');
  if (target !== 'flutter') throw new Error('Phase 1 only supports --target flutter');

  return {
    prototypeRoot,
    flutterRoot,
    route,
    vue,
    prototypeUrl,
    target,
    outDir,
    noCapture,
  };
}

function parseArgs(args: string[]): ParsedArgs {
  const cleanArgs = args.filter((arg) => arg !== '--');
  const [maybeCommand, ...rest] = cleanArgs;
  const command = maybeCommand?.startsWith('--') ? 'generate' : maybeCommand ?? 'generate';
  const tokens = maybeCommand?.startsWith('--') ? cleanArgs : rest;
  const values: Record<string, string | boolean> = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token ?? ''}`);
    }

    const withoutPrefix = token.slice(2);
    const [inlineKey, inlineValue] = withoutPrefix.split('=', 2);
    const key = inlineKey;

    if (!key) throw new Error(`Invalid flag: ${token}`);

    if (inlineValue !== undefined) {
      values[key] = inlineValue;
      continue;
    }

    const next = tokens[index + 1];
    if (!next || next.startsWith('--')) {
      values[key] = true;
      continue;
    }

    values[key] = next;
    index += 1;
  }

  return { command, values };
}

function readString(values: Record<string, string | boolean>, key: string): string | undefined {
  const value = values[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function defaultOutDir(route: string | undefined, vue: string | undefined): string {
  const source = route ?? vue ?? 'migration';
  const slug = source
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .toLowerCase();
  return path.join('output', slug || 'migration');
}

function resolveOutDir(outDir: string): string {
  if (path.isAbsolute(outDir)) return outDir;
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), outDir);
}

function usage(): string {
  return `Usage:
  pnpm run generate -- --prototype-root <TradeAppPrd> --flutter-root <YouFi> (--route <route> | --vue <file>) [options]

Options:
  --route <route>             Prototype or design route, for example /prototype/trade
  --vue <file>                Vue file path, absolute or relative to prototype root
  --prototype-url <url>       Optional running prototype URL for Playwright capture
  --target flutter            Phase 1 target platform
  --out <dir>                 Output directory
  --no-capture                Skip screenshot and DOM capture
`;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`proto-bridge: ${message}`);
  process.exitCode = 1;
});
