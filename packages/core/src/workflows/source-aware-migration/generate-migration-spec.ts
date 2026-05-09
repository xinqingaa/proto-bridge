import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  GenerateMigrationSpecInput,
  GenerateMigrationSpecResult,
} from '../../types/index.js';
import { defaultAdapterRegistry } from '../../adapters/registry.js';
import { createMigrationContext } from './generate-migration-context.js';
import { writeJsonFile, writeTextFile } from '../../artifacts/artifact-writer.js';

const DEFAULT_TARGET_ADAPTER = 'flutter-app';

export async function generateMigrationSpec(
  input: GenerateMigrationSpecInput,
): Promise<GenerateMigrationSpecResult> {
  const outDir = path.resolve(input.outDir);
  await mkdir(outDir, { recursive: true });

  const context = await createMigrationContext({
    ...input,
    outDir,
  });
  const targetAdapter = defaultAdapterRegistry.getTarget(input.target.adapter ?? DEFAULT_TARGET_ADAPTER);

  const migrationContext = path.join(outDir, 'migration-context.json');
  const migrationSpec = path.join(outDir, 'migration-spec.md');
  const pageEvidence = context.pageEvidence ? path.join(outDir, 'page-evidence.json') : undefined;

  await writeJsonFile(migrationContext, context);
  await writeTextFile(migrationSpec, targetAdapter.renderMigrationSpec(context));
  if (pageEvidence && context.pageEvidence) {
    await writeJsonFile(pageEvidence, context.pageEvidence);
  }

  return {
    context,
    files: {
      migrationContext,
      migrationSpec,
      screenshot: context.capture?.screenshotPath,
      domSnapshot: context.capture?.domSnapshotPath,
      ...(pageEvidence ? { pageEvidence } : {}),
    },
  };
}
