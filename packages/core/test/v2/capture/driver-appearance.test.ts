import { writeFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtures } from '../../../src/v2/index.js';
import { computeCaseId } from '../../../src/v2/contracts/case.js';
import { RuntimeCaptureManifest, RuntimeCaptureResponse } from '../../../src/v2/runtime-contract/index.js';
import { RuntimeProtocolError } from '../../../src/v2/capture/runtime-client.js';
import { CaseCaptureFailure, PlaywrightCaseCaptureDriver, type CaptureCaseInput } from '../../../src/v2/capture/playwright-driver.js';

const fake = vi.hoisted(() => ({ launch: vi.fn(), request: vi.fn() }));
vi.mock('playwright', () => ({ chromium: { launch: fake.launch } }));
vi.mock('../../../src/v2/capture/runtime-client.js', async (original) => ({
  ...await original<typeof import('../../../src/v2/capture/runtime-client.js')>(),
  requestRuntimeCapture: fake.request,
}));

const fixture = fixtures.referenceCaseSlice;
const selection = fixture.RUN_1.selection;
const fragment = { screenId: 'sample.task-list', pbId: 'root' };
const checkpoint = { checkpointId: 'done', screenId: fragment.screenId, variantId: 'default', requiredFragments: [], structureAssertions: [] };
const scenario = { scenarioId: 'advance', label: 'Advance', ownerScreenId: fragment.screenId, initialVariantId: 'default', actionIds: ['advance'], checkpoints: [checkpoint], appearancePolicy: 'shared' as const };
const manifest = RuntimeCaptureManifest.parse({
  protocolVersion: 3, inputVersion: 'appearance-test-v1',
  theme: { ...fixture.FIXTURE_THEME_MANIFEST, themes: ['default', 'water'] },
  clock: fixture.FIXTURE_CLOCK,
  capabilities: ['describe', 'prepare', 'readiness', 'semantic-snapshot', 'reset', 'scenario', 'capture-state', 'set-render-theme'],
  screens: [{ prototypeId: 'sample', screenId: fragment.screenId, screenSlug: 'task-list', path: '/prototype/sample/task-list',
    defaultVariantId: 'default', variants: [{ variantId: 'default', label: 'Default', requiredFragments: [] }],
    actions: [{ actionId: 'advance', kind: 'click', target: fragment }], scenarios: [scenario] }],
});

function input(theme = 'default', signal?: AbortSignal): CaptureCaseInput {
  const caseKey = { ...selection.cases[0]!.caseKey, theme };
  return {
    entry: { selectedCase: { ...selection.cases[0]!, caseKey, caseId: computeCaseId(caseKey) },
      runtimePath: '/prototype/sample/task-list', initialScreenId: fragment.screenId, initialVariantId: 'default',
      scenario: { scenario, checkpoint } },
    preflight: { selection, inputVersion: manifest.inputVersion, clock: fixture.FIXTURE_CLOCK } as CaptureCaseInput['preflight'],
    runtimeBaseUrl: 'http://127.0.0.1:3977', signal,
  };
}

function harness(options: { rejectSwitch?: boolean; retryFails?: boolean; mutateAfterScreenshot?: boolean; abortOnSwitch?: AbortController } = {}) {
  const contexts: ReturnType<typeof makeContext>[] = [];
  const pages: ReturnType<typeof makePage>[] = [];
  const browserClose = vi.fn(async () => undefined);
  function makePage() {
    const page = {
      url: '', theme: { ...selection.themePack }, screenshots: 0,
      clock: { install: vi.fn(async () => undefined), setFixedTime: vi.fn(async () => undefined) },
      on: vi.fn(), goto: vi.fn(async (url: string) => {
        page.url = url;
        page.theme = { ...selection.themePack, theme: new URL(url).searchParams.get('theme')!, mode: new URL(url).searchParams.get('mode')! };
      }),
      addStyleTag: vi.fn(async () => undefined), waitForFunction: vi.fn(async () => undefined),
      emulateMedia: vi.fn(async () => undefined),
      evaluate: vi.fn(async (fn: () => unknown) => {
        const text = String(fn);
        if (text.includes('innerWidth')) return { width: 390, height: 844, deviceScaleFactor: 3, pathname: '/prototype/sample/task-list', variantId: 'default', themeId: page.theme.mode };
        if (text.includes('Date.now')) return Date.parse(fixture.FIXTURE_CLOCK.now);
        return undefined; // fonts.ready and image decoding both complete.
      }),
      screenshot: vi.fn(async () => { page.screenshots++; return Buffer.from('observed-screenshot'); }),
    };
    pages.push(page);
    return page;
  }
  function makeContext() {
    const page = makePage();
    const context = { close: vi.fn(async () => undefined), newPage: vi.fn(async () => page), route: vi.fn(async () => undefined),
      tracing: { start: vi.fn(async () => undefined), stop: vi.fn(async (options?: { path: string }) => {
        if (options?.path) await writeFile(options.path, Buffer.from('original-trace'));
      }) } };
    contexts.push(context);
    return context;
  }
  const newContext = vi.fn(async () => makeContext());
  fake.launch.mockResolvedValue({ close: browserClose, newContext });
  fake.request.mockImplementation(async (page: ReturnType<typeof makePage>, request: { kind: string; theme?: typeof page.theme }) => {
    if (request.kind === 'set-render-theme') {
      options.abortOnSwitch?.abort();
      if (options.abortOnSwitch) throw new Error('Capture cancelled.');
      if (options.rejectSwitch) throw new RuntimeProtocolError('capture-state-changed', 'Original sharing rejected');
      page.theme = request.theme!;
    }
    if (request.kind === 'prepare' && options.retryFails && pages.indexOf(page) > 0) throw new Error('Independent retry failed');
    const actual = { prototypeId: 'sample', screenId: fragment.screenId, variantId: 'default', theme: page.theme,
      viewport: { width: 390, height: 844, deviceScaleFactor: 3 } };
    let payload: unknown;
    switch (request.kind) {
      case 'describe': payload = { manifest }; break;
      case 'readiness': payload = { actual, stable: true, checks: ['ready'] }; break;
      case 'semantic-snapshot': payload = { actual, nodes: [] }; break;
      case 'capture-state':
      case 'set-render-theme': payload = { actual, stateDigest: options.mutateAfterScreenshot && page.screenshots > 0 ? 'changed-state' : 'same-state' }; break;
      case 'execute-action': payload = { actual, actionId: 'advance' }; break;
      case 'verify-checkpoint': payload = { actual, checkpointId: 'done' }; break;
      default: payload = { actual };
    }
    // Keep mock responses compatible with the actual protocol contract.
    return RuntimeCaptureResponse.parse({ protocolVersion: 3, requestId: 'request-test', kind: request.kind, ok: true, payload });
  });
  return { contexts, pages, browserClose, newContext };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('Prepared business state across theme appearances', () => {
  it('reuses preparation/actions but observes and screenshots every appearance', async () => {
    const h = harness();
    const driver = new PlaywrightCaseCaptureDriver();
    const session = await driver.openSession();
    try {
      const first = await session.captureCase(input());
      const second = await session.captureCase(input('water'));
      const kinds = fake.request.mock.calls.map(([, request]) => request.kind);
      expect(kinds.filter((kind) => kind === 'prepare')).toHaveLength(1);
      expect(kinds.filter((kind) => kind === 'execute-action')).toHaveLength(1);
      expect(kinds.filter((kind) => kind === 'verify-checkpoint')).toHaveLength(2);
      expect(kinds.filter((kind) => kind === 'readiness')).toHaveLength(3);
      expect(kinds.filter((kind) => kind === 'semantic-snapshot')).toHaveLength(2);
      expect(h.newContext).toHaveBeenCalledOnce();
      expect(h.pages[0]!.screenshot).toHaveBeenCalledTimes(2);
      expect(first.binaries.filter((item) => item.kind === 'screenshot')).toHaveLength(1);
      expect(second.facts.find((fact) => fact.factId.endsWith('.runtime.execution'))?.effectiveValue).toMatchObject({ mode: 'shared-appearance', sourceCaseId: input().entry.selectedCase.caseId });
      expect(h.contexts[0]!.close).not.toHaveBeenCalled();
    } finally { await session.dispose(); }
    expect(h.contexts[0]!.close).toHaveBeenCalledOnce();
    expect(h.browserClose).toHaveBeenCalledOnce();
  });

  it('retries a changed-state rejection independently and preserves the original trace/debug and fallback fact', async () => {
    const h = harness({ rejectSwitch: true });
    const driver = new PlaywrightCaseCaptureDriver();
    const session = await driver.openSession();
    try {
      await session.captureCase(input());
      const result = await session.captureCase(input('water'));
      expect(h.newContext).toHaveBeenCalledTimes(2);
      expect(fake.request.mock.calls.filter(([, request]) => request.kind === 'execute-action')).toHaveLength(2);
      expect(result.facts.find((fact) => fact.factId.endsWith('.runtime.appearanceFallback'))?.effectiveValue).toMatchObject({ code: 'capture-state-changed', reason: 'Original sharing rejected' });
      expect(result.binaries.map((item) => item.kind).sort()).toEqual(['debug', 'screenshot', 'trace']);
      expect(JSON.parse(Buffer.from(result.binaries.find((item) => item.kind === 'debug')!.bytes).toString())).toMatchObject({ rejectedSharing: { reason: 'Original sharing rejected' } });
    } finally { await session.dispose(); }
    expect(h.contexts.every((context) => context.close.mock.calls.length > 0)).toBe(true);
  });

  it('preserves both attempts diagnostic artifacts when the independent retry also fails', async () => {
    const h = harness({ rejectSwitch: true, retryFails: true });
    const session = await new PlaywrightCaseCaptureDriver().openSession();
    try {
      await session.captureCase(input());
      const failure = await session.captureCase(input('water')).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(CaseCaptureFailure);
      expect((failure as Error).message).toContain('Independent retry failed');
      const binaries = (failure as CaseCaptureFailure).binaries;
      expect(binaries.filter((item) => item.kind === 'trace')).toHaveLength(2);
      const debug = binaries.filter((item) => item.kind === 'debug').map((item) => JSON.parse(Buffer.from(item.bytes).toString()));
      expect(debug).toHaveLength(2);
      expect(debug[0]).toMatchObject({ rejectedSharing: { reason: 'Original sharing rejected' } });
    } finally { await session.dispose(); }
    expect(h.contexts.every((context) => context.close.mock.calls.length > 0)).toBe(true);
  });

  it('fails the final state check after screenshot and never retains that Context for the next appearance', async () => {
    const h = harness({ mutateAfterScreenshot: true });
    const session = await new PlaywrightCaseCaptureDriver().openSession();
    try {
      await expect(session.captureCase(input())).rejects.toThrow('Business state changed between semantic observation and screenshot completion');
      expect(h.contexts[0]!.close).toHaveBeenCalled();
      await expect(session.captureCase(input('water'))).rejects.toThrow('Business state changed between semantic observation and screenshot completion');
      expect(h.newContext).toHaveBeenCalledTimes(2);
      expect(fake.request.mock.calls.some(([, request]) => request.kind === 'set-render-theme')).toBe(false);
    } finally { await session.dispose(); }
  });

  it('closes the retained Context on cancellation and disposes the Job browser', async () => {
    const controller = new AbortController();
    const h = harness({ abortOnSwitch: controller });
    const session = await new PlaywrightCaseCaptureDriver().openSession();
    try {
      await session.captureCase(input());
      await expect(session.captureCase(input('water', controller.signal))).rejects.toThrow('cancelled');
      expect(h.contexts[0]!.close).toHaveBeenCalled();
    } finally { await session.dispose(); }
    expect(h.browserClose).toHaveBeenCalledOnce();
  });
});
