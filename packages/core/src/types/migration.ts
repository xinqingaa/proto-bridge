import type { AdapterProjectConfig } from './common.js';
import type { MigrationContext } from './planning.js';

export type GenerateMigrationSpecInput = {
  source: AdapterProjectConfig;
  target: AdapterProjectConfig;
  route?: string | undefined;
  vue?: string | undefined;
  outDir: string;
  capture?: boolean | undefined;
};

export type GenerateMigrationSpecResult = {
  context: MigrationContext;
  files: {
    migrationContext: string;
    migrationSpec: string;
    screenshot?: string | undefined;
    domSnapshot?: string | undefined;
  };
};
