#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LocalFileStore } from '../../../../packages/core/dist/v2/store/index.js';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const sourceRoot = path.join(repoRoot, '.proto-bridge/store');
const outputPath = path.join(runDir, 'phase-3-legacy-copy-audit.json');
const copyParent = await mkdtemp(path.join(os.tmpdir(), 'pb-fixed-store-generation-audit-'));
const copyRoot = path.join(copyParent, 'store-copy');
const fixed = {
  workspaceId: 'pbwork-local',
  bundleId: 'bundle-2026-08-03t095053078-241d3a74',
  runId: 'run-2026-08-03t095053079-14b6f18f',
  snapshotId: 'snapshot-2026-08-03t095114638-511379f3',
  handoffId: 'handoff-2026-08-03t100731725-9a0121d7',
};

try {
  const sourceManifestBefore = await digestFile(path.join(sourceRoot, 'workspace.json'));
  const sourceInventoryBefore = await digestTree(sourceRoot, new Set(['workspace.json', '.lock']));
  await cp(sourceRoot, copyRoot, { recursive: true, force: false });
  const copyInventoryBefore = await digestTree(copyRoot, new Set(['workspace.json', '.lock']));
  assert(copyInventoryBefore.digest === sourceInventoryBefore.digest, 'copy inventory differs before migration');

  const store = new LocalFileStore({ root: copyRoot, workspaceId: fixed.workspaceId });
  const initialized = await store.init();
  assert(initialized.migration?.kind === 'legacy-generation-upgrade', 'copy was not migrated from legacy generation');
  const resolved = {
    bundle: Boolean(await store.getBundle(fixed.bundleId)),
    run: Boolean(await store.getRun(fixed.bundleId, fixed.runId)),
    snapshot: Boolean(await store.getSnapshot(fixed.bundleId, fixed.snapshotId)),
    handoff: Boolean(await store.getHandoff(fixed.handoffId)),
  };
  await store.close();

  const copyInventoryAfter = await digestTree(copyRoot, new Set(['workspace.json', '.lock']));
  const sourceManifestAfter = await digestFile(path.join(sourceRoot, 'workspace.json'));
  const sourceInventoryAfter = await digestTree(sourceRoot, new Set(['workspace.json', '.lock']));
  assert(copyInventoryAfter.digest === copyInventoryBefore.digest, 'migration changed copied Evidence inventory');
  assert(sourceManifestAfter === sourceManifestBefore, 'source Workspace manifest changed');
  assert(sourceInventoryAfter.digest === sourceInventoryBefore.digest, 'source Workspace Evidence inventory changed');
  assert(Object.values(resolved).every(Boolean), 'a fixed ID did not resolve after copy migration');

  const migratedManifest = JSON.parse(await readFile(path.join(copyRoot, 'workspace.json'), 'utf8'));
  const receipt = {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    sourceRoot,
    sourceOpenedAsWriter: false,
    temporaryCopyRemovedAfterAudit: true,
    fixed,
    sourceManifestSha256Before: sourceManifestBefore,
    sourceManifestSha256After: sourceManifestAfter,
    sourceInventoryBefore,
    sourceInventoryAfter,
    copyInventoryBefore,
    copyInventoryAfter,
    migration: initialized.migration,
    migratedLifecycle: initialized.lifecycle,
    migratedManifest: {
      storeLayoutVersion: migratedManifest.storeLayoutVersion,
      generationId: migratedManifest.generationId,
      migratedAt: migratedManifest.migratedAt,
    },
    fixedIdsResolvedAfterMigration: resolved,
    result: 'passed',
  };
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ outputPath, result: receipt.result, generationId: migratedManifest.generationId, inventoryDigest: copyInventoryAfter.digest }, null, 2)}\n`);
} finally {
  await rm(copyParent, { recursive: true, force: true });
}

async function digestTree(root, excludedNames) {
  const entries = [];
  async function visit(directory) {
    const children = await readdir(directory, { withFileTypes: true });
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      if (excludedNames.has(child.name)) continue;
      const absolute = path.join(directory, child.name);
      if (child.isDirectory()) await visit(absolute);
      else if (child.isFile()) entries.push({
        path: path.relative(root, absolute).split(path.sep).join('/'),
        bytes: (await stat(absolute)).size,
        digest: await digestFile(absolute),
      });
    }
  }
  await visit(root);
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const hash = createHash('sha256');
  for (const entry of entries) hash.update(`${entry.path}\0${entry.bytes}\0${entry.digest}\n`);
  return { objectCount: entries.length, totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), digest: `sha256:${hash.digest('hex')}` };
}

async function digestFile(file) {
  return `sha256:${createHash('sha256').update(await readFile(file)).digest('hex')}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
