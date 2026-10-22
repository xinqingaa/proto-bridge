import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { Fact } from '../contracts/evidence.js';
import type { EvidenceLevel } from '../contracts/vocabulary.js';
import {
  RUNTIME_CAPTURE_GLOBAL,
  type RuntimeActualDimensions,
  type RuntimeFragmentIdentity,
  type RuntimeScreenManifest,
  type RuntimeSemanticNode,
  type RuntimeStructureAssertion,
  type RuntimeCaptureManifest,
  type RuntimeVariantManifest,
} from '../runtime-contract/index.js';
import type { CapturePreflight } from './preflight.js';
import type { CaseMatrixEntry } from './selection.js';
import { resolveCaptureDevice } from './devices.js';
import {
  requestRuntimeCapture,
  RuntimeProtocolError,
} from './runtime-client.js';
import { randomUUID } from 'node:crypto';
import { buildRuntimeCaseUrl } from './runtime-url.js';

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
  /** Discard state whose source Case could not be durably accepted. */
  discardPrepared?(): Promise<void>;
  /** Job-scoped browser process; each business execution has an isolated Context. */
  openSession?(): Promise<CaseCaptureDriver & { dispose(): Promise<void> }>;
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
  const value = dimension === 'themeId' ? actual.theme.mode : actual[dimension];
  return {
    factId: `${actual.screenId}.runtime.${dimension}`,
    candidates: [
      {
        value,
        provenance: {
          source: 'runtime-contract',
          locator: `capture-protocol.semantic-snapshot.actual.${dimension}`,
        },
      },
    ],
    resolution: 'resolved',
    effectiveValue: value,
  };
}

function nodeFacts(nodes: RuntimeSemanticNode[]): Fact[] {
  return nodes.flatMap((node) => {
    const identity = `${node.fragment.pbId}${node.fragment.pbKey ? `.${node.fragment.pbKey}` : ''}`;
    const facts: Fact[] = [
      {
        factId: `${identity}.identity`,
        candidates: [
          {
            value: node.fragment,
            provenance: {
              source: 'data-pb',
              locator: `[data-pb-id="${node.fragment.pbId}"]${node.fragment.pbKey ? `[data-pb-key="${node.fragment.pbKey}"]` : ''}`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.fragment,
      },
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
      {
        factId: `${identity}.tag`,
        candidates: [
          {
            value: node.tag,
            provenance: {
              source: 'runtime-observation',
              locator: `${node.fragment.pbId}#tag-name`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.tag,
      },
      {
        factId: `${identity}.bbox`,
        candidates: [
          {
            value: node.bbox,
            provenance: {
              source: 'runtime-observation',
              locator: `${node.fragment.pbId}#bounding-client-rect`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.bbox,
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
    for (const [suffix, value, locator] of [
      ['semanticParent', node.semanticParent, '#nearest-semantic-ancestor'],
      ['semanticAncestors', node.semanticAncestors, '#semantic-ancestor-path'],
      ['documentOrder', node.documentOrder, '#document-order'],
      ['scrollOwner', node.scrollOwner, '#computed-scroll-owner'],
      ['positioning', node.positioning, '#computed-positioning'],
    ] as const) {
      if (value === undefined) continue;
      facts.push({
        factId: `${identity}.${suffix}`,
        candidates: [
          {
            value,
            provenance: {
              source: 'runtime-observation',
              locator: `${node.fragment.pbId}${locator}`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: value,
      });
    }
    if (node.componentId) {
      facts.push({
        factId: `${identity}.componentId`,
        candidates: [
          {
            value: node.componentId,
            provenance: {
              source: 'registry',
              locator: `${node.fragment.pbId}#componentId`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.componentId,
      });
    }
    if (node.props && Object.keys(node.props).length > 0) {
      facts.push({
        factId: `${identity}.props`,
        candidates: [
          {
            value: node.props,
            provenance: {
              source: 'registry',
              locator: `${node.fragment.pbId}#props`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: node.props,
      });
    }
    if (node.tokenBindings && Object.keys(node.tokenBindings).length > 0) {
      const bindingEvidence =
        node.tokenBindingEvidence ??
        Object.entries(node.tokenBindings).map(([slot, tokenId]) => ({
          slot,
          tokenId,
          source: 'runtime-registration' as const,
        }));
      const candidates = bindingEvidence.map((binding) => ({
        value: { slot: binding.slot, tokenId: binding.tokenId },
        provenance: {
          source: binding.source,
          locator: `${node.fragment.pbId}#tokenBindings.${binding.slot}`,
        },
      }));
      facts.push({
        factId: `${identity}.tokenBindings`,
        candidates,
        resolution:
          (node.tokenBindingConflicts?.length ?? 0) > 0
            ? 'unresolved-conflict'
            : 'resolved',
        ...((node.tokenBindingConflicts?.length ?? 0) > 0
          ? { issueRef: `${identity}.token-binding-conflict` }
          : { effectiveValue: node.tokenBindings }),
      });
    }
    return facts;
  });
}

function sameFragment(
  left: RuntimeFragmentIdentity | undefined,
  right: RuntimeFragmentIdentity | undefined,
): boolean {
  if (!left || !right) return left === right;
  return fragmentKey(left) === fragmentKey(right);
}

function observedAssertionValue(
  assertion: RuntimeStructureAssertion,
  nodes: RuntimeSemanticNode[],
): unknown {
  const byFragment = new Map(
    nodes.map((node) => [fragmentKey(node.fragment), node] as const),
  );
  if (assertion.kind === 'parent') {
    return byFragment.get(fragmentKey(assertion.child))?.semanticParent;
  }
  if (assertion.kind === 'scroll-owner') {
    return byFragment.get(fragmentKey(assertion.fragment))?.scrollOwner;
  }
  if (assertion.kind === 'positioning') {
    return byFragment.get(fragmentKey(assertion.fragment))?.positioning;
  }
  if (assertion.kind === 'visibility') {
    return byFragment.get(fragmentKey(assertion.fragment))?.visible;
  }
  return assertion.children
    .map((fragment) => byFragment.get(fragmentKey(fragment)))
    .filter((node): node is RuntimeSemanticNode => node !== undefined)
    .sort((left, right) => left.documentOrder - right.documentOrder)
    .map((node) => node.fragment);
}

function expectedAssertionValue(assertion: RuntimeStructureAssertion): unknown {
  if (assertion.kind === 'parent') return assertion.parent;
  if (assertion.kind === 'scroll-owner') return assertion.owner;
  if (assertion.kind === 'positioning') return assertion.value;
  if (assertion.kind === 'visibility') return assertion.visible;
  return assertion.children;
}

function structureValueMatches(
  assertion: RuntimeStructureAssertion,
  observed: unknown,
): boolean {
  const expected = expectedAssertionValue(assertion);
  if (assertion.kind === 'parent') {
    return sameFragment(
      observed as RuntimeFragmentIdentity | undefined,
      expected as RuntimeFragmentIdentity,
    );
  }
  return JSON.stringify(observed) === JSON.stringify(expected);
}

function structureContractFacts(input: {
  screen: RuntimeScreenManifest;
  variant: RuntimeVariantManifest;
  checkpointAssertions: RuntimeStructureAssertion[];
  nodes: RuntimeSemanticNode[];
}): Fact[] {
  const assertions = [
    ...input.screen.structureAssertions,
    ...input.variant.structureAssertions,
    ...input.checkpointAssertions,
  ];
  const facts = assertions.map((assertion, index): Fact => {
    const expected = expectedAssertionValue(assertion);
    const observed = observedAssertionValue(assertion, input.nodes);
    const factId = `${input.screen.screenId}.structure.assertion.${index}`;
    if (structureValueMatches(assertion, observed)) {
      return {
        factId,
        candidates: [
          {
            value: { assertion, observed },
            provenance: {
              source: 'runtime-contract',
              locator: `manifest.screens.${input.screen.screenId}.structureAssertions`,
            },
          },
        ],
        resolution: 'resolved',
        effectiveValue: { assertion, observed },
      };
    }
    return {
      factId,
      candidates: [
        {
          value: { expected: assertion },
          provenance: {
            source: 'runtime-contract',
            locator: `manifest.screens.${input.screen.screenId}.structureAssertions`,
          },
        },
        {
          value: { observed },
          provenance: {
            source: 'runtime-observation',
            locator: 'capture-protocol.semantic-snapshot.nodes',
          },
        },
      ],
      resolution: 'unresolved-conflict',
      issueRef: `${factId}.mismatch`,
    };
  });

  const shellPolicy =
    input.variant.shellPolicy ??
    (input.screen.shellFragments.length > 0 ? 'inherit' : undefined);
  if (!shellPolicy) return facts;
  const visible = new Set(
    input.nodes
      .filter((node) => node.visible)
      .map((node) => fragmentKey(node.fragment)),
  );
  const missingShell =
    shellPolicy === 'inherit'
      ? input.screen.shellFragments.filter(
          (fragment) => !visible.has(fragmentKey(fragment)),
        )
      : [];
  const shellValue = {
    policy: shellPolicy,
    shellFragments: input.screen.shellFragments,
    missingShell,
  };
  facts.push({
    factId: `${input.screen.screenId}.structure.shell`,
    candidates: [
      {
        value: shellValue,
        provenance: {
          source: 'runtime-contract',
          locator: `manifest.screens.${input.screen.screenId}.shellFragments`,
        },
      },
    ],
    resolution: missingShell.length === 0 ? 'resolved' : 'unknown',
    ...(missingShell.length === 0
      ? { effectiveValue: shellValue }
      : { issueRef: `${input.screen.screenId}.structure.shell.missing` }),
  });
  return facts;
}

function fragmentKey(fragment: RuntimeFragmentIdentity): string {
  return `${fragment.screenId}#${fragment.pbId}#${fragment.pbKey ?? ''}`;
}

function uniqueFragments(
  fragments: readonly RuntimeFragmentIdentity[],
): RuntimeFragmentIdentity[] {
  return [
    ...new Map(
      fragments.map((fragment) => [fragmentKey(fragment), fragment] as const),
    ).values(),
  ].sort((a, b) => fragmentKey(a).localeCompare(fragmentKey(b)));
}

function semanticCoverageFact(input: {
  screenId: string;
  requiredFragments: RuntimeFragmentIdentity[] | undefined;
  observedNodes: RuntimeSemanticNode[];
  scopeSource:
    'selection' | 'variant-contract' | 'scenario-contract' | 'undeclared';
}): Fact {
  const observedFragments = uniqueFragments(
    input.observedNodes.map((node) => node.fragment),
  );
  if (input.requiredFragments === undefined) {
    return {
      factId: `${input.screenId}.runtime.semantic-coverage`,
      candidates: [
        {
          value: {
            status: 'undeclared',
            observedFragments,
          },
          provenance: {
            source: 'runtime-observation',
            locator: 'capture-protocol.semantic-snapshot.nodes',
          },
        },
      ],
      resolution: 'unknown',
      issueRef: 'semantic-coverage-contract-missing',
    };
  }
  const requiredFragments = uniqueFragments(input.requiredFragments);
  const observedKeys = new Set(observedFragments.map(fragmentKey));
  const missingFragments = requiredFragments.filter(
    (fragment) => !observedKeys.has(fragmentKey(fragment)),
  );
  const value = {
    status: missingFragments.length === 0 ? 'declared' : 'incomplete',
    scopeSource: input.scopeSource,
    requiredFragments,
    observedFragments,
    ...(missingFragments.length > 0 ? { missingFragments } : {}),
  };
  if (missingFragments.length > 0) {
    return {
      factId: `${input.screenId}.runtime.semantic-coverage`,
      candidates: [
        {
          value,
          provenance: {
            source: 'runtime-observation',
            locator: 'capture-protocol.semantic-snapshot.nodes',
          },
        },
      ],
      resolution: 'unknown',
      issueRef: 'semantic-coverage-required-fragment-missing',
    };
  }
  return {
    factId: `${input.screenId}.runtime.semantic-coverage`,
    candidates: [
      {
        value,
        provenance: {
          source: 'runtime-observation',
          locator: `capture-protocol.semantic-snapshot.nodes#compared-with-${
            input.scopeSource === 'selection'
              ? 'request.fragments'
              : `manifest.screens.${input.screenId}.variants.requiredFragments`
          }`,
        },
      },
    ],
    resolution: 'resolved',
    effectiveValue: value,
  };
}

function actionFacts(
  screen: RuntimeScreenManifest,
  requestedFragments: readonly RuntimeFragmentIdentity[],
): Fact[] {
  const requested = new Set(requestedFragments.map(fragmentKey));
  return screen.actions
    .filter(
      (action) =>
        requested.size === 0 || requested.has(fragmentKey(action.target)),
    )
    .map((action) => {
      const value = {
        actionId: action.actionId,
        kind: action.kind,
        target: action.target,
      };
      return {
        factId: `${screen.screenId}.action.${action.actionId}`,
        candidates: [
          {
            value,
            provenance: {
              source: 'runtime-contract' as const,
              locator: `capture-protocol.describe.manifest.screens.${screen.screenId}.actions.${action.actionId}`,
            },
          },
        ],
        resolution: 'resolved' as const,
        effectiveValue: value,
      };
    });
}

function scenarioFact(entry: CaseMatrixEntry): Fact[] {
  if (!entry.scenario) return [];
  const { scenario, checkpoint } = entry.scenario;
  const value = {
    scenarioId: scenario.scenarioId,
    ownerScreenId: scenario.ownerScreenId,
    initialVariantId: scenario.initialVariantId,
    actionIds: scenario.actionIds,
    checkpoint: {
      checkpointId: checkpoint.checkpointId,
      screenId: checkpoint.screenId,
      variantId: checkpoint.variantId,
      requiredFragments: checkpoint.requiredFragments,
      ...(checkpoint.expectedStates
        ? { expectedStates: checkpoint.expectedStates }
        : {}),
      ...(checkpoint.expectedFragmentKeys
        ? { expectedFragmentKeys: checkpoint.expectedFragmentKeys }
        : {}),
      ...(checkpoint.forbiddenFragments
        ? { forbiddenFragments: checkpoint.forbiddenFragments }
        : {}),
    },
  };
  return [
    {
      factId: `${scenario.ownerScreenId}.scenario.${scenario.scenarioId}.${checkpoint.checkpointId}`,
      candidates: [
        {
          value,
          provenance: {
            source: 'runtime-contract',
            locator: `capture-protocol.describe.manifest.screens.${scenario.ownerScreenId}.scenarios.${scenario.scenarioId}`,
          },
        },
      ],
      resolution: 'resolved',
      effectiveValue: value,
    },
  ];
}

async function assertRenderedImagesLoaded(page: Page): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll('img, svg image'));
        await Promise.all(
          images.map(async (element) => {
            const rect = element.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;
            for (
              let current: Element | null = element;
              current;
              current = current.parentElement
            ) {
              const style = getComputedStyle(current);
              if (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                Number(style.opacity) === 0
              )
                return;
            }
            const source =
              element instanceof HTMLImageElement
                ? element.currentSrc || element.src
                : (element as SVGImageElement).href.baseVal;
            const identity =
              element.closest('[data-pb-id]')?.getAttribute('data-pb-id') ??
              element.tagName;
            if (!source)
              throw new Error(`Page image has no source: ${identity}`);
            const image =
              element instanceof HTMLImageElement ? element : new Image();
            if (!(element instanceof HTMLImageElement)) {
              image.src = new URL(source, document.baseURI).href;
            }
            try {
              await image.decode();
              if (!image.naturalWidth || !image.naturalHeight)
                throw new Error('empty image');
            } catch {
              throw new Error(`Page image failed to load: ${identity}`);
            }
          }),
        );
      }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Page image loading timed out.')),
          10_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
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

async function captureGenericFacts(
  page: Page,
  screenId: string,
): Promise<Fact[]> {
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

export type CaptureDriverMetrics = {
  browserLaunches: number;
  contextsCreated: number;
  pageNavigations: number;
  actionsExecuted: number;
  sharedAppearanceCases: number;
  independentCases: number;
  appearanceFallbacks: number;
  manifestReuses: number;
  semanticSnapshots: number;
  screenshots: number;
  phaseMilliseconds: Record<
    | 'initialization'
    | 'manifest'
    | 'statePreparation'
    | 'observation'
    | 'screenshots',
    number
  >;
};

export type CaptureDriverOptions = {
  /** Diagnostic comparison only; all observations and gates remain enabled. */
  reuseAppearances?: boolean;
};

/** Equal business inputs may be adjacent even when their appearances differ. */
export function captureExecutionKey(entry: CaseMatrixEntry): string {
  const {
    theme: _theme,
    themeId: _mode,
    ...businessKey
  } = entry.selectedCase.caseKey;
  return JSON.stringify({
    businessKey,
    scope: entry.selectedCase.captureScope,
    runtimePath: entry.runtimePath,
    initialScreenId: entry.initialScreenId,
    initialVariantId: entry.initialVariantId,
    routeQuery: entry.initialRouteQuery,
    scenario: entry.scenario,
  });
}

type PreparedAppearance = {
  key: string;
  page: Page;
  context: BrowserContext;
  browser: Browser;
  tempRoot: string;
  manifest: RuntimeCaptureManifest;
  stateDigest: string;
  executionId: string;
  sourceCaseId: string;
  sourceTheme: { theme: string; mode: string };
  diagnostics: CaptureDiagnostics;
};

/** A fresh Context per business state; explicitly supported appearances share that state. */
export class PlaywrightCaseCaptureDriver implements CaseCaptureDriver {
  private prepared: PreparedAppearance | undefined;
  private knownManifest?: RuntimeCaptureManifest;
  readonly metrics: CaptureDriverMetrics;

  constructor(
    private readonly sharedBrowser?: Browser,
    private readonly options: CaptureDriverOptions = {},
    metrics?: CaptureDriverMetrics,
  ) {
    this.metrics = metrics ?? {
      browserLaunches: 0,
      contextsCreated: 0,
      pageNavigations: 0,
      actionsExecuted: 0,
      sharedAppearanceCases: 0,
      independentCases: 0,
      appearanceFallbacks: 0,
      manifestReuses: 0,
      semanticSnapshots: 0,
      screenshots: 0,
      phaseMilliseconds: {
        initialization: 0,
        manifest: 0,
        statePreparation: 0,
        observation: 0,
        screenshots: 0,
      },
    };
  }

  private async releasePrepared(): Promise<void> {
    const prepared = this.prepared;
    this.prepared = undefined;
    if (!prepared) return;
    await prepared.context.tracing.stop().catch(() => undefined);
    await prepared.context.close().catch(() => undefined);
    if (!this.sharedBrowser)
      await prepared.browser.close().catch(() => undefined);
    await rm(prepared.tempRoot, { recursive: true, force: true });
  }

  async openSession(): Promise<
    CaseCaptureDriver & { dispose(): Promise<void> }
  > {
    const { chromium } = await import('playwright');
    let browser: Promise<Browser> | undefined;
    let driver: PlaywrightCaseCaptureDriver | undefined;
    return {
      captureCase: async (input) => {
        if (input.signal?.aborted)
          throw new Error('Capture cancelled before Case start.');
        if (!browser) {
          this.metrics.browserLaunches += 1;
          browser = chromium.launch({ headless: true });
        }
        driver ??= new PlaywrightCaseCaptureDriver(
          await browser,
          this.options,
          this.metrics,
        );
        return driver.captureCase(input);
      },
      dispose: async () => {
        await driver?.releasePrepared();
        await (
          await browser?.catch(() => undefined)
        )
          ?.close()
          .catch(() => undefined);
      },
      discardPrepared: async () => {
        await driver?.releasePrepared();
      },
    };
  }

  async captureCase(input: CaptureCaseInput): Promise<CapturedCase> {
    return this.captureAppearance(input, false);
  }

  private async captureAppearance(
    input: CaptureCaseInput,
    forceIndependent: boolean,
  ): Promise<CapturedCase> {
    if (input.signal?.aborted)
      throw new Error('Capture cancelled before Case start.');
    const { chromium } = await import('playwright');
    const profile = resolveCaptureDevice(
      input.entry.selectedCase.caseKey.deviceId,
    );
    const mode = input.entry.selectedCase.caseKey.themeId;
    if (mode !== 'light' && mode !== 'dark') {
      throw new Error(
        `Protocol error: colorScheme mode must be light or dark, received ${mode}.`,
      );
    }
    const theme = {
      packId: input.preflight.selection.themePack.packId,
      packDigest: input.preflight.selection.themePack.packDigest,
      theme:
        input.entry.selectedCase.caseKey.theme ??
        input.preflight.selection.themePack.theme,
      mode,
    };
    const executionKey = JSON.stringify([
      input.runtimeBaseUrl,
      input.preflight.inputVersion,
      captureExecutionKey(input.entry),
    ]);
    if (this.prepared?.key !== executionKey || forceIndependent)
      await this.releasePrepared();
    const shared = this.prepared;
    const diagnostics: CaptureDiagnostics = shared?.diagnostics ?? {
      console: [],
      pageErrors: [],
      failedRequests: [],
    };
    const tempRoot =
      shared?.tempRoot ??
      (await mkdtemp(path.join(os.tmpdir(), 'pb-v2-capture-')));
    let browser: Browser | undefined;
    let context: BrowserContext | undefined;
    let traceStopped = false;
    let keepContext = false;
    let fallback = false;
    let observedStateDigest: string | undefined;
    const abortCase = () => {
      void context?.close().catch(() => undefined);
    };
    let phaseStarted = performance.now();
    try {
      if (!shared && !this.sharedBrowser) this.metrics.browserLaunches += 1;
      browser =
        shared?.browser ??
        this.sharedBrowser ??
        (await chromium.launch({ headless: true }));
      if (!shared) this.metrics.contextsCreated += 1;
      context =
        shared?.context ??
        (await browser.newContext({
          viewport: profile.viewport,
          deviceScaleFactor: profile.deviceScaleFactor,
          isMobile: profile.isMobile,
          hasTouch: profile.hasTouch,
          locale: 'zh-CN',
          timezoneId: input.preflight.clock.timeZone,
          colorScheme: mode,
          reducedMotion: 'reduce',
          serviceWorkers: 'block',
        }));
      input.signal?.addEventListener('abort', abortCase, { once: true });
      if (input.signal?.aborted) throw new Error('Capture cancelled.');
      if (!shared)
        await context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        });
      const page = shared?.page ?? (await context.newPage());
      if (!shared) {
        await page.clock.install({ time: new Date(input.preflight.clock.now) });
        page.on('console', (message) => {
          diagnostics.console.push(
            `${message.type()}: ${message.text()}`.slice(0, 1000),
          );
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
        const url = buildRuntimeCaseUrl({
          runtimeBaseUrl: input.runtimeBaseUrl,
          path: input.entry.runtimePath,
          variantId: input.entry.initialVariantId,
          themeId: input.entry.selectedCase.caseKey.themeId,
          theme: theme.theme,
          ...(input.entry.initialRouteQuery
            ? { routeQuery: input.entry.initialRouteQuery }
            : {}),
        });
        this.metrics.pageNavigations += 1;
        await page.goto(url, {
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
          themeId: new URL(window.location.href).searchParams.get('mode'),
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
      }
      if (input.signal?.aborted) throw new Error('Capture cancelled.');

      this.metrics.phaseMilliseconds.initialization +=
        performance.now() - phaseStarted;
      phaseStarted = performance.now();
      const inputMode = input.entry.selectedCase.captureScope.evidenceInputMode;
      let facts: Fact[] = [];
      let evidenceLevel: EvidenceLevel;
      if (inputMode === 'instrumented') {
        await page.waitForFunction(
          (globalName) =>
            Boolean((window as unknown as Record<string, unknown>)[globalName]),
          RUNTIME_CAPTURE_GLOBAL,
          { timeout: 10_000 },
        );
        const described = shared
          ? {
              kind: 'describe' as const,
              payload: { manifest: shared.manifest },
            }
          : await requestRuntimeCapture(page, {
              kind: 'describe',
              ...(this.knownManifest?.sourceDigest
                ? { knownManifest: this.knownManifest }
                : {}),
            });
        if (!shared) {
          if (
            this.knownManifest?.sourceDigest &&
            this.knownManifest.sourceDigest ===
              described.payload.manifest.sourceDigest
          )
            this.metrics.manifestReuses += 1;
          this.knownManifest = described.payload.manifest;
        }
        if (
          described.kind !== 'describe' ||
          described.payload.manifest.inputVersion !==
            input.preflight.inputVersion
        ) {
          throw new Error(
            `Runtime manifest changed after Preflight (${input.preflight.inputVersion}).`,
          );
        }
        const manifestTheme = described.payload.manifest.theme;
        const selectedTheme = input.preflight.selection.themePack;
        if (
          manifestTheme.packId !== selectedTheme.packId ||
          manifestTheme.packDigest !== selectedTheme.packDigest ||
          manifestTheme.defaultTheme !== selectedTheme.theme ||
          manifestTheme.defaultMode !== selectedTheme.mode
        ) {
          throw new Error(
            `environment.theme-digest-mismatch: Runtime ${manifestTheme.packId}@${manifestTheme.packDigest}/${manifestTheme.defaultTheme}/${manifestTheme.defaultMode} does not match Selection ${selectedTheme.packId}@${selectedTheme.packDigest}/${selectedTheme.theme}/${selectedTheme.mode}.`,
          );
        }
        this.metrics.phaseMilliseconds.manifest +=
          performance.now() - phaseStarted;
        phaseStarted = performance.now();
        const expectedInitial = {
          prototypeId: input.preflight.selection.prototypeId,
          screenId: input.entry.initialScreenId,
          variantId: input.entry.initialVariantId,
          theme,
        };
        if (shared) {
          try {
            await page.emulateMedia({ colorScheme: mode });
            const switched = await requestRuntimeCapture(page, {
              kind: 'set-render-theme',
              theme,
              expectedStateDigest: shared.stateDigest,
            });
            if (switched.payload.stateDigest !== shared.stateDigest)
              throw new Error(
                'Appearance changed the prepared business state.',
              );
          } catch (error) {
            if (
              error instanceof RuntimeProtocolError &&
              ['capture-state-changed', 'capture-state-unsupported'].includes(
                error.code,
              )
            ) {
              fallback = true;
            }
            throw error;
          }
        } else {
          const prepared = await requestRuntimeCapture(page, {
            kind: 'prepare',
            expected: expectedInitial,
          });
          if (prepared.kind !== 'prepare')
            throw new Error('Unexpected prepare response.');
        }

        const targetScreen = described.payload.manifest.screens.find(
          (screen) =>
            screen.screenId === input.entry.selectedCase.caseKey.screenId,
        );
        const targetVariant = targetScreen?.variants.find(
          (variant) =>
            variant.variantId === input.entry.selectedCase.caseKey.variantId,
        );
        if (!targetScreen || !targetVariant) {
          throw new Error(
            `Runtime manifest no longer contains target ${input.entry.selectedCase.caseKey.screenId}/${input.entry.selectedCase.caseKey.variantId}.`,
          );
        }

        if (input.entry.scenario && !shared) {
          const ownerScreen = described.payload.manifest.screens.find(
            (screen) =>
              screen.screenId === input.entry.scenario!.scenario.ownerScreenId,
          );
          // Only the first action must exist in the initial state. Later
          // targets can be revealed by earlier actions (for example a Sheet).
          // Runtime checks every target immediately before executing it.
          const firstActionId = input.entry.scenario.scenario.actionIds[0];
          const actionTargets =
            ownerScreen?.actions
              .filter((action) => action.actionId === firstActionId)
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
            this.metrics.actionsExecuted += 1;
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

        if (shared && input.entry.scenario) {
          await requestRuntimeCapture(page, {
            kind: 'verify-checkpoint',
            scenarioId: input.entry.scenario.scenario.scenarioId,
            checkpointId: input.entry.scenario.checkpoint.checkpointId,
          });
        }
        const canObserveState =
          input.entry.selectedCase.captureScope.screenshots.mode !== 'selected' &&
          described.payload.manifest.capabilities.includes('capture-state');
        const canShare = Boolean(
          this.sharedBrowser &&
          !forceIndependent &&
          this.options.reuseAppearances !== false &&
          input.entry.selectedCase.captureScope.screenshots.mode !==
            'selected' &&
          described.payload.manifest.capabilities.includes('capture-state') &&
          described.payload.manifest.capabilities.includes(
            'set-render-theme',
          ) &&
          (!input.entry.scenario ||
            input.entry.scenario.scenario.appearancePolicy === 'shared'),
        );
        if (!shared && canObserveState) {
          await page.clock.setFixedTime(
            new Date(await page.evaluate(() => Date.now())),
          );
        }

        this.metrics.phaseMilliseconds.statePreparation +=
          performance.now() - phaseStarted;
        phaseStarted = performance.now();
        const selectedFragments =
          input.entry.selectedCase.captureScope.fragments;
        const declaredRequiredFragments =
          selectedFragments.length > 0
            ? selectedFragments
            : input.entry.scenario
              ? input.entry.scenario.checkpoint.requiredFragments
              : targetVariant.requiredFragments;
        const requiredFragments = uniqueFragments([
          ...(input.entry.scenario
            ? input.entry.scenario.checkpoint.requiredFragments
            : []),
          ...(declaredRequiredFragments ?? []),
        ]);
        const ready = await requestRuntimeCapture(page, {
          kind: 'readiness',
          expected: {
            prototypeId: input.preflight.selection.prototypeId,
            screenId: input.entry.selectedCase.caseKey.screenId,
            variantId: input.entry.selectedCase.caseKey.variantId,
            theme,
            viewport: profile.viewport,
          },
          requiredFragments,
        });
        if (ready.kind !== 'readiness')
          throw new Error('Unexpected readiness response.');
        if (canObserveState) {
          try {
            const before = await requestRuntimeCapture(page, { kind: 'capture-state' });
            observedStateDigest = before.payload.stateDigest;
            if (shared && observedStateDigest !== shared.stateDigest) {
              throw new Error('Business state changed before the appearance observation.');
            }
          } catch (error) {
            if (!(error instanceof RuntimeProtocolError && error.code === 'capture-state-unsupported')) throw error;
          }
        }
        this.metrics.semanticSnapshots += 1;
        const snapshot = await requestRuntimeCapture(page, {
          kind: 'semantic-snapshot',
          fragments: input.entry.selectedCase.captureScope.fragments,
        });
        if (snapshot.kind !== 'semantic-snapshot') {
          throw new Error('Unexpected semantic-snapshot response.');
        }
        let stateDigest = shared?.stateDigest;
        if (observedStateDigest) {
          try {
            const state = await requestRuntimeCapture(page, {
              kind: 'capture-state',
            });
            if (state.payload.stateDigest !== observedStateDigest) {
              throw new Error(
                'Business state changed during the appearance observation.',
              );
            }
            stateDigest = state.payload.stateDigest;
          } catch (error) {
            if (!(
              error instanceof RuntimeProtocolError &&
              error.code === 'capture-state-unsupported'
            ))
              throw error;
          }
        }
        const execution = {
          executionId: shared?.executionId ?? `execution-${randomUUID()}`,
          sourceCaseId: shared?.sourceCaseId ?? input.entry.selectedCase.caseId,
          mode: shared ? 'shared-appearance' : 'independent',
          sourceTheme: shared?.sourceTheme ?? {
            theme: theme.theme,
            mode: theme.mode,
          },
          ...(stateDigest ? { stateDigest } : {}),
        };
        if (canShare && stateDigest) {
          this.prepared = {
            key: executionKey,
            page,
            context,
            browser,
            tempRoot,
            stateDigest,
            manifest: described.payload.manifest,
            executionId: execution.executionId,
            sourceCaseId: execution.sourceCaseId,
            sourceTheme: execution.sourceTheme,
            diagnostics,
          };
        }
        facts = [
          {
            factId: `${input.entry.selectedCase.caseKey.screenId}.runtime.execution`,
            resolution: 'resolved',
            effectiveValue: execution,
            candidates: [
              {
                value: execution,
                provenance: {
                  source: 'runtime-observation',
                  locator: 'capture.execution',
                },
              },
            ],
          },
          actualFact(snapshot.payload.actual, 'screenId'),
          actualFact(snapshot.payload.actual, 'variantId'),
          actualFact(snapshot.payload.actual, 'themeId'),
          {
            factId: `${snapshot.payload.actual.screenId}.runtime.theme`,
            resolution: 'resolved',
            effectiveValue: snapshot.payload.actual.theme,
            candidates: [
              {
                value: snapshot.payload.actual.theme,
                provenance: {
                  source: 'runtime-contract',
                  locator: 'capture-protocol.semantic-snapshot.actual.theme',
                },
              },
            ],
          },
          semanticCoverageFact({
            screenId: input.entry.selectedCase.caseKey.screenId,
            requiredFragments: declaredRequiredFragments,
            observedNodes: snapshot.payload.nodes,
            scopeSource:
              selectedFragments.length > 0
                ? 'selection'
                : input.entry.scenario
                  ? 'scenario-contract'
                  : targetVariant.requiredFragments
                    ? 'variant-contract'
                    : 'undeclared',
          }),
          ...actionFacts(
            input.entry.scenario
              ? (described.payload.manifest.screens.find(
                  (screen) =>
                    screen.screenId ===
                    input.entry.scenario!.scenario.ownerScreenId,
                ) ?? targetScreen)
              : targetScreen,
            selectedFragments,
          ),
          ...scenarioFact(input.entry),
          ...structureContractFacts({
            screen: targetScreen,
            variant: targetVariant,
            checkpointAssertions:
              input.entry.scenario?.checkpoint.structureAssertions ?? [],
            nodes: snapshot.payload.nodes,
          }),
          ...nodeFacts(snapshot.payload.nodes),
        ];
        // Runtime instrumentation alone cannot prove source provenance. A
        // future Source adapter may promote this level after resolving source
        // facts; until then the driver must report the evidence it actually has.
        evidenceLevel = 'instrumented-runtime';
      } else if (inputMode === 'generic-runtime') {
        facts = await captureGenericFacts(
          page,
          input.entry.selectedCase.caseKey.screenId,
        );
        evidenceLevel = 'generic-runtime';
      } else {
        evidenceLevel = 'screenshot-only';
      }

      this.metrics.phaseMilliseconds.observation +=
        performance.now() - phaseStarted;
      phaseStarted = performance.now();
      await assertRenderedImagesLoaded(page);
      const binaries = await screenshotBinaries(page, input.entry);
      if (observedStateDigest) {
        const observed = await requestRuntimeCapture(page, {
          kind: 'capture-state',
        });
        if (observed.payload.stateDigest !== observedStateDigest) {
          throw new Error(
            'Business state changed between semantic observation and screenshot completion.',
          );
        }
      }
      this.metrics.phaseMilliseconds.screenshots +=
        performance.now() - phaseStarted;
      this.metrics.screenshots += binaries.length;
      if (shared) this.metrics.sharedAppearanceCases += 1;
      else this.metrics.independentCases += 1;
      keepContext = this.prepared?.context === context;
      if (!keepContext) {
        await context.tracing.stop();
        traceStopped = true;
      }
      return {
        evidenceLevel,
        facts,
        requiredFactsTotal: facts.length,
        requiredFactsResolved: facts.filter(
          (fact) => fact.resolution === 'resolved',
        ).length,
        binaries,
        diagnostics,
      };
    } catch (error) {
      this.prepared = undefined;
      const trace =
        traceStopped || !context ? [] : await stopTrace(context, tempRoot);
      traceStopped = true;
      const debugBytes = new TextEncoder().encode(
        `${JSON.stringify(diagnostics, null, 2)}\n`,
      );
      if (fallback) {
        this.metrics.appearanceFallbacks += 1;
        await context?.close().catch(() => undefined);
        await rm(tempRoot, { recursive: true, force: true });
        const rejectedSharing = {
          code:
            error instanceof RuntimeProtocolError
              ? error.code
              : 'capture-state-changed',
          reason: error instanceof Error ? error.message : String(error),
          executionId: shared!.executionId,
          sourceCaseId: shared!.sourceCaseId,
          sourceTheme: shared!.sourceTheme,
        };
        const fallbackBinaries: CapturedBinary[] = [
          ...trace,
          {
            kind: 'debug',
            mediaType: 'application/json',
            bytes: new TextEncoder().encode(
              JSON.stringify({ rejectedSharing, diagnostics }),
            ),
          },
        ];
        try {
          const independent = await this.captureAppearance(input, true);
          const fact: Fact = {
            factId: `${input.entry.selectedCase.caseKey.screenId}.runtime.appearanceFallback`,
            resolution: 'resolved',
            effectiveValue: rejectedSharing,
            candidates: [
              {
                value: rejectedSharing,
                provenance: {
                  source: 'runtime-observation',
                  locator: 'capture.appearance-fallback',
                },
              },
            ],
          };
          return {
            ...independent,
            facts: [...independent.facts, fact],
            requiredFactsTotal: independent.requiredFactsTotal + 1,
            requiredFactsResolved: independent.requiredFactsResolved + 1,
            binaries: [...independent.binaries, ...fallbackBinaries],
          };
        } catch (retryError) {
          throw new CaseCaptureFailure(
            retryError instanceof Error
              ? retryError.message
              : String(retryError),
            retryError instanceof CaseCaptureFailure
              ? retryError.diagnostics
              : diagnostics,
            [
              ...fallbackBinaries,
              ...(retryError instanceof CaseCaptureFailure
                ? retryError.binaries
                : []),
            ],
          );
        }
      }
      throw new CaseCaptureFailure(
        error instanceof Error ? error.message : String(error),
        diagnostics,
        [
          ...trace,
          { kind: 'debug', mediaType: 'application/json', bytes: debugBytes },
        ],
      );
    } finally {
      input.signal?.removeEventListener('abort', abortCase);
      if (!keepContext) {
        if (!traceStopped) await context?.tracing.stop().catch(() => undefined);
        await context?.close().catch(() => undefined);
        if (!this.sharedBrowser) await browser?.close().catch(() => undefined);
        await rm(tempRoot, { recursive: true, force: true });
      }
    }
  }
}
