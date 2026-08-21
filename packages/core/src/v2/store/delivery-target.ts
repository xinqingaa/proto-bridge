import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { V2ContractError } from '../contracts/errors.js';
import type { V2WorkspaceConfig } from '../workspace-config.js';

export function resolveDeliveryTargetRoot(input: {
  config: V2WorkspaceConfig;
  configDir: string;
  override?: string | undefined;
}): string {
  const raw = input.override?.trim() || input.config.delivery.targetRoot;
  return path.resolve(input.configDir, raw);
}

export async function assertDeliveryTargetRootMatch(
  boundAbsolute: string,
  requested?: string | undefined,
): Promise<string> {
  const bound = path.resolve(boundAbsolute);
  if (!requested?.trim()) return bound;
  const requestedAbsolute = path.resolve(requested.trim());
  const [boundReal, requestedReal] = await Promise.all([
    realpath(bound).catch(() => bound),
    realpath(requestedAbsolute).catch(() => requestedAbsolute),
  ]);
  if (boundReal !== requestedReal) {
    throw new V2ContractError(
      'invalid-schema',
      `Delivery targetRoot ${requestedReal} does not match Workspace delivery.targetRoot ${boundReal}.`,
    );
  }
  return boundReal;
}
