import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { V2ContractError } from '../contracts/errors.js';
import type {
  WorkspaceResetPlan,
  WorkspaceResetScopeSummary,
} from '../service-contract/protocol.js';
import { generateOperationalId } from './id-generator.js';

export function resetPlansRootFromStoreRoot(storeRoot: string): string {
  return path.join(path.dirname(path.resolve(storeRoot)), 'reset-plans');
}

export function reviewsRootFromStoreRoot(storeRoot: string, workspaceId: string): string {
  return path.join(path.dirname(path.resolve(storeRoot)), 'reviews', workspaceId);
}

export async function createWorkspaceResetPlan(input: {
  workspaceId: string;
  generationId: string;
  storeRoot: string;
  deliveriesRoot: string;
  reviewsRoot: string;
  runningTasks?: string[];
  ttlMs?: number;
  now?: Date;
}): Promise<WorkspaceResetPlan> {
  const createdAt = (input.now ?? new Date()).toISOString();
  const expiresAt = new Date(Date.parse(createdAt) + (input.ttlMs ?? 15 * 60 * 1000)).toISOString();
  const inventory = await inspectWorkspaceResetScope(input);
  const plan: WorkspaceResetPlan = {
    planId: generateOperationalId('reset-plan'),
    workspaceId: input.workspaceId,
    generationId: input.generationId,
    inventoryDigest: inventory.inventoryDigest,
    evidence: inventory.evidence,
    deliveries: inventory.deliveries,
    reviews: inventory.reviews,
    prototypeLifecycle: inventory.prototypeLifecycle,
    runningTasks: [...(input.runningTasks ?? [])].sort(),
    createdAt,
    expiresAt,
    irreversibleWarnings: [
      'Reset permanently removes this Workspace generation Evidence and local Delivery artifacts.',
      'Unexported Review Sessions are permanently removed; exported audit packages outside the Workspace are preserved.',
      'Old Handoff and Review references cannot be resumed under the new generation.',
    ],
  };
  const plansRoot = resetPlansRootFromStoreRoot(input.storeRoot);
  await mkdir(plansRoot, { recursive: true });
  await writeFile(path.join(plansRoot, `${plan.planId}.json`), `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' });
  return plan;
}

export async function validateWorkspaceResetPlan(input: {
  planId: string;
  workspaceId: string;
  generationId: string;
  storeRoot: string;
  deliveriesRoot: string;
  reviewsRoot: string;
  runningTasks?: string[];
  now?: Date;
}): Promise<WorkspaceResetPlan> {
  const planPath = path.join(resetPlansRootFromStoreRoot(input.storeRoot), `${input.planId}.json`);
  let plan: WorkspaceResetPlan;
  try {
    plan = JSON.parse(await readFile(planPath, 'utf8')) as WorkspaceResetPlan;
  } catch {
    throw new V2ContractError('unknown-reference', `Reset plan ${input.planId} does not exist.`);
  }
  if (plan.workspaceId !== input.workspaceId || plan.generationId !== input.generationId) {
    throw new V2ContractError('workspace-generation-mismatch', 'Reset plan does not match the requested Workspace generation.');
  }
  if (Date.parse(plan.expiresAt) <= (input.now ?? new Date()).getTime()) {
    throw new V2ContractError('reset-plan-expired', `Reset plan ${plan.planId} expired at ${plan.expiresAt}.`);
  }
  const inventory = await inspectWorkspaceResetScope(input);
  const runningTasks = [...(input.runningTasks ?? [])].sort();
  if (inventory.inventoryDigest !== plan.inventoryDigest || JSON.stringify(runningTasks) !== JSON.stringify(plan.runningTasks)) {
    throw new V2ContractError('reset-plan-drift', 'Workspace reset scope changed after preview; create a new plan.');
  }
  return plan;
}

export async function inspectWorkspaceResetScope(input: {
  workspaceId: string;
  storeRoot: string;
  deliveriesRoot: string;
  reviewsRoot: string;
}): Promise<{
  evidence: WorkspaceResetScopeSummary;
  deliveries: WorkspaceResetScopeSummary;
  reviews: WorkspaceResetScopeSummary;
  prototypeLifecycle: WorkspaceResetScopeSummary;
  inventoryDigest: string;
}> {
  const [evidence, deliveries, reviews, prototypeLifecycle] = await Promise.all([
    inspectTree(input.storeRoot, new Set(['.lock', 'pbwork'])),
    inspectTree(input.deliveriesRoot),
    inspectTree(input.reviewsRoot),
    inspectTree(path.join(input.storeRoot, 'pbwork', input.workspaceId)),
  ]);
  const digest = createHash('sha256');
  for (const [kind, tree] of [['evidence', evidence], ['deliveries', deliveries], ['reviews', reviews], ['prototype-lifecycle', prototypeLifecycle]] as const) {
    for (const entry of tree.entries) digest.update(`${kind}\0${entry.path}\0${entry.bytes}\0${entry.digest}\n`);
  }
  return {
    evidence: { objects: evidence.entries.length, bytes: evidence.bytes },
    deliveries: { objects: deliveries.entries.length, bytes: deliveries.bytes },
    reviews: { objects: reviews.entries.length, bytes: reviews.bytes },
    prototypeLifecycle: {
      objects: prototypeLifecycle.entries.length,
      bytes: prototypeLifecycle.bytes,
    },
    inventoryDigest: `sha256:${digest.digest('hex')}`,
  };
}

async function inspectTree(root: string, excludedNames = new Set<string>()): Promise<{
  entries: Array<{ path: string; bytes: number; digest: string }>;
  bytes: number;
}> {
  const entries: Array<{ path: string; bytes: number; digest: string }> = [];
  async function visit(directory: string): Promise<void> {
    let children;
    try {
      children = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (isEnoent(error)) return;
      throw error;
    }
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      if (excludedNames.has(child.name)) continue;
      const absolute = path.join(directory, child.name);
      if (child.isDirectory()) await visit(absolute);
      else if (child.isFile()) {
        const bytes = (await stat(absolute)).size;
        const content = await readFile(absolute);
        entries.push({
          path: path.relative(root, absolute).split(path.sep).join('/'),
          bytes,
          digest: createHash('sha256').update(content).digest('hex'),
        });
      }
    }
  }
  await visit(root);
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return { entries, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0) };
}

function isEnoent(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}
