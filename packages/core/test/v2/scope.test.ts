import { describe, expect, it } from 'vitest';
import {
  computeScopeKey,
  isFullCaseScope,
  normalizeCaptureScope,
  scopeCovers,
  scopeEquals,
  type CaptureScopeInput,
} from '../../src/v2/index.js';

const screenId = 'project.task-list';
const rowA = { screenId, pbId: 'project.task-list.list.row', pbKey: 'a' };
const rowB = { screenId, pbId: 'project.task-list.list.row', pbKey: 'b' };

function fullScopeInput(overrides: Partial<CaptureScopeInput> = {}): CaptureScopeInput {
  return {
    fragments: [],
    screenshots: { mode: 'all' },
    sourcePolicy: true,
    debugPolicy: false,
    evidenceInputMode: 'instrumented',
    minEvidenceLevel: 'instrumented-source-runtime',
    ...overrides,
  };
}

describe('normalizeCaptureScope / computeScopeKey', () => {
  it('is independent of fragment order and duplicates', () => {
    const a = normalizeCaptureScope(fullScopeInput({ fragments: [rowA, rowB, rowA] }));
    const b = normalizeCaptureScope(fullScopeInput({ fragments: [rowB, rowA] }));
    expect(computeScopeKey(a)).toBe(computeScopeKey(b));
  });

  it('changes when the requested Evidence input mode or min level changes', () => {
    const instrumented = normalizeCaptureScope(fullScopeInput({ evidenceInputMode: 'instrumented' }));
    const generic = normalizeCaptureScope(fullScopeInput({ evidenceInputMode: 'generic-runtime', minEvidenceLevel: 'generic-runtime' }));
    expect(computeScopeKey(instrumented)).not.toBe(computeScopeKey(generic));
  });

  it('produces a value matching the reserved scopeKey shape', () => {
    const scope = normalizeCaptureScope(fullScopeInput());
    expect(computeScopeKey(scope)).toMatch(/^scope_[0-9a-f]{16}$/);
  });
});

describe('isFullCaseScope', () => {
  it('is true only when fragments are empty', () => {
    expect(isFullCaseScope(normalizeCaptureScope(fullScopeInput()))).toBe(true);
    expect(isFullCaseScope(normalizeCaptureScope(fullScopeInput({ fragments: [rowA] })))).toBe(false);
  });
});

describe('scopeCovers', () => {
  it('a full-screen scope covers any Fragment subset of the same or lower profile', () => {
    const full = normalizeCaptureScope(fullScopeInput());
    const fragment = normalizeCaptureScope({
      fragments: [rowA],
      screenshots: { mode: 'selected', targets: [rowA] },
      sourcePolicy: false,
      debugPolicy: false,
      evidenceInputMode: 'instrumented',
      minEvidenceLevel: 'instrumented-runtime',
    });
    expect(scopeCovers(full, fragment)).toBe(true);
    expect(scopeCovers(fragment, full)).toBe(false);
  });

  it('two scopes with incomparable extras cover a shared narrower request but not each other', () => {
    const withScreenshots = normalizeCaptureScope({
      fragments: [rowA],
      screenshots: { mode: 'all' },
      sourcePolicy: false,
      debugPolicy: false,
      evidenceInputMode: 'instrumented',
      minEvidenceLevel: 'instrumented-runtime',
    });
    const withSource = normalizeCaptureScope({
      fragments: [rowA],
      screenshots: { mode: 'none' },
      sourcePolicy: true,
      debugPolicy: false,
      evidenceInputMode: 'instrumented',
      minEvidenceLevel: 'instrumented-runtime',
    });
    const request = normalizeCaptureScope({
      fragments: [rowA],
      screenshots: { mode: 'none' },
      sourcePolicy: false,
      debugPolicy: false,
      evidenceInputMode: 'instrumented',
      minEvidenceLevel: 'instrumented-runtime',
    });
    expect(scopeCovers(withScreenshots, request)).toBe(true);
    expect(scopeCovers(withSource, request)).toBe(true);
    expect(scopeCovers(withScreenshots, withSource)).toBe(false);
    expect(scopeCovers(withSource, withScreenshots)).toBe(false);
  });

  it('scopeEquals requires mutual coverage', () => {
    const a = normalizeCaptureScope(fullScopeInput());
    const b = normalizeCaptureScope(fullScopeInput());
    expect(scopeEquals(a, b)).toBe(true);
  });
});
