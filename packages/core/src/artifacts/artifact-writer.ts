import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { PageCanonical } from '../types/index.js';

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeCompactJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

export async function writePageCanonicalFile(filePath: string, value: PageCanonical): Promise<void> {
  const analysis = value.sourceFacts?.analysis;
  const sfc = analysis?.sfc;
  const route = value.sourceFacts?.route ?? value.page.route;
  const vuePath = value.sourceFacts?.vuePath;
  const relevantSourceRoutes = analysis?.routeRegistry.filter((entry) =>
    (route && entry.route === route)
    || (vuePath && entry.sourceFile && (vuePath.endsWith(entry.sourceFile) || entry.sourceFile.endsWith(vuePath))),
  ) ?? [];
  const artifact = {
    ...value,
    ...(value.sourceFacts && analysis ? {
      sourceFacts: {
        ...value.sourceFacts,
        analysis: {
          ...analysis,
          routeRegistry: relevantSourceRoutes,
          ...(sfc ? {
            sfc: {
              ...sfc,
              template: undefined,
              script: undefined,
              styleBlocks: undefined,
              rawBlocksOmitted: true as const,
            },
          } : {}),
        },
      },
    } : {}),
  };
  await writeCompactJsonFile(filePath, artifact);
}

export async function writeTextFile(filePath: string, value: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, 'utf8');
}
