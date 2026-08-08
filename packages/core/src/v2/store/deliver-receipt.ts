import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { acceptanceChecklistMarkdown } from '../acceptance-contract.js';
import {
  reconstructionEvidenceBriefMarkdown,
  type EvidenceBriefScreenshotGroup,
} from '../evidence-brief.js';
import { buildAgentPrompt } from '../prompts/agent-prompt.js';
import type { AgentHandoff } from '../contracts/handoff.js';
import { LocalFileStore } from './local-file-store.js';
import { buildAcceptanceContractFromStore } from './acceptance.js';

export type DeliveryReceipt = {
  schemaVersion: 2;
  deliveryId: string;
  createdAt: string;
  createdAtLocal: string;
  timeZone: string;
  targetRoot: string;
  workspaceId: string;
  storeRoot: string;
  bundleId: string;
  runId?: string;
  snapshotId: string;
  handoffId: string;
  acceptedWarningIds: string[];
  acknowledgedRiskKinds: string[];
  coverageStatus: AgentHandoff['coverageStatus'];
  freshnessStatus: AgentHandoff['freshnessStatus'];
  mandatoryRisks: AgentHandoff['risks'];
  agentPromptPath: string;
  acceptanceContractPath: string;
  acceptanceChecklistPath: string;
  evidenceBriefPath: string;
  reviewManifestPath: string;
  reviewIndexPath: string;
  screenshotCount: number;
  receiptPath: string;
  source: 'cli' | 'gui';
  configPath?: string;
};

export type WriteDeliveryReceiptInput = {
  storeRoot: string;
  targetRoot: string;
  handoff: AgentHandoff;
  source: DeliveryReceipt['source'];
  runId?: string;
  acceptedWarningIds?: string[];
  acknowledgedRiskKinds?: string[];
  configPath?: string;
  implementationIntent?: string;
  timeZone?: string;
  /** Rewrite an existing delivery directory (true overwrite). */
  overwriteDeliveryId?: string;
};

/** Sibling of Store root: `.proto-bridge/store` → `.proto-bridge/deliveries`. */
export function deliveryRootFromStoreRoot(storeRoot: string): string {
  return path.join(path.dirname(path.resolve(storeRoot)), 'deliveries');
}

function localDeliveryTime(date: Date, timeZone: string): {
  deliveryId: string;
  createdAtLocal: string;
} {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const offsetName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const offset = offsetName.replace('GMT', '').replace(':', '-') || '+00-00';
  const isoOffset = offset.replace(/^([+-]\d{2})-(\d{2})$/, '$1:$2');
  const base = `${values.year}-${values.month}-${values.day}T${values.hour}-${values.minute}-${values.second}`;
  return {
    deliveryId: `${base}${offset}`,
    createdAtLocal: `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}.${String(date.getMilliseconds()).padStart(3, '0')}${isoOffset}`,
  };
}

function reviewFileName(input: {
  index: number;
  screenId: string;
  variantId: string;
  checkpointId?: string;
}): string {
  const slug = [
    input.screenId.split('.').at(-1),
    input.variantId,
    input.checkpointId,
  ]
    .filter(Boolean)
    .join('__')
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${String(input.index).padStart(3, '0')}__${slug}.png`;
}

/**
 * Writes reviewable delivery artifacts next to the Store.
 * These files are Store indexes only; MCP still reads Evidence by Handoff ID.
 */
export async function writeDeliveryReceipt(
  input: WriteDeliveryReceiptInput,
): Promise<DeliveryReceipt> {
  const now = new Date();
  const createdAt = now.toISOString();
  const timeZone = input.timeZone ?? 'Asia/Shanghai';
  const timed = localDeliveryTime(now, timeZone);
  const overwriteId = input.overwriteDeliveryId?.trim();
  if (overwriteId && /[\\/]/.test(overwriteId)) {
    throw new Error('overwriteDeliveryId must be a single path segment.');
  }
  const deliveryId = overwriteId || timed.deliveryId;
  const createdAtLocal = timed.createdAtLocal;
  const deliveryRoot = deliveryRootFromStoreRoot(input.storeRoot);
  const deliveryDir = path.join(deliveryRoot, deliveryId);
  if (overwriteId) {
    await rm(deliveryDir, { recursive: true, force: true });
  }

  const store = new LocalFileStore({
    root: input.storeRoot,
    workspaceId: input.handoff.workspaceId,
    readOnly: true,
  });
  await store.init();
  const { contract } = await buildAcceptanceContractFromStore({
    store,
    handoff: input.handoff,
  });
  await mkdir(deliveryDir, { recursive: true });
  const acceptanceContractPath = path.join(
    deliveryDir,
    'acceptance-contract.json',
  );
  const acceptanceChecklistPath = path.join(
    deliveryDir,
    'acceptance-checklist.md',
  );
  const contractJson = `${JSON.stringify(contract, null, 2)}\n`;
  await writeFile(acceptanceContractPath, contractJson, 'utf8');
  await writeFile(
    acceptanceChecklistPath,
    acceptanceChecklistMarkdown(contract),
    'utf8',
  );

  const reviewDir = path.join(deliveryDir, 'review');
  const screenshotsDir = path.join(reviewDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });
  type ReviewEntry = EvidenceBriefScreenshotGroup & {
    mediaType: string;
    byteLength: number;
    image?: { width: number; height: number };
  };
  const reviewEntries: ReviewEntry[] = [];
  const reviewByDigest = new Map<string, ReviewEntry>();
  let screenshotIndex = 0;
  for (const item of contract.screenshots) {
    for (const blobId of item.blobIds) {
      const blob = await store.getBlob(input.handoff.bundleId, blobId as never);
      if (!blob || blob.record.kind !== 'screenshot') {
        throw new Error(`Screenshot ${blobId} is missing from the fixed Handoff.`);
      }
      const caseRef = {
        caseId: item.caseId,
        screenId: item.screenId,
        variantId: item.variantId,
        ...(item.scenario?.checkpointId
          ? { checkpointId: item.scenario.checkpointId }
          : {}),
      };
      const existing = reviewByDigest.get(blob.record.digest);
      if (existing) {
        if (!existing.blobIds.includes(blobId)) existing.blobIds.push(blobId);
        if (!existing.cases.some((candidate) => candidate.caseId === item.caseId)) {
          existing.cases.push(caseRef);
        }
        continue;
      }
      screenshotIndex += 1;
      const fileName = reviewFileName({
        index: screenshotIndex,
        screenId: item.screenId,
        variantId: item.variantId,
        ...(item.scenario?.checkpointId
          ? { checkpointId: item.scenario.checkpointId }
          : {}),
      });
      const relativePath = path.posix.join('screenshots', fileName);
      await writeFile(path.join(reviewDir, relativePath), blob.bytes);
      const entry: ReviewEntry = {
        digest: blob.record.digest,
        path: relativePath,
        blobIds: [blobId],
        cases: [caseRef],
        mediaType: blob.record.mediaType,
        byteLength: blob.record.byteLength,
        ...(blob.record.image ? { image: blob.record.image } : {}),
      };
      reviewEntries.push(entry);
      reviewByDigest.set(entry.digest, entry);
    }
  }
  await store.close();

  const reviewManifestPath = path.join(reviewDir, 'manifest.json');
  const reviewIndexPath = path.join(reviewDir, 'index.md');
  const reviewManifest = {
    schemaVersion: 2,
    handoffId: input.handoff.handoffId,
    snapshotId: input.handoff.snapshotId,
    acceptanceContractDigest: `sha256:${createHash('sha256').update(contractJson).digest('hex')}`,
    screenshots: reviewEntries,
  };
  await writeFile(
    reviewManifestPath,
    `${JSON.stringify(reviewManifest, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    reviewIndexPath,
    `${[
      '# Evidence Screenshot Review',
      '',
      `Handoff: \`${input.handoff.handoffId}\``,
      '',
      ...reviewEntries.flatMap((entry) => [
        `## ${entry.cases[0]!.screenId} · ${entry.cases[0]!.variantId}`,
        '',
        `- Cases: ${entry.cases.map((item) => `\`${item.caseId}\``).join(', ')}`,
        `- Blobs: ${entry.blobIds.map((blobId) => `\`${blobId}\``).join(', ')}`,
        `- Digest: \`${entry.digest}\``,
        '',
        `![${entry.cases.map((item) => item.caseId).join(', ')}](${entry.path})`,
        '',
      ]),
    ].join('\n')}\n`,
    'utf8',
  );

  const evidenceBriefPath = path.join(deliveryDir, 'evidence-brief.md');
  const evidenceBrief = reconstructionEvidenceBriefMarkdown({
    contract,
    screenshotGroups: reviewEntries.map((entry) => ({
      ...entry,
      path: path.posix.join('review', entry.path),
    })),
  });
  await writeFile(evidenceBriefPath, evidenceBrief, 'utf8');

  const agentPrompt = buildAgentPrompt({
    handoffId: input.handoff.handoffId,
    workspaceId: input.handoff.workspaceId,
    bundleId: input.handoff.bundleId,
    snapshotId: input.handoff.snapshotId,
    targetRoot: input.targetRoot,
    ...(input.implementationIntent
      ? { implementationIntent: input.implementationIntent }
      : {}),
    risks: input.handoff.risks,
  });
  const agentPromptPath = path.join(deliveryDir, 'agent-prompt.md');
  await writeFile(agentPromptPath, agentPrompt, 'utf8');

  const receipt: DeliveryReceipt = {
    schemaVersion: 2,
    deliveryId,
    createdAt,
    createdAtLocal,
    timeZone,
    targetRoot: input.targetRoot,
    workspaceId: input.handoff.workspaceId,
    storeRoot: input.storeRoot,
    bundleId: input.handoff.bundleId,
    ...(input.runId ? { runId: input.runId } : {}),
    snapshotId: input.handoff.snapshotId,
    handoffId: input.handoff.handoffId,
    acceptedWarningIds: input.acceptedWarningIds ?? [],
    acknowledgedRiskKinds: input.acknowledgedRiskKinds ?? [],
    coverageStatus: input.handoff.coverageStatus,
    freshnessStatus: input.handoff.freshnessStatus,
    mandatoryRisks: input.handoff.risks,
    agentPromptPath,
    acceptanceContractPath,
    acceptanceChecklistPath,
    evidenceBriefPath,
    reviewManifestPath,
    reviewIndexPath,
    screenshotCount: reviewEntries.length,
    receiptPath: path.join(deliveryDir, 'receipt.json'),
    source: input.source,
    ...(input.configPath ? { configPath: input.configPath } : {}),
  };
  await writeFile(
    receipt.receiptPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(deliveryRoot, 'latest.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
  return receipt;
}
