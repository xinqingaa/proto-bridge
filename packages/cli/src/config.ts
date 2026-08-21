import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_V2_CONFIG_FILE,
  V2WorkspaceConfig,
  type V2WorkspaceConfig as V2WorkspaceConfigType,
} from '@proto-bridge/core/v2';
import { resolveDeliveryTargetRoot } from '@proto-bridge/core/v2/store';

export type LoadedCliConfig = {
  path: string;
  dir: string;
  value: V2WorkspaceConfigType;
  storeRoot: string;
  deliveryTargetRoot: string;
};

export async function loadCliConfig(
  configInput: string | undefined,
  cwd = process.cwd(),
): Promise<LoadedCliConfig> {
  const configPath = path.resolve(cwd, configInput ?? DEFAULT_V2_CONFIG_FILE);
  const value = V2WorkspaceConfig.parse(
    JSON.parse(await readFile(configPath, 'utf8')) as unknown,
  );
  const dir = path.dirname(configPath);
  return {
    path: configPath,
    dir,
    value,
    storeRoot: path.resolve(dir, value.store.root),
    deliveryTargetRoot: resolveDeliveryTargetRoot({
      config: value,
      configDir: dir,
    }),
  };
}
