import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_V2_CONFIG_FILE,
  V2WorkspaceConfig,
  type V2WorkspaceConfig as V2WorkspaceConfigType,
} from '@proto-bridge/core/v2';

export type LoadedV2Config = {
  path: string;
  dir: string;
  value: V2WorkspaceConfigType;
  storeRoot: string;
};

export async function loadV2Config(
  configInput: string | undefined,
  cwd = process.cwd(),
): Promise<LoadedV2Config> {
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
  };
}
