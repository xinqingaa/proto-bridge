import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildAgentPrompt } from '../agent-prompt.js';
import type { AgentHandoff } from '../contracts/handoff.js';

export type DeliveryReceipt = {
  schemaVersion: 1;
  deliveryId: string;
  createdAt: string;
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
  receiptPath: string;
  source: 'cli' | 'gui' | 'journey';
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
};

/** Sibling of Store root: `.proto-bridge/store` → `.proto-bridge/deliveries`. */
export function deliveryRootFromStoreRoot(storeRoot: string): string {
  return path.join(path.dirname(path.resolve(storeRoot)), 'deliveries');
}

/**
 * Writes reviewable delivery artifacts next to the Store.
 * These files are Store indexes only; MCP still reads Evidence by Handoff ID.
 */
export async function writeDeliveryReceipt(
  input: WriteDeliveryReceiptInput,
): Promise<DeliveryReceipt> {
  const createdAt = new Date().toISOString();
  const deliveryId = createdAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  const deliveryRoot = deliveryRootFromStoreRoot(input.storeRoot);
  const deliveryDir = path.join(deliveryRoot, deliveryId);
  await mkdir(deliveryDir, { recursive: true });

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
    schemaVersion: 1,
    deliveryId,
    createdAt,
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
