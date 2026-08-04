import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createWorkspaceResetPlan,
  reviewsRootFromStoreRoot,
  validateWorkspaceResetPlan,
} from '../../../src/v2/store/workspace-lifecycle.js';

let root: string;
let storeRoot: string;
let deliveriesRoot: string;
let reviewsRoot: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'pb-reset-plan-'));
  storeRoot = path.join(root, 'store');
  deliveriesRoot = path.join(root, 'deliveries');
  reviewsRoot = reviewsRootFromStoreRoot(storeRoot, 'workspace-test');
  await Promise.all([mkdir(storeRoot), mkdir(deliveriesRoot), mkdir(reviewsRoot, { recursive: true })]);
  await writeFile(path.join(storeRoot, 'workspace.json'), '{"generationId":"generation-a"}\n');
  await writeFile(path.join(deliveriesRoot, 'receipt.json'), '{}\n');
  await writeFile(path.join(reviewsRoot, 'events.ndjson'), '{}\n');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('Workspace reset plan', () => {
  it('binds preview to generation, inventory and running tasks', async () => {
    const plan = await createWorkspaceResetPlan({
      workspaceId: 'workspace-test',
      generationId: 'generation-a',
      storeRoot,
      deliveriesRoot,
      reviewsRoot,
      runningTasks: ['job:b', 'job:a'],
    });
    expect(plan).toMatchObject({
      generationId: 'generation-a',
      evidence: { objects: 1 },
      deliveries: { objects: 1 },
      reviews: { objects: 1 },
      runningTasks: ['job:a', 'job:b'],
    });
    await expect(validateWorkspaceResetPlan({
      planId: plan.planId,
      workspaceId: plan.workspaceId,
      generationId: plan.generationId,
      storeRoot,
      deliveriesRoot,
      reviewsRoot,
      runningTasks: ['job:b', 'job:a'],
    })).resolves.toEqual(plan);
  });

  it('rejects generation mismatch, scope drift and expiration', async () => {
    const now = new Date('2026-08-04T00:00:00.000Z');
    const plan = await createWorkspaceResetPlan({
      workspaceId: 'workspace-test',
      generationId: 'generation-a',
      storeRoot,
      deliveriesRoot,
      reviewsRoot,
      now,
      ttlMs: 1000,
    });
    await expect(validateWorkspaceResetPlan({
      planId: plan.planId,
      workspaceId: plan.workspaceId,
      generationId: 'generation-b',
      storeRoot,
      deliveriesRoot,
      reviewsRoot,
      now,
    })).rejects.toMatchObject({ code: 'workspace-generation-mismatch' });

    await writeFile(path.join(deliveriesRoot, 'new.json'), '{}\n');
    await expect(validateWorkspaceResetPlan({
      planId: plan.planId,
      workspaceId: plan.workspaceId,
      generationId: plan.generationId,
      storeRoot,
      deliveriesRoot,
      reviewsRoot,
      now,
    })).rejects.toMatchObject({ code: 'reset-plan-drift' });

    await expect(validateWorkspaceResetPlan({
      planId: plan.planId,
      workspaceId: plan.workspaceId,
      generationId: plan.generationId,
      storeRoot,
      deliveriesRoot,
      reviewsRoot,
      now: new Date(now.getTime() + 1001),
    })).rejects.toMatchObject({ code: 'reset-plan-expired' });
  });
});
