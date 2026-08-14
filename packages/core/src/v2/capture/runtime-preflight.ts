import { chromium } from 'playwright';
import { V2ContractError } from '../contracts/errors.js';
import type { RuntimeCaptureManifest } from '../runtime-contract/index.js';
import { RUNTIME_CAPTURE_GLOBAL } from '../runtime-contract/index.js';
import { resolveCaptureDevice } from './devices.js';
import { preflightSelection, type CapturePreflight } from './preflight.js';
import { requestRuntimeCapture } from './runtime-client.js';
import { buildRuntimeCaseUrl } from './runtime-url.js';
import type { SelectionDraft } from './selection.js';

export type InstrumentedRuntimePreflightInput = {
  draft: SelectionDraft;
  runtimeBaseUrl: string;
  maxCases?: number;
};

/** Reads the authored Runtime Manifest without selecting or capturing Cases. */
export async function discoverInstrumentedRuntimeManifest(input: {
  runtimeBaseUrl: string;
  prototypeId: string;
  screenSlug?: string;
}): Promise<RuntimeCaptureManifest> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      colorScheme: 'light',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await page.goto(
      new URL(
        `/prototype/${encodeURIComponent(input.prototypeId)}/${encodeURIComponent(input.screenSlug ?? '__manifest__')}`,
        input.runtimeBaseUrl,
      ).toString(),
      { waitUntil: 'domcontentloaded' },
    );
    await waitForProtocol(page);
    const described = await requestRuntimeCapture(page, { kind: 'describe' });
    return described.payload.manifest;
  } finally {
    await browser.close();
  }
}

async function waitForProtocol(page: import('playwright').Page): Promise<void> {
  await page.waitForFunction(
    (globalName) =>
      Boolean((window as unknown as Record<string, unknown>)[globalName]),
    RUNTIME_CAPTURE_GLOBAL,
    { timeout: 10_000 },
  );
}

/**
 * Runs Preflight in an isolated browser context. It discovers the Runtime
 * Manifest itself and validates every selected Fragment through the same
 * prepare/readiness/semantic-snapshot protocol used by Capture.
 */
export async function preflightInstrumentedRuntime(
  input: InstrumentedRuntimePreflightInput,
): Promise<{ manifest: RuntimeCaptureManifest; preflight: CapturePreflight }> {
  const firstDraft = input.draft.screens[0];
  if (!firstDraft) {
    throw new V2ContractError('invalid-schema', 'Selection has no Screen.');
  }
  const firstDevice = resolveCaptureDevice(
    firstDraft.deviceIds[0] ?? 'iphone-14',
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: firstDevice.viewport,
      deviceScaleFactor: firstDevice.deviceScaleFactor,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      colorScheme: 'light',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const allowedOrigin = new URL(input.runtimeBaseUrl).origin;
    await context.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin !== allowedOrigin) {
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    const firstScreenSlug = firstDraft.screenId.slice(
      `${input.draft.prototypeId}.`.length,
    );
    await page.goto(
      buildRuntimeCaseUrl({
        runtimeBaseUrl: input.runtimeBaseUrl,
        path: `/prototype/${encodeURIComponent(input.draft.prototypeId)}/${encodeURIComponent(firstScreenSlug)}`,
        variantId: 'default',
        themeId: firstDraft.themeIds[0] ?? 'light',
      }),
      { waitUntil: 'domcontentloaded' },
    );
    if (new URL(page.url()).origin !== allowedOrigin) {
      throw new V2ContractError(
        'unsafe-input',
        'Runtime redirected outside the configured origin.',
      );
    }
    await waitForProtocol(page);
    const described = await requestRuntimeCapture(page, { kind: 'describe' });
    const manifest = described.payload.manifest;
    if (
      !manifest.screens.some(
        (screen) => screen.prototypeId === input.draft.prototypeId,
      )
    ) {
      throw new V2ContractError(
        'unknown-reference',
        `Runtime Manifest does not contain Prototype ${input.draft.prototypeId}.`,
      );
    }
    const preflight = preflightSelection(input.draft, manifest, {
      ...(input.maxCases === undefined ? {} : { maxCases: input.maxCases }),
    });

    for (const screenDraft of input.draft.screens) {
      if (screenDraft.captureScope.fragments.length === 0) continue;
      const entry = preflight.matrix.find(
        (candidate) =>
          candidate.selectedCase.caseKey.screenId === screenDraft.screenId &&
          candidate.selectedCase.caseKey.scenario === undefined,
      );
      if (!entry) {
        throw new V2ContractError(
          'unknown-reference',
          `Fragment Screen ${screenDraft.screenId} has no Base Case in the Matrix.`,
        );
      }
      const device = resolveCaptureDevice(entry.selectedCase.caseKey.deviceId);
      await page.setViewportSize(device.viewport);
      await page.goto(
        buildRuntimeCaseUrl({
          runtimeBaseUrl: input.runtimeBaseUrl,
          path: entry.runtimePath,
          variantId: entry.initialVariantId,
          themeId: entry.selectedCase.caseKey.themeId,
          ...(entry.initialRouteQuery
            ? { routeQuery: entry.initialRouteQuery }
            : {}),
        }),
        { waitUntil: 'domcontentloaded' },
      );
      await waitForProtocol(page);
      const prepared = await requestRuntimeCapture(page, {
        kind: 'prepare',
        expected: {
          prototypeId: input.draft.prototypeId,
          screenId: entry.selectedCase.caseKey.screenId,
          variantId: entry.selectedCase.caseKey.variantId,
          themeId: entry.selectedCase.caseKey.themeId,
        },
      });
      await requestRuntimeCapture(page, {
        kind: 'readiness',
        expected: {
          ...prepared.payload.actual,
          viewport: device.viewport,
        },
        requiredFragments: screenDraft.captureScope.fragments,
      });
      const snapshot = await requestRuntimeCapture(page, {
        kind: 'semantic-snapshot',
        fragments: screenDraft.captureScope.fragments,
      });
      for (const fragment of screenDraft.captureScope.fragments) {
        const found = snapshot.payload.nodes.some(
          (node) =>
            node.fragment.screenId === fragment.screenId &&
            node.fragment.pbId === fragment.pbId &&
            node.fragment.pbKey === fragment.pbKey,
        );
        if (!found) {
          throw new V2ContractError(
            'unknown-reference',
            `Stable Fragment ${fragment.pbId}${fragment.pbKey ? `#${fragment.pbKey}` : ''} was not found after Runtime prepare.`,
            fragment,
          );
        }
      }
    }
    await context.close();
    return { manifest, preflight };
  } finally {
    await browser.close();
  }
}
