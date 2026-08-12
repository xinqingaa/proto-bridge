import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  comparePngArtifacts,
  renderFlutterTargetCase,
  replayFlutterTargetScenario,
} from '../../src/target/flutter-app/review.js';

const execFileAsync = promisify(execFile);
let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe('Flutter authoritative Review adapter', () => {
  it('runs a target-owned deterministic launcher and Scenario command', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'pb-flutter-review-'));
    await mkdir(path.join(root, 'docs'), { recursive: true });
    const png = new PNG({ width: 2, height: 3 });
    png.data.fill(255);
    await writeFile(path.join(root, 'fixture.png'), PNG.sync.write(png));
    const scenarioTransition = {
      caseId: 'open.case.scenario', screenId: 'open.screen', scenarioId: 'open.scenario', checkpointId: 'opened',
      preState: { caseId: 'open.case.scenario', shell: { screenId: 'open.screen', variantId: 'closed' }, visibleRegionIds: ['open.trigger'], keyedCollections: [], values: [], complete: true, unknownKeys: [] },
      actions: [{ actionId: 'open', kind: 'click', targetRegionId: 'open.trigger' }],
      postState: { caseId: 'open.case.scenario', shell: { screenId: 'open.screen', variantId: 'open' }, visibleRegionIds: ['open.trigger', 'open.panel'], keyedCollections: [], values: [], complete: true, unknownKeys: [] },
      visibleResult: { visibleRegionIds: ['open.trigger', 'open.panel'], changedRegionIds: ['open.panel'] },
    };
    await writeFile(path.join(root, 'scenario.json'), JSON.stringify(scenarioTransition));
    await writeFile(path.join(root, 'scenario.mjs'), "import { readFileSync } from 'node:fs'; process.stdout.write(readFileSync('scenario.json', 'utf8'));\n");
    await writeFile(path.join(root, 'proto-bridge.target.json'), JSON.stringify({
      version: 1,
      technology: 'flutter',
      review: {
        version: 1,
        platform: 'ios-simulator',
        launcher: { command: ['cp', 'fixture.png', '{output}'], scenarioCommand: ['node', 'scenario.mjs'] },
        device: { udid: 'fixture-device', runtime: 'fixture-runtime', logicalWidth: 2, logicalHeight: 3, dpr: 1, locale: 'en_US', theme: 'light', textScale: 1, safeArea: 'fixture', settle: 'no-pending-frames' },
        cases: { 'open.case.default': { screenId: 'open.screen' } },
        scenarios: { 'open.case.scenario': { screenId: 'open.screen', scenarioId: 'open.scenario' } },
      },
    }));
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['add', '.'], { cwd: root });
    await execFileAsync('git', ['-c', 'user.name=ProtoBridge', '-c', 'user.email=review@example.invalid', 'commit', '-m', 'fixture'], { cwd: root });
    const head = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const receipt = await renderFlutterTargetCase({ targetRoot: root, caseId: 'open.case.default', attemptId: 'attempt-1', expectedTargetHead: head });
    expect(receipt.artifact).toMatchObject({ width: 2, height: 3, kind: 'target' });
    expect(receipt.command).toEqual(['cp', 'fixture.png', expect.stringContaining('target.png')]);
    const scenario = await replayFlutterTargetScenario({ targetRoot: root, caseId: 'open.case.scenario', expectedTargetHead: head });
    expect(scenario).toMatchObject({ scenarioId: 'open.scenario', screenId: 'open.screen' });
    expect(scenario.transition).toEqual(scenarioTransition);
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
