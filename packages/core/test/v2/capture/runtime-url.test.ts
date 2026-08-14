import { describe, expect, it } from 'vitest';
import { buildRuntimeCaseUrl } from '../../../src/v2/capture/runtime-url.js';
import { V2ContractError } from '../../../src/v2/contracts/errors.js';

describe('buildRuntimeCaseUrl', () => {
  it('replaces stale query and writes sorted authored route query', () => {
    expect(
      buildRuntimeCaseUrl({
        runtimeBaseUrl: 'http://127.0.0.1:3977/base',
        path: '/prototype/sample/task-list?stale=1',
        variantId: 'claimable',
        themeId: 'dark',
        routeQuery: { zed: '1', record: 'task-claimable' },
      }),
    ).toBe(
      'http://127.0.0.1:3977/prototype/sample/task-list?variant=claimable&theme=dark&record=task-claimable&zed=1',
    );
  });

  it('rejects cross-origin paths and reserved route query keys', () => {
    expect(() =>
      buildRuntimeCaseUrl({
        runtimeBaseUrl: 'http://127.0.0.1:3977',
        path: 'https://example.com/prototype/sample/task-list',
        variantId: 'default',
        themeId: 'light',
      }),
    ).toThrow(V2ContractError);
    expect(() =>
      buildRuntimeCaseUrl({
        runtimeBaseUrl: 'http://127.0.0.1:3977',
        path: '/prototype/sample/task-list',
        variantId: 'default',
        themeId: 'light',
        routeQuery: { variant: 'override' },
      }),
    ).toThrow(V2ContractError);
  });
});
