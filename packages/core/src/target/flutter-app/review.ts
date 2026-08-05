import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';
import { z } from 'zod';
import type {
  ReviewArtifact,
  TargetScenarioTransition,
  TargetStateSnapshot,
} from '../../review/contracts.js';
import { FlutterReviewContract, type FlutterReviewContract as FlutterReviewContractType } from './resolver.js';

const execFileAsync = promisify(execFile);
export const FLUTTER_COMPARATOR_VERSION = 'proto-bridge-pixel-regions-v1';

const stateScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const targetStateSnapshotSchema = z.object({
  caseId: z.string().min(1),
  shell: z.object({ screenId: z.string().min(1), variantId: z.string().min(1) }).strict(),
  visibleRegionIds: z.array(z.string().min(1)),
  keyedCollections: z.array(z.object({
    collectionId: z.string().min(1),
    keys: z.array(z.string().min(1)),
  }).strict()),
  values: z.array(z.object({
    regionId: z.string().min(1),
    key: z.string().min(1),
    value: stateScalarSchema,
  }).strict()),
  complete: z.boolean(),
  unknownKeys: z.array(z.string().min(1)),
}).strict();
const targetScenarioTransitionSchema = z.object({
  caseId: z.string().min(1),
  screenId: z.string().min(1),
  scenarioId: z.string().min(1),
  checkpointId: z.string().min(1),
  preState: targetStateSnapshotSchema,
  actions: z.array(z.object({
    actionId: z.string().min(1),
    kind: z.enum(['click', 'input', 'select', 'submit', 'custom']),
    targetRegionId: z.string().min(1).optional(),
    input: stateScalarSchema.optional(),
  }).strict()),
  postState: targetStateSnapshotSchema,
  visibleResult: z.object({
    visibleRegionIds: z.array(z.string().min(1)),
    changedRegionIds: z.array(z.string().min(1)),
  }).strict(),
}).strict();

export type FlutterRenderReceipt = {
  contract: FlutterReviewContractType;
  artifact: ReviewArtifact;
  bytes: Uint8Array;
  command: string[];
  exitCode: 0;
  stdoutDigest: string;
  targetHead: string;
  worktreeStatusDigest: string;
};

export async function readFlutterReviewContract(targetRoot: string): Promise<FlutterReviewContractType> {
  const root = await realpath(targetRoot);
  const parsed = JSON.parse(await readFile(path.join(root, 'docs/proto-bridge.target.json'), 'utf8')) as { review?: unknown };
  return FlutterReviewContract.parse(parsed.review);
}

export async function renderFlutterTargetCase(input: {
  targetRoot: string;
  caseId: string;
  attemptId: string;
  expectedTargetHead: string;
}): Promise<FlutterRenderReceipt> {
  const targetRoot = await realpath(input.targetRoot);
  const contract = await readFlutterReviewContract(targetRoot);
  const selected = contract.cases[input.caseId];
  if (!selected) throw new Error(`Flutter Review launcher has no Case ${input.caseId}.`);
  const identity = await targetIdentity(targetRoot);
  if (identity.head !== input.expectedTargetHead) throw new Error(`Target commit drifted: expected ${input.expectedTargetHead}, received ${identity.head}.`);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'proto-bridge-render-'));
  try {
    const output = path.join(temporary, 'target.png');
    const variables = { caseId: input.caseId, screenId: selected.screenId, output, deviceId: contract.device.udid };
    const command = [...contract.launcher.command.map((item) => interpolate(item, variables)), ...(selected.arguments ?? []).map((item) => interpolate(item, variables))];
    const result = await execFileAsync(command[0]!, command.slice(1), {
      cwd: targetRoot,
      env: { ...process.env, ...contract.launcher.environment },
      timeout: contract.launcher.timeoutMs ?? 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const bytes = await readFile(output);
    const dimensions = pngDimensions(bytes);
    const expectedWidth = Math.round(contract.device.logicalWidth * contract.device.dpr);
    const expectedHeight = Math.round(contract.device.logicalHeight * contract.device.dpr);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
      throw new Error(`Flutter Review screenshot viewport is ${dimensions.width}x${dimensions.height}; expected ${expectedWidth}x${expectedHeight}.`);
    }
    const digest = sha256(bytes);
    return {
      contract,
      artifact: {
        kind: 'target', digest, mimeType: 'image/png', byteLength: bytes.byteLength,
        width: dimensions.width, height: dimensions.height,
        environment: {
          platform: contract.platform, deviceId: contract.device.udid, runtime: contract.device.runtime,
          logicalWidth: contract.device.logicalWidth, logicalHeight: contract.device.logicalHeight, dpr: contract.device.dpr,
          locale: contract.device.locale, theme: contract.device.theme, textScale: contract.device.textScale,
          safeArea: contract.device.safeArea, settle: contract.device.settle, targetHead: identity.head,
          worktreeStatusDigest: identity.statusDigest, commandDigest: sha256(Buffer.from(command.join('\0'))), exitCode: 0,
        },
        owner: { screenId: selected.screenId, caseId: input.caseId, attemptId: input.attemptId },
      },
      bytes,
      command,
      exitCode: 0,
      stdoutDigest: sha256(Buffer.from(result.stdout)),
      targetHead: identity.head,
      worktreeStatusDigest: identity.statusDigest,
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function replayFlutterTargetScenario(input: {
  targetRoot: string;
  caseId: string;
  expectedTargetHead: string;
}): Promise<{ screenId: string; scenarioId: string; receiptDigest: string; command: string[]; environment: Record<string, string | number>; transition: TargetScenarioTransition }> {
  const targetRoot = await realpath(input.targetRoot);
  const contract = await readFlutterReviewContract(targetRoot);
  const selected = contract.scenarios?.[input.caseId];
  const base = contract.launcher.scenarioCommand;
  if (!selected || !base) throw new Error(`Flutter Review launcher has no Scenario for Case ${input.caseId}.`);
  const identity = await targetIdentity(targetRoot);
  if (identity.head !== input.expectedTargetHead) throw new Error(`Target commit drifted: expected ${input.expectedTargetHead}, received ${identity.head}.`);
  const variables = { caseId: input.caseId, screenId: selected.screenId, scenarioId: selected.scenarioId, deviceId: contract.device.udid, output: '' };
  const command = [...base.map((item) => interpolate(item, variables)), ...(selected.arguments ?? []).map((item) => interpolate(item, variables))];
  const result = await execFileAsync(command[0]!, command.slice(1), {
    cwd: targetRoot,
    env: { ...process.env, ...contract.launcher.environment },
    timeout: contract.launcher.timeoutMs ?? 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  const transition = targetScenarioTransitionSchema.parse(JSON.parse(result.stdout)) as TargetScenarioTransition;
  if (
    transition.caseId !== input.caseId
    || transition.screenId !== selected.screenId
    || transition.scenarioId !== selected.scenarioId
  ) throw new Error('Flutter Scenario inspector returned an identity outside the selected Review Case.');
  const receiptDigest = sha256(Buffer.from(JSON.stringify({ command, stdout: result.stdout, stderr: result.stderr, identity, device: contract.device })));
  return { screenId: selected.screenId, scenarioId: selected.scenarioId, receiptDigest, command, environment: { deviceId: contract.device.udid, runtime: contract.device.runtime, exitCode: 0 }, transition };
}

export async function inspectFlutterTargetState(input: {
  targetRoot: string;
  caseId: string;
}): Promise<TargetStateSnapshot> {
  const targetRoot = await realpath(input.targetRoot);
  const contract = await readFlutterReviewContract(targetRoot);
  const selected = contract.cases[input.caseId];
  const base = contract.launcher.stateCommand;
  if (!selected || !base) throw new Error(`Flutter Review launcher has no State inspector for Case ${input.caseId}.`);
  const variables = { caseId: input.caseId, screenId: selected.screenId, scenarioId: '', deviceId: contract.device.udid, output: '' };
  const command = [...base.map((item) => interpolate(item, variables)), ...(selected.stateArguments ?? []).map((item) => interpolate(item, variables))];
  const result = await execFileAsync(command[0]!, command.slice(1), {
    cwd: targetRoot,
    env: { ...process.env, ...contract.launcher.environment },
    timeout: contract.launcher.timeoutMs ?? 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  const snapshot = targetStateSnapshotSchema.parse(JSON.parse(result.stdout)) as TargetStateSnapshot;
  if (snapshot.caseId !== input.caseId || snapshot.shell.screenId !== selected.screenId) {
    throw new Error('Flutter State inspector returned an identity outside the selected Review Case.');
  }
  return snapshot;
}

export function comparePngArtifacts(input: {
  source: Uint8Array;
  target: Uint8Array;
  owner: ReviewArtifact['owner'];
}): {
  comparable: boolean;
  reason?: string;
  normalizedDiffSignature?: string;
  diff?: { artifact: ReviewArtifact; bytes: Uint8Array };
  overlay?: { artifact: ReviewArtifact; bytes: Uint8Array };
} {
  let source: PNG;
  let target: PNG;
  try {
    source = PNG.sync.read(Buffer.from(input.source));
    target = PNG.sync.read(Buffer.from(input.target));
  } catch {
    return { comparable: false, reason: 'source-or-target-is-not-a-readable-png' };
  }
  if (source.width !== target.width || source.height !== target.height) {
    return { comparable: false, reason: `dimension-mismatch:${source.width}x${source.height}:${target.width}x${target.height}` };
  }
  const diff = new PNG({ width: source.width, height: source.height });
  const overlay = new PNG({ width: source.width, height: source.height });
  const signature = createHash('sha256');
  for (let index = 0; index < source.data.length; index += 4) {
    const delta = Math.max(
      Math.abs(source.data[index]! - target.data[index]!),
      Math.abs(source.data[index + 1]! - target.data[index + 1]!),
      Math.abs(source.data[index + 2]! - target.data[index + 2]!),
      Math.abs(source.data[index + 3]! - target.data[index + 3]!),
    );
    const changed = delta > 12;
    signature.update(changed ? '1' : '0');
    const gray = Math.round((source.data[index]! + source.data[index + 1]! + source.data[index + 2]!) / 3);
    diff.data[index] = changed ? 255 : gray;
    diff.data[index + 1] = changed ? 0 : gray;
    diff.data[index + 2] = changed ? 180 : gray;
    diff.data[index + 3] = 255;
    overlay.data[index] = Math.round((source.data[index]! + target.data[index]!) / 2);
    overlay.data[index + 1] = Math.round((source.data[index + 1]! + target.data[index + 1]!) / 2);
    overlay.data[index + 2] = Math.round((source.data[index + 2]! + target.data[index + 2]!) / 2);
    overlay.data[index + 3] = 255;
  }
  const diffBytes = PNG.sync.write(diff);
  const overlayBytes = PNG.sync.write(overlay);
  const artifact = (kind: 'diff' | 'overlay', bytes: Buffer): ReviewArtifact => ({
    kind, digest: sha256(bytes), mimeType: 'image/png', byteLength: bytes.byteLength,
    width: source.width, height: source.height, owner: input.owner,
    environment: { comparatorVersion: FLUTTER_COMPARATOR_VERSION },
  });
  return {
    comparable: true,
    normalizedDiffSignature: `sha256:${signature.update(`${source.width}x${source.height}`).digest('hex')}`,
    diff: { artifact: artifact('diff', diffBytes), bytes: diffBytes },
    overlay: { artifact: artifact('overlay', overlayBytes), bytes: overlayBytes },
  };
}

function interpolate(value: string, variables: Record<string, string>): string {
  return value.replace(/\{(caseId|screenId|scenarioId|output|deviceId)\}/g, (_, key: string) => variables[key] ?? '');
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const png = PNG.sync.read(Buffer.from(bytes));
  return { width: png.width, height: png.height };
}

async function targetIdentity(targetRoot: string): Promise<{ head: string; statusDigest: string }> {
  const head = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: targetRoot })).stdout.trim();
  const status = (await execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: targetRoot })).stdout;
  return { head, statusDigest: sha256(Buffer.from(status)) };
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
