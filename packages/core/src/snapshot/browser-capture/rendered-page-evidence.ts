import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  CapturePageCanonicalInput,
  CapturePageCanonicalResult,
  PageCanonical,
} from '../../types/index.js';
import { writeJsonFile } from '../../artifacts/artifact-writer.js';
import { detectPageCapabilities } from '../capabilities/detect-page-capabilities.js';
import { buildCapturedPageEvidence } from './build-page-evidence.js';
import { createPageId } from './evidence-id.js';
import { extractRenderedPage } from './extract-rendered-page.js';
import { readRuntimePageProtocol } from './runtime-page-protocol.js';

const DEFAULT_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1 };

export async function captureRenderedPageCanonical(input: CapturePageCanonicalInput): Promise<CapturePageCanonicalResult> {
  const viewport = input.viewport ?? DEFAULT_VIEWPORT;
  const saveArtifacts = input.saveArtifacts ?? true;
  const capturedAt = new Date().toISOString();
  const pageId = createPageId(input.url, capturedAt);

  await mkdir(input.outDir, { recursive: true });
  const screenshotsDir = path.join(input.outDir, 'screenshots');
  if (saveArtifacts) await mkdir(screenshotsDir, { recursive: true });

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
    const screenshotPath = saveArtifacts ? path.join(screenshotsDir, 'full-page.png') : undefined;
    if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

    const extracted = await extractRenderedPage(page, viewport);
    const pageCanonicalPath = path.join(input.outDir, 'page-canonical.json');
    const screenshotArtifacts = screenshotPath
      ? [{
        name: 'full-page',
        path: screenshotPath,
        width: extracted.documentSize.width,
        height: extracted.documentSize.height,
        kind: 'full-page' as const,
      }]
      : [];
    const pageCanonical = withArtifacts(buildCapturedPageEvidence({
      id: pageId,
      url: input.url,
      capturedAt,
      viewport,
      screenshotPath,
      extracted,
      capabilities,
      runtime,
    }), {
      rootDir: input.outDir,
      pageCanonical: pageCanonicalPath,
      screenshots: screenshotArtifacts,
    });

    await writeJsonFile(pageCanonicalPath, pageCanonical);

    return {
      page: pageCanonical,
      capabilities,
      files: {
        pageCanonical: pageCanonicalPath,
        screenshots: screenshotPath ? [screenshotPath] : [],
      },
    };
  } finally {
    await browser.close();
  }
}

export const captureRenderedPageEvidence = captureRenderedPageCanonical;

function withArtifacts(
  page: PageCanonical,
  artifacts: PageCanonical['artifacts'],
): PageCanonical {
  return {
    ...page,
    pageId: page.id,
    screenshots: artifacts.screenshots,
    artifacts,
  };
}
