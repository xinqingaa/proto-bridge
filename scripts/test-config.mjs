#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractRouteFromUrl,
  parseProtoBridgeConfig,
  resolveProtoBridgeInput,
} from '../packages/core/dist/config/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configDir = path.join(repoRoot, 'examples', 'config-fixture');

const fullConfig = {
  schemaVersion: 1,
  source: {
    adapter: 'vue3-prototype',
    root: './source-app',
  },
  target: {
    adapter: 'flutter-app',
    root: './target-app',
  },
  runtime: {
    capture: true,
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
    },
  },
  output: {
    root: './output',
  },
};
const youfiConfig = {
  ...fullConfig,
  target: {
    adapter: 'flutter-app',
    root: '../youfi',
  },
};
const pageUrl = 'http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1';

{
  const resolved = resolveProtoBridgeInput({
    config: fullConfig,
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
    },
    requirePageInput: true,
  });
  assert.equal(resolved.page.route, '/prototype/asset/pnl-analysis');
  assert.equal(resolved.input.url, pageUrl);
  assert.equal(resolved.input.source?.root, path.join(configDir, 'source-app'));
  assert.equal(resolved.input.target?.root, path.join(configDir, 'target-app'));
  assert.equal(resolved.input.capture, true);
  assert.equal(resolved.input.buildPlan, true);
  assert.equal(resolved.input.buildReview, true);
  assert.equal(resolved.restorationProfile.id, 'generic');
  assert.equal(resolved.input.restorationProfile.id, 'generic');
  assert.match(resolved.input.outDir, /examples\/config-fixture\/output\/pnl-analysis-/);
}

{
  const resolved = resolveProtoBridgeInput({
    config: {
      schemaVersion: 1,
      target: fullConfig.target,
      runtime: fullConfig.runtime,
      output: fullConfig.output,
    },
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
    },
    requirePageInput: true,
  });
  assert.equal(resolved.input.source, undefined);
  assert.equal(resolved.input.target?.root, path.join(configDir, 'target-app'));
  assert.equal(resolved.input.buildPlan, true);
  assert.equal(resolved.restorationProfile.id, 'generic');
}

{
  const resolved = resolveProtoBridgeInput({
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
    },
    requirePageInput: true,
  });
  assert.equal(resolved.input.source, undefined);
  assert.equal(resolved.input.target, undefined);
  assert.equal(resolved.input.buildPlan, false);
  assert.equal(resolved.input.buildReview, false);
  assert.equal(resolved.input.capture, true);
  assert.equal(resolved.restorationProfile.id, 'generic');
}

{
  const resolved = resolveProtoBridgeInput({
    config: fullConfig,
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
      route: '/prototype/override',
    },
    requirePageInput: true,
  });
  assert.equal(resolved.page.route, '/prototype/override');
  assert.equal(resolved.page.url, pageUrl);
}

{
  const resolved = resolveProtoBridgeInput({
    config: youfiConfig,
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
    },
    requirePageInput: true,
  });
  assert.equal(resolved.restorationProfile.id, 'youfi');
  assert.equal(resolved.restorationProfile.mode, 'auto');
  assert.equal(resolved.restorationProfile.inferredFrom, 'youfi');
  assert.equal(resolved.restorationProfile.profile.targetSymbols[0].symbol, 'CommonAppBar');
  assert.equal(resolved.restorationProfile.profile.targetSymbols.some((item) => item.symbol === 'AppBar'), true);
}

{
  const resolved = resolveProtoBridgeInput({
    config: {
      ...youfiConfig,
      profile: 'generic',
    },
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
    },
    requirePageInput: true,
  });
  assert.equal(resolved.restorationProfile.id, 'generic');
  assert.equal(resolved.restorationProfile.mode, 'generic');
  assert.equal(resolved.restorationProfile.profile.targetSymbols.some((item) => item.symbol === 'CommonAppBar'), false);
}

{
  const resolved = resolveProtoBridgeInput({
    config: {
      ...fullConfig,
      profile: 'youfi',
    },
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
      profile: false,
    },
    requirePageInput: true,
  });
  assert.equal(resolved.restorationProfile.id, 'generic');
  assert.equal(resolved.restorationProfile.mode, 'generic');
}

{
  const resolved = resolveProtoBridgeInput({
    config: fullConfig,
    configDir,
    cwd: repoRoot,
    overrides: {
      url: pageUrl,
      profile: 'youfi',
    },
    requirePageInput: true,
  });
  assert.equal(resolved.restorationProfile.id, 'youfi');
  assert.equal(resolved.restorationProfile.mode, 'explicit');
}

assert.equal(extractRouteFromUrl('/prototype/foo?x=1'), '/prototype/foo');
assert.equal(extractRouteFromUrl('http://localhost:5173/prototype/foo?x=1'), '/prototype/foo');
assert.equal(extractRouteFromUrl('http://localhost:5173/#/prototype/foo?x=1'), '/prototype/foo');

assert.throws(
  () => parseProtoBridgeConfig(JSON.stringify({ outputRoot: './output' })),
  /Unknown config field/,
);
assert.throws(
  () => parseProtoBridgeConfig(JSON.stringify({ prototypeUrl: 'http://localhost' })),
  /Unknown config field/,
);
assert.throws(
  () => parseProtoBridgeConfig(JSON.stringify({ page: { url: pageUrl } })),
  /Unknown config field/,
);
assert.throws(
  () => parseProtoBridgeConfig(JSON.stringify({ runtime: { noCapture: true } })),
  /Unknown config field/,
);
assert.throws(
  () => parseProtoBridgeConfig(JSON.stringify({ profile: { id: 'youfi' } })),
  /profile must be a string or false/,
);

console.log('config resolver tests passed');
