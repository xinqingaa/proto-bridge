import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractRouteFromUrl,
  parseProtoBridgeConfig,
  resolveProtoBridgeInput,
  type ProtoBridgeConfig,
} from '../src/config/index.js';

const configDir = path.resolve('/project/config');
const cwd = path.resolve('/project');
const pageUrl = 'http://localhost:5173/prototype/project/task-list?variant=default&theme=light';
const fullConfig: ProtoBridgeConfig = {
  schemaVersion: 1,
  source: { adapter: 'vue3-prototype', root: './source-app' },
  target: { adapter: 'flutter-app', root: './target-app' },
  runtime: {
    capture: true,
    viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  },
  output: { root: './output' },
};

describe('ProtoBridge config resolution', () => {
  it('resolves source, target, runtime URL, and output from stable config', () => {
    const resolved = resolveProtoBridgeInput({
      config: fullConfig,
      configDir,
      cwd,
      overrides: { url: pageUrl },
      requirePageInput: true,
    });

    expect(resolved.page.route).toBe('/prototype/project/task-list');
    expect(resolved.input.url).toBe(pageUrl);
    expect(resolved.input.source?.root).toBe(path.join(configDir, 'source-app'));
    expect(resolved.input.target?.root).toBe(path.join(configDir, 'target-app'));
    expect(resolved.input.capture).toBe(true);
    expect(resolved.input.buildPlan).toBe(true);
    expect(resolved.input.buildReview).toBe(true);
  });

  it('supports URL-only capture and explicit route override', () => {
    const urlOnly = resolveProtoBridgeInput({
      configDir,
      cwd,
      overrides: { url: pageUrl },
      requirePageInput: true,
    });
    expect(urlOnly.input.source).toBeUndefined();
    expect(urlOnly.input.target).toBeUndefined();
    expect(urlOnly.input.capture).toBe(true);
    expect(urlOnly.input.buildPlan).toBe(false);

    const overridden = resolveProtoBridgeInput({
      config: fullConfig,
      configDir,
      cwd,
      overrides: { url: pageUrl, route: '/prototype/override' },
      requirePageInput: true,
    });
    expect(overridden.page.route).toBe('/prototype/override');
  });

  it('extracts history and legacy hash routes and rejects architecture config fields', () => {
    expect(extractRouteFromUrl('/prototype/foo?x=1')).toBe('/prototype/foo');
    expect(extractRouteFromUrl('http://localhost:5173/prototype/foo?x=1')).toBe('/prototype/foo');
    expect(extractRouteFromUrl('http://localhost:5173/#/prototype/foo?x=1')).toBe('/prototype/foo');
    expect(() => parseProtoBridgeConfig(JSON.stringify({ profile: 'auto' }))).toThrow(/Unknown config field/);
    expect(() => parseProtoBridgeConfig(JSON.stringify({ outputRoot: './output' }))).toThrow(/Unknown config field/);
  });
});
