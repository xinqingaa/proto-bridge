import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BrowserContext, Page } from 'playwright';
import type { Fact } from '../contracts/evidence.js';
import type { EvidenceLevel } from '../contracts/vocabulary.js';
import {
  RUNTIME_CAPTURE_GLOBAL,
  type RuntimeActualDimensions,
  type RuntimeSemanticNode,
} from '../runtime-contract/index.js';
import type { CapturePreflight } from './preflight.js';
import type { CaseMatrixEntry } from './selection.js';
import { resolveCaptureDevice } from './devices.js';
import { requestRuntimeCapture } from './runtime-client.js';

export type CapturedBinary = {
  kind: 'screenshot' | 'trace' | 'debug';
  mediaType: string;
  bytes: Uint8Array;
};

export type CaptureDiagnostics = {
  console: string[];
  pageErrors: string[];
  failedRequests: string[];
};

export type CapturedCase = {
  evidenceLevel: EvidenceLevel;
  facts: Fact[];
  requiredFactsTotal: number;
  requiredFactsResolved: number;
  binaries: CapturedBinary[];
  diagnostics: CaptureDiagnostics;
};

export type CaptureCaseInput = {
  entry: CaseMatrixEntry;
  preflight: CapturePreflight;
  runtimeBaseUrl: string;
  signal?: AbortSignal;
};

export interface CaseCaptureDriver {
  captureCase(input: CaptureCaseInput): Promise<CapturedCase>;
}

export class CaseCaptureFailure extends Error {
  constructor(
    message: string,
    readonly diagnostics: CaptureDiagnostics,
    readonly binaries: CapturedBinary[] = [],
  ) {
    super(message);
    this.name = 'CaseCaptureFailure';
  }
}

function sanitizedUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '<invalid-url>';
  }
}

function actualFact(
  actual: RuntimeActualDimensions,
  dimension: 'screenId' | 'variantId' | 'themeId',
): Fact {
  return {
    factId: `${actual.screenId}.runtime.${dimension}`,
    candidates: [
      {
        value: actual[dimension],
        provenance: {
          source: 'runtime-contract',
          locator: `capture-protocol.prepare.actual.${dimension}`,
        },
      },
    ],
    resolution: 'resolved',
    effectiveValue: actual[dimension],
  };
}

function nodeFacts(nodes: RuntimeSemanticNode[]): Fact[] {
  return nodes.flatMap((node) => {
    const identity = `${node.fragment.pbId}${node.fragment.pbKey ? `.${node.fragment.pbKey}` : ''}`;
    const facts: Fact[] = [
      {
        factId: `${identity}.role`,
        candidates: [
          {
            value: node.role,
            provenance: {
              source: 'data-pb',
              locator: `${node.fragment.pbId}${node.fragment.pbKey ? `[data-pb-key="${node.fragment.pbKey}"]` : ''}#data-pb-role`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.role,
      },
      {
        factId: `${identity}.visible`,
        candidates: [
          {
            value: node.visible,
            provenance: {
              source: 'runtime-observation',
              locator: `${node.fragment.pbId}#layout`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.visible,
      },
    ];
    if (node.text) {
      facts.push({
        factId: `${identity}.text`,
        candidates: [
          {
            value: node.text,
            provenance: {
              source: 'runtime-observation',
              locator: `${node.fragment.pbId}#visible-text`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.text,
      });
    }
    return facts;
  });
}

async function screenshotBinaries(
  page: Page,
  entry: CaseMatrixEntry,
): Promise<CapturedBinary[]> {
  const screenshots = entry.selectedCase.captureScope.screenshots;
  if (screenshots.mode === 'none') return [];
  if (screenshots.mode === 'all') {
    return [
      {
        kind: 'screenshot',
        mediaType: 'image/png',
        bytes: await page.screenshot({ fullPage: true }),
      },
    ];
  }
  const binaries: CapturedBinary[] = [];
  for (const target of screenshots.targets) {
    const locator = page
      .locator(
        `[data-pb-id="${target.pbId}"]${target.pbKey ? `[data-pb-key="${target.pbKey}"]` : ''}`,
      )
      .first();
    const bytes = await locator.screenshot();
    binaries.push({ kind: 'screenshot', mediaType: 'image/png', bytes });
  }
  return binaries;
}

async function captureGenericFacts(page: Page, screenId: string): Promise<Fact[]> {
  const nodes = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>('h1,h2,h3,button,input,[role]'),
    )
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      })
      .slice(0, 200)
      .map((element, index) => ({
        index,
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute('role') ?? undefined,
        text: (element.innerText || element.getAttribute('aria-label') || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500),
      })),
  );
  return nodes.map((node) => ({
    factId: `${screenId}.generic.visible-node-${node.index}`,
    candidates: [
      {
        value: { tag: node.tag, role: node.role, text: node.text },
        provenance: {
          source: node.role ? 'aria' : 'heuristic',
          locator: `visible-node:${node.index}`,
          confidence: node.role ? 'high' : 'low',
        },
      },
    ],
    resolution: 'resolved',
    effectiveValue: { tag: node.tag, role: node.role, text: node.text },
  }));
}

async function stopTrace(
  context: BrowserContext,
  tempRoot: string,
): Promise<CapturedBinary[]> {
  const tracePath = path.join(tempRoot, 'trace.zip');
  try {
    await context.tracing.stop({ path: tracePath });
    return [
      {
        kind: 'trace',
        mediaType: 'application/zip',
        bytes: await readFile(tracePath),
      },
    ];
  } catch {
    return [];
  }
}

/**
 * Node-only Case driver. Each Case gets a fresh Browser and Context, so
 * cookies, storage, service workers and in-memory app state cannot leak
 * across Matrix entries.
 */
export class PlaywrightCaseCaptureDriver implements CaseCaptureDriver {
  async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    if (input.signal?.aborted) throw new Error('Capture cancelled before Case start.');
    const { chromium } = await import('playwright');
    const profile = resolveCaptureDevice(input.entry.selectedCase.caseKey.deviceId);
    const diagnostics: CaptureDiagnostics = {
      console: [],
      pageErrors: [],
      failedRequests: [],
    };
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'pb-v2-capture-'));
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      isMobile: profile.isMobile,
      hasTouch: profile.hasTouch,
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
      colorScheme:
        input.entry.selectedCase.caseKey.themeId === 'dark' ? 'dark' : 'light',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-07-28T00:00:00.000Z') });
    page.on('console', (message) => {
      diagnostics.console.push(`${message.type()}: ${message.text()}`.slice(0, 1000));
    });
    page.on('pageerror', (error) => {
      diagnostics.pageErrors.push(error.message.slice(0, 1000));
    });
    page.on('requestfailed', (request) => {
      diagnostics.failedRequests.push(
        `${request.method()} ${sanitizedUrl(request.url())}: ${request.failure()?.errorText ?? 'failed'}`.slice(
          0,
          1000,
        ),
      );
    });
    const runtimeOrigin = new URL(input.runtimeBaseUrl).origin;
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      let allowed = url.startsWith('data:') || url.startsWith('blob:');
      if (!allowed) {
        try {
          allowed = new URL(url).origin === runtimeOrigin;
        } catch {
          allowed = false;
        }
      }
      if (allowed) {
        await route.continue();
      } else {
        await route.abort('blockedbyclient');
      }
    });
    let traceStopped = false;
    try {
      const url = new URL(input.entry.runtimePath, input.runtimeBaseUrl);
      url.searchParams.set('variant', input.entry.initialVariantId);
      url.searchParams.set('theme', input.entry.selectedCase.caseKey.themeId);
      await page.goto(url.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page
        .addStyleTag({
          content:
            '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;caret-color:transparent!important}',
        })
        .catch(() => undefined);
      await page.evaluate(() => document.fonts.ready);
      const actualEnvironment = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        deviceScaleFactor: window.devicePixelRatio,
        pathname: window.location.pathname,
        variantId: new URL(window.location.href).searchParams.get('variant'),
        themeId: new URL(window.location.href).searchParams.get('theme'),
      }));
      if (
        actualEnvironment.width !== profile.viewport.width ||
        actualEnvironment.height !== profile.viewport.height ||
        actualEnvironment.deviceScaleFactor !== profile.deviceScaleFactor ||
        actualEnvironment.pathname !== input.entry.runtimePath ||
        actualEnvironment.variantId !== input.entry.initialVariantId ||
        actualEnvironment.themeId !== input.entry.selectedCase.caseKey.themeId
      ) {
        throw new Error(
          `Browser environment does not match the prepared Case: ${JSON.stringify(
            actualEnvironment,
          )}.`,
        );
      }
      if (input.signal?.aborted) throw new Error('Capture cancelled.');

      const mode = input.entry.selectedCase.captureScope.evidenceInputMode;
      let facts: Fact[] = [];
      let evidenceLevel: EvidenceLevel;
      if (mode === 'instrumented') {
        await page.waitForFunction(
          (globalName) =>
            Boolean((window as unknown as Record<string, unknown>)[globalName]),
          RUNTIME_CAPTURE_GLOBAL,
          { timeout: 10_000 },
        );
        const described = await requestRuntimeCapture(page, { kind: 'describe' });
        if (
          described.kind !== 'describe' ||
          described.payload.manifest.inputVersion !== input.preflight.inputVersion
        ) {
          throw new Error(
            `Runtime manifest changed after Preflight (${input.preflight.inputVersion}).`,
          );
        }
        const expectedInitial = {
          prototypeId: input.preflight.selection.prototypeId,
          screenId: input.entry.initialScreenId,
          variantId: input.entry.initialVariantId,
          themeId: input.entry.selectedCase.caseKey.themeId,
        };
        const prepared = await requestRuntimeCapture(page, {
          kind: 'prepare',
          expected: expectedInitial,
        });
        if (prepared.kind !== 'prepare') throw new Error('Unexpected prepare response.');

        if (input.entry.scenario) {
          const ownerScreen = described.payload.manifest.screens.find(
            (screen) =>
              screen.screenId ===
              input.entry.scenario!.scenario.ownerScreenId,
          );
          const actionTargets =
            ownerScreen?.actions
              .filter((action) =>
                input.entry.scenario!.scenario.actionIds.includes(
                  action.actionId,
                ),
              )
              .map((action) => action.target) ?? [];
          const initialReady = await requestRuntimeCapture(page, {
            kind: 'readiness',
            expected: {
              ...expectedInitial,
              viewport: profile.viewport,
            },
            requiredFragments: actionTargets,
          });
          if (initialReady.kind !== 'readiness') {
            throw new Error('Unexpected initial readiness response.');
          }
          for (const actionId of input.entry.scenario.scenario.actionIds) {
            const executed = await requestRuntimeCapture(page, {
              kind: 'execute-action',
              scenarioId: input.entry.scenario.scenario.scenarioId,
              actionId,
            });
            if (executed.kind !== 'execute-action') {
              throw new Error('Unexpected execute-action response.');
            }
          }
          const verified = await requestRuntimeCapture(page, {
            kind: 'verify-checkpoint',
            scenarioId: input.entry.scenario.scenario.scenarioId,
            checkpointId: input.entry.scenario.checkpoint.checkpointId,
          });
          if (verified.kind !== 'verify-checkpoint') {
            throw new Error('Unexpected verify-checkpoint response.');
          }
        }

        const requiredFragments = input.entry.scenario
          ? input.entry.scenario.checkpoint.requiredFragments
          : input.entry.selectedCase.captureScope.fragments;
        const ready = await requestRuntimeCapture(page, {
          kind: 'readiness',
          expected: {
            prototypeId: input.preflight.selection.prototypeId,
            screenId: input.entry.selectedCase.caseKey.screenId,
            variantId: input.entry.selectedCase.caseKey.variantId,
            themeId: input.entry.selectedCase.caseKey.themeId,
            viewport: profile.viewport,
          },
          requiredFragments,
        });
        if (ready.kind !== 'readiness') throw new Error('Unexpected readiness response.');
        const snapshot = await requestRuntimeCapture(page, {
          kind: 'semantic-snapshot',
          fragments: input.entry.selectedCase.captureScope.fragments,
        });
        if (snapshot.kind !== 'semantic-snapshot') {
          throw new Error('Unexpected semantic-snapshot response.');
        }
        facts = [
          actualFact(snapshot.payload.actual, 'screenId'),
          actualFact(snapshot.payload.actual, 'variantId'),
          actualFact(snapshot.payload.actual, 'themeId'),
          ...nodeFacts(snapshot.payload.nodes),
        ];
        // Runtime instrumentation alone cannot prove source provenance. A
        // future Source adapter may promote this level after resolving source
        // facts; until then the driver must report the evidence it actually has.
        evidenceLevel = 'instrumented-runtime';
      } else if (mode === 'generic-runtime') {
        facts = await captureGenericFacts(
          page,
          input.entry.selectedCase.caseKey.screenId,
        );
        evidenceLevel = 'generic-runtime';
      } else {
        evidenceLevel = 'screenshot-only';
      }

      const binaries = await screenshotBinaries(page, input.entry);
      await context.tracing.stop();
      traceStopped = true;
      return {
        evidenceLevel,
        facts,
        requiredFactsTotal: facts.length,
        requiredFactsResolved: facts.filter((fact) => fact.resolution === 'resolved')
          .length,
        binaries,
        diagnostics,
      };
    } catch (error) {
      const trace = traceStopped ? [] : await stopTrace(context, tempRoot);
      traceStopped = true;
      const debugBytes = new TextEncoder().encode(
        `${JSON.stringify(diagnostics, null, 2)}\n`,
      );
      throw new CaseCaptureFailure(
        error instanceof Error ? error.message : String(error),
        diagnostics,
        [
          ...trace,
          { kind: 'debug', mediaType: 'application/json', bytes: debugBytes },
        ],
      );
    } finally {
      if (!traceStopped) await context.tracing.stop().catch(() => undefined);
      await context.close();
      await browser.close();
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}
