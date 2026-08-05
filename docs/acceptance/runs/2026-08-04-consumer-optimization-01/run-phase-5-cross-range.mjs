#!/usr/bin/env node

/**
 * Phase 5.4 cross-range regression:
 * independent prototype + target-owned declarations + partial Evidence +
 * unsupported adapter + cache/path safety.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures } from '../../../../packages/core/dist/v2/index.js';
import { createAgentHandoff } from '../../../../packages/core/dist/v2/capture/index.js';
import { LocalFileStore } from '../../../../packages/core/dist/v2/store/index.js';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runDir, '../../../..');
const outputPath = path.join(runDir, 'phase-5-cross-range.json');
const reference = fixtures.ledgerPlanetTaskList;
const workspaceId = reference.WORKSPACE_ID;
const storeRoot = await mkdtemp(path.join(os.tmpdir(), 'pb-cross-range-store-'));
const targetRoot = await mkdtemp(path.join(os.tmpdir(), 'pb-cross-range-target-'));
const unsupportedRoot = await mkdtemp(path.join(os.tmpdir(), 'pb-cross-range-unsupported-'));
let writer;
let client;
let handoffId;

try {
  writer = await createPartialEvidence();
  client = await startClient([
    '--store-root',
    storeRoot,
    '--workspace',
    workspaceId,
  ]);

  const workspace = await call('inspect_evidence_workspace', {});
  assert(workspace.workspace?.workspaceId === workspaceId, 'Cross-range MCP bound to the wrong Workspace.');

  const handoffIndex = await call('read_handoff_index', {
    handoffId,
  });
  assert(
    handoffIndex.fixedRefs?.snapshotId &&
      handoffIndex.omittedCategories?.includes('full-facts') &&
      handoffIndex.requiredCapabilities?.includes('evidence-detail'),
    'Partial Evidence did not preserve fixed identity and omitted categories.',
  );
  const screenPacket = await call('read_screen_packet', {
    handoffId,
    screenId: reference.SCREEN_ID,
  });
  assert(
    screenPacket.baselineCaseId === reference.TASK_LIST_CASE_ID &&
      screenPacket.cases?.length === 1,
    'Cross-range Screen packet did not preserve the selected partial case.',
  );
  const partialEvidence = {
    workspaceId,
    prototypeId: reference.PROTOTYPE_ID,
    handoffId,
    snapshotId: handoffIndex.fixedRefs.snapshotId,
    omittedCategories: handoffIndex.omittedCategories,
    screenId: screenPacket.screenId,
    caseCount: screenPacket.cases?.length ?? 0,
  };

  await createTargetFixture();
  const componentBefore = await call('resolve_target_components', {
    targetRoot,
    componentIds: ['another-prototype.card', 'cache.widget', 'open.unknown'],
  });
  const tokenResult = await call('resolve_target_tokens', {
    targetRoot,
    tokenIds: ['design.token-primary', 'open.token-unknown'],
  });
  assert(
    statuses(componentBefore) === 'resolved,stale,unresolved',
    `Unexpected independent component statuses: ${statuses(componentBefore)}`,
  );
  assert(
    statuses(tokenResult) === 'resolved,unresolved',
    `Unexpected independent token statuses: ${statuses(tokenResult)}`,
  );

  await write(
    targetRoot,
    'lib/features/later_widget.dart',
    'class LaterWidget extends StatelessWidget {}\n',
  );
  const componentAfter = await call('resolve_target_components', {
    targetRoot,
    componentIds: ['cache.widget'],
  });
  assert(
    statuses(componentAfter) === 'resolved',
    `Target inventory did not invalidate after a Dart file changed: ${statuses(componentAfter)}`,
  );

  const unsupported = await call('resolve_target_tokens', {
    targetRoot: unsupportedRoot,
    tokenIds: ['brand.token'],
  });
  assert(
    unsupported.adapterId === 'unsupported' &&
      statuses(unsupported) === 'unsupported',
    'Unsupported Target was not reported without inventing a mapping.',
  );

  await expectToolError(
    call('resolve_target_components', {
      targetRoot,
      componentIds: ['another-prototype.card'],
      excludePaths: [path.dirname(targetRoot)],
    }),
    /inside targetRoot/,
  );

  const output = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    status: 'passed',
    runner: {
      command: 'node docs/acceptance/runs/2026-08-04-consumer-optimization-01/run-phase-5-cross-range.mjs',
      node: process.version,
      platform: process.platform,
    },
    checks: {
      independentPrototype: reference.PROTOTYPE_ID,
      independentTargetDeclarations: true,
      openComponentIds: true,
      openTokenIds: true,
      partialEvidence: true,
      unsupportedAdapter: true,
      noMachineContract: true,
      cacheInvalidation: true,
      targetPathIsolation: true,
    },
    partialEvidence,
    target: {
      root: targetRoot,
      machineContractPresent: false,
      componentBefore: summarize(componentBefore),
      componentAfter: summarize(componentAfter),
      tokens: summarize(tokenResult),
    },
    unsupported: summarize(unsupported),
  };
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} catch (error) {
  const failure = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    status: 'failed',
    error: error?.data ?? { message: error.message, stack: error.stack },
  };
  await writeFile(outputPath, `${JSON.stringify(failure, null, 2)}\n`, 'utf8');
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  await client?.close();
  await writer?.close();
  await rm(storeRoot, { recursive: true, force: true });
  await rm(targetRoot, { recursive: true, force: true });
  await rm(unsupportedRoot, { recursive: true, force: true });
}

async function createPartialEvidence() {
  const store = new LocalFileStore({ root: storeRoot, workspaceId });
  await store.init();
  const catalog = {
    schemaVersion: 1,
    catalogRevisionId: 'catalog-cross-range-v1',
    workspaceId,
    bundleId: reference.BUNDLE_ID,
    prototypeId: reference.PROTOTYPE_ID,
    kind: 'screen',
    inputDigest: 'sha256:cross-range-screen-v1',
    createdAt: '2026-08-05T00:00:00.000Z',
    entries: [{
      objectId: reference.SCREEN_ID,
      digest: 'sha256:cross-range-screen',
      value: { title: 'Independent task list' },
      blobIds: [],
    }],
  };
  const created = await store.createBundle({
    bundleId: reference.BUNDLE_ID,
    prototypeId: reference.PROTOTYPE_ID,
    run: reference.RUN_1,
    revisions: [reference.PRIMARY_ACTIVE_REVISION],
    coverage: reference.RUN_1.coverage,
    catalogs: [catalog],
  });
  const screenshotBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  await store.putBlob({
    bundleId: reference.BUNDLE_ID,
    kind: 'screenshot',
    mediaType: 'image/png',
    bytes: screenshotBytes,
    ownerRefs: [{ kind: 'revision', objectId: reference.PRIMARY_ACTIVE_REVISION.revisionId }],
  });
  const staleness = await store.createStalenessReport({
    bundleId: reference.BUNDLE_ID,
    snapshotId: created.snapshot.snapshotId,
    inputVersion: 'cross-range-v1',
    currentDependencyDigests: {
      'registry:ledger-planet.task-list': 'registry-cross-range-v1',
    },
  });
  const handoff = await createAgentHandoff({
    store,
    bundleId: reference.BUNDLE_ID,
    snapshotId: created.snapshot.snapshotId,
    selectedCases: reference.RUN_1.selection.cases,
    stalenessReport: staleness,
    currentInputVersion: staleness.inputVersion,
    acknowledgedRiskKinds: ['reconstruction-readiness', 'stale-evidence'],
  });
  handoffId = handoff.handoffId;
  return store;
}

async function createTargetFixture() {
  await mkdir(path.join(targetRoot, 'lib', 'common'), { recursive: true });
  await mkdir(path.join(targetRoot, 'lib', 'theme'), { recursive: true });
  await mkdir(path.join(targetRoot, 'docs'), { recursive: true });
  await writeFile(
    path.join(targetRoot, 'pubspec.yaml'),
    'name: cross_range_target\ndependencies:\n  flutter:\n    sdk: flutter\n',
  );
  await writeFile(
    path.join(targetRoot, 'lib', 'common', 'card.dart'),
    "class CommonCard extends StatelessWidget { const CommonCard({required this.child}); final Widget child; }\nfinal cardUse = CommonCard(child: Text('cross-range'));\n",
  );
  await writeFile(
    path.join(targetRoot, 'lib', 'theme', 'tokens.dart'),
    'class TS { static final colors = AppColors(); } class AppColors { int get error => 1; }\nfinal tokenUse = TS.colors.error;\n',
  );
  await writeFile(
    path.join(targetRoot, 'docs', 'proto-bridge.md'),
    `# Independent target\n\n## Component mapping\n\n| Evidence | Target | import |\n| --- | --- | --- |\n| \`another-prototype.card\` | \`CommonCard\` | \`common/card.dart\` |\n| \`cache.widget\` | \`LaterWidget\` |\n\n## Token mapping\n\n| Evidence token | Target token |\n| --- | --- |\n| \`design.token-primary\` | \`TS.colors.error\` |\n`,
  );
}

async function write(root, relativePath, content) {
  const file = path.join(root, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}

function statuses(batch) {
  return (batch.resolutions ?? []).map((item) => item.status).join(',');
}

function summarize(batch) {
  return {
    adapterId: batch.adapterId,
    supported: batch.supported,
    kind: batch.kind,
    statuses: (batch.resolutions ?? []).map((item) => ({
      id: item.id,
      status: item.status,
      validation: item.validation,
    })),
  };
}

async function call(name, args) {
  const result = await client.request('tools/call', { name, arguments: args });
  if (result?.isError) {
    const error = new Error(result.content?.[0]?.text ?? `${name} failed`);
    error.data = result.structuredContent ?? result.content;
    throw error;
  }
  if (!result?.structuredContent || typeof result.structuredContent !== 'object') {
    throw new Error(`${name} returned no structuredContent.`);
  }
  return result.structuredContent;
}

async function expectToolError(promise, pattern) {
  try {
    await promise;
  } catch (error) {
    assert(pattern.test(error.message), `Unexpected error: ${error.message}`);
    return;
  }
  throw new Error(`Expected tool call to fail with ${pattern}.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function startClient(args) {
  const child = spawn(process.execPath, [
    path.join(repoRoot, 'packages/mcp-server/dist/index.js'),
    ...args,
  ], { cwd: repoRoot, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let nextId = 1;
  let stderr = '';
  const pending = new Map();
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    const slot = pending.get(message.id);
    if (!slot) return;
    pending.delete(message.id);
    if (message.error) {
      const error = new Error(message.error.message);
      error.data = message.error.data;
      slot.reject(error);
    } else {
      slot.resolve(message.result);
    }
  });
  child.once('exit', (code) => {
    for (const slot of pending.values()) slot.reject(new Error(`MCP exited with code ${code}: ${stderr}`));
    pending.clear();
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MCP startup timed out')), 15_000);
    const id = nextId++;
    pending.set(id, {
      resolve: (result) => { clearTimeout(timer); resolve(result); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase5-cross-range', version: '1' },
      },
    })}\n`);
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
      });
    },
    close() {
      lines.close();
      child.stdin.end();
      return new Promise((resolve) => (child.exitCode !== null ? resolve() : child.once('exit', resolve)));
    },
  };
}
