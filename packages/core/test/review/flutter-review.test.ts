import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  comparePngArtifacts,
  readFlutterReviewContract,
} from '../../src/target/flutter-app/review.js';

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe('Flutter authoritative Review adapter', () => {
  it('accepts only the declarative Flutter MCP Review contract', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-review-'));
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await writeFile(path.join(root, 'proto-bridge.target.json'), JSON.stringify({
      version: 1,
      technology: 'flutter',
      review: {
        version: 2,
        provider: 'dart-flutter-mcp',
        runtime: {
          applicationIdentity: 'example.app',
          identityServiceExtension: 'ext.protoBridge.identity',
          prepareServiceExtension: 'ext.protoBridge.prepare',
          observeServiceExtension: 'ext.protoBridge.observe',
          observationContractVersion: 1,
          reviewHarnessVersion: '1',
          textEntryEmulation: true,
        },
        cases: { 'open.case.default': { screenId: 'open.screen', route: '/open' } },
        scenarios: {
          'open.case.default': {
            screenId: 'open.screen', scenarioId: 'open.scenario', checkpointId: 'opened',
            actions: [{ actionId: 'open', kind: 'tap', targetRegionId: 'open.trigger', finder: { kind: 'value-key', value: 'open-trigger' } }],
          },
        },
      },
    }));
    await expect(readFlutterReviewContract(root)).resolves.toMatchObject({
      version: 2,
      provider: 'dart-flutter-mcp',
      runtime: { applicationIdentity: 'example.app' },
    });

    await writeFile(path.join(root, 'proto-bridge.target.json'), JSON.stringify({
      version: 1,
      technology: 'flutter',
      review: { version: 1, platform: 'ios-simulator', launcher: { command: ['cp', 'fixture.png', '{output}'] } },
    }));
    await expect(readFlutterReviewContract(root)).rejects.toThrow();
  });

  it('emits visible diff/overlay artifacts and a stable non-score signature', () => {
    const source = new PNG({ width: 2, height: 1 });
    source.data.fill(255);
    const target = new PNG({ width: 2, height: 1 });
    target.data.fill(255);
    target.data[0] = 0;
    const compared = comparePngArtifacts({
      source: PNG.sync.write(source),
      target: PNG.sync.write(target),
      owner: { screenId: 'open.screen', caseId: 'open.case.default', attemptId: 'attempt-1' },
    });
    expect(compared).toMatchObject({ comparable: true, normalizedDiffSignature: expect.stringMatching(/^sha256:/) });
    expect(compared.diff?.artifact.kind).toBe('diff');
    expect(compared.overlay?.artifact.kind).toBe('overlay');
    expect(comparePngArtifacts({ source: PNG.sync.write(source), target: PNG.sync.write(new PNG({ width: 1, height: 1 })), owner: { screenId: 'open.screen' } })).toMatchObject({ comparable: false, reason: expect.stringMatching(/dimension-mismatch/) });
  });
});
