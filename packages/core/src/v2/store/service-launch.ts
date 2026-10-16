import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { WorkspaceId } from '../contracts/ids.js';
import { V2ContractError } from '../contracts/errors.js';
import { V2WorkspaceConfig } from '../workspace-config.js';
import { resolveDeliveryTargetRoot } from './delivery-target.js';

/**
 * The only Local Service launch parameters. `pnpm pb:up`, CLI
 * `service start` and `pb:doctor` all derive them from one Workspace config
 * through `resolveLocalServiceLaunchConfig`.
 */
export type LocalServiceLaunchConfig = {
  configPath: string;
  workspaceId: WorkspaceId;
  host: V2WorkspaceConfig['service']['host'];
  port: number;
  /**
   * `service.allowedOrigins`, else `runtime.allowedOrigins`, else the origin
   * of `runtime.baseUrl`. Normalized to origins and de-duplicated in order.
   */
  allowedOrigins: string[];
  runtimeBaseUrl: string;
  storeRoot: string;
  deliveryTargetRoot: string;
  maxCases: number;
  maxStoreBytes?: number;
};

export function resolveLocalServiceLaunchConfig(input: {
  config: V2WorkspaceConfig;
  configPath: string;
}): LocalServiceLaunchConfig {
  const { config } = input;
  const configPath = path.resolve(input.configPath);
  const configDir = path.dirname(configPath);
  const declaredOrigins = config.service.allowedOrigins.length > 0
    ? config.service.allowedOrigins
    : config.runtime.allowedOrigins.length > 0
      ? config.runtime.allowedOrigins
      : [config.runtime.baseUrl];
  const allowedOrigins = [
    ...new Set(declaredOrigins.map((origin) => new URL(origin).origin)),
  ];
  if (allowedOrigins.length === 0) {
    throw new V2ContractError(
      'invalid-schema',
      'Local Service needs at least one allowed browser origin.',
    );
  }
  return {
    configPath,
    workspaceId: config.workspaceId,
    host: config.service.host,
    port: config.service.port,
    allowedOrigins,
    runtimeBaseUrl: config.runtime.baseUrl,
    storeRoot: path.resolve(configDir, config.store.root),
    deliveryTargetRoot: resolveDeliveryTargetRoot({ config, configDir }),
    maxCases: config.capture.maxCases,
    ...(config.store.maxBytes === undefined
      ? {}
      : { maxStoreBytes: config.store.maxBytes }),
  };
}

export async function loadLocalServiceLaunchConfig(
  configPath: string,
): Promise<LocalServiceLaunchConfig> {
  const absolute = path.resolve(configPath);
  const config = V2WorkspaceConfig.parse(
    JSON.parse(await readFile(absolute, 'utf8')) as unknown,
  );
  return resolveLocalServiceLaunchConfig({ config, configPath: absolute });
}
