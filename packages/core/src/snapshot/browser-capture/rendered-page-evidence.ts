import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { CapturePageEvidenceInput, CapturePageEvidenceResult } from '../../types/index.js';
import { writeJsonFile } from '../../artifacts/artifact-writer.js';
import { detectPageCapabilities } from '../capabilities/detect-page-capabilities.js';
import { buildCapturedPageEvidence } from './build-page-evidence.js';
import { createEvidenceId } from './evidence-id.js';
import { extractRenderedPage } from './extract-rendered-page.js';
import { readRuntimePageProtocol } from './runtime-page-protocol.js';

const DEFAULT_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1 };

export async function captureRenderedPageEvidence(input: CapturePageEvidenceInput): Promise<CapturePageEvidenceResult> {
  const viewport = input.viewport ?? DEFAULT_VIEWPORT;
  const saveArtifacts = input.saveArtifacts ?? true;
  const capturedAt = new Date().toISOString();
  const evidenceId = createEvidenceId(input.url, capturedAt);

  await mkdir(input.outDir, { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: viewport.deviceScaleFactor ?? DEFAULT_VIEWPORT.deviceScaleFactor,
    });
    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 30_000 });

    const capabilities = await detectPageCapabilities(page);
    const runtime = capabilities.runtimeMetadata || capabilities.pageList
      ? await readRuntimePageProtocol(page)
      : undefined;
    const screenshotPath = saveArtifacts ? path.join(input.outDir, 'screenshot.png') : undefined;
    if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

    const extracted = await extractRenderedPage(page, viewport);
    const evidence = buildCapturedPageEvidence({
      id: evidenceId,
      url: input.url,
      capturedAt,
      viewport,
      screenshotPath,
      extracted,
      capabilities,
      runtime,
    });

    const pageEvidencePath = path.join(input.outDir, 'page-evidence.json');
    await writeJsonFile(pageEvidencePath, evidence);

    return {
      evidence,
      capabilities,
      files: {
        pageEvidence: pageEvidencePath,
        ...(screenshotPath ? { screenshot: screenshotPath } : {}),
      },
    };
  } finally {
    await browser.close();
  }
}
