import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtures } from '../../../src/v2/index.js';
import {
  PlaywrightCaseCaptureDriver,
  type CaptureCaseInput,
} from '../../../src/v2/capture/playwright-driver.js';

const fake = vi.hoisted(() => ({
  closeBrowser: vi.fn(async () => undefined),
  newContext: vi.fn(),
  launch: vi.fn(),
}));
vi.mock('playwright', () => ({ chromium: { launch: fake.launch } }));

const selection = fixtures.referenceCaseSlice.RUN_1.selection;
const input = {
  entry: { selectedCase: selection.cases[0]! },
  preflight: {
    selection,
    clock: { now: '2026-07-28T00:00:00.000Z', timeZone: 'Asia/Shanghai' },
  },
  runtimeBaseUrl: 'http://127.0.0.1:3977',
} as CaptureCaseInput;

beforeEach(() => {
  vi.clearAllMocks();
  fake.launch.mockResolvedValue({
    newContext: fake.newContext,
    close: fake.closeBrowser,
  });
});

describe('Job browser lifetime', () => {
  it('starts one browser for a Job, creates fresh Contexts and closes failed initialization', async () => {
    const closes = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
    closes.forEach((close) =>
      fake.newContext.mockResolvedValueOnce({
        close,
        tracing: {
          start: async () => {
            throw new Error('tracing initialization failed');
          },
          stop: vi.fn(async () => undefined),
        },
      }),
    );
    const session = await new PlaywrightCaseCaptureDriver().openSession();
    try {
      await expect(session.captureCase(input)).rejects.toThrow(
        'tracing initialization failed',
      );
      await expect(session.captureCase(input)).rejects.toThrow(
        'tracing initialization failed',
      );
      expect(fake.launch).toHaveBeenCalledTimes(1);
      expect(fake.newContext).toHaveBeenCalledTimes(2);
      closes.forEach((close) => expect(close).toHaveBeenCalledOnce());
      expect(fake.closeBrowser).not.toHaveBeenCalled();
    } finally {
      await session.dispose();
    }
    expect(fake.closeBrowser).toHaveBeenCalledOnce();
  });

  it('does not launch Chromium when a Job reuses all Cases', async () => {
    const session = await new PlaywrightCaseCaptureDriver().openSession();
    await session.dispose();
    expect(fake.launch).not.toHaveBeenCalled();
  });

  it('closes a standalone browser even if Context creation fails', async () => {
    fake.newContext.mockRejectedValueOnce(
      new Error('context initialization failed'),
    );
    await expect(
      new PlaywrightCaseCaptureDriver().captureCase(input),
    ).rejects.toThrow('context initialization failed');
    expect(fake.closeBrowser).toHaveBeenCalledOnce();
  });

  it('does not launch a browser for an already cancelled Case', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new PlaywrightCaseCaptureDriver().captureCase({
        ...input,
        signal: controller.signal,
      }),
    ).rejects.toThrow('cancelled');
    expect(fake.launch).not.toHaveBeenCalled();
  });
});
