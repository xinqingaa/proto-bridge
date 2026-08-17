import { describe, expect, it } from 'vitest';
import {
  PbId,
  PbKey,
  ScopeKey,
  SemanticRole,
  ScreenId,
  TOKEN_BINDING_LITERALS,
} from '../../src/v2/index.js';

describe('V2 stable id rules', () => {
  it('accepts lowercase, readable, dot/hyphen-separated identifiers', () => {
    expect(ScreenId.safeParse('sample.dashboard').success).toBe(true);
    expect(ScreenId.safeParse('sample.task-list').success).toBe(true);
    expect(PbId.safeParse('sample.task-list.list.row').success).toBe(true);
    expect(PbKey.safeParse('t1').success).toBe(true);
  });

  it('rejects CSS selectors, DOM paths, whitespace and uppercase', () => {
    expect(PbId.safeParse('.task-row:nth-child(2) > span').success).toBe(false);
    expect(PbId.safeParse('#task-row').success).toBe(false);
    expect(PbId.safeParse('div[data-id="1"]').success).toBe(false);
    expect(PbId.safeParse('Task-Row').success).toBe(false);
    expect(PbId.safeParse('task row').success).toBe(false);
    expect(PbId.safeParse('').success).toBe(false);
  });

  it('rejects pure numeric pbKey values that look like array indices', () => {
    expect(PbKey.safeParse('0').success).toBe(false);
    expect(PbKey.safeParse('1').success).toBe(false);
    expect(PbKey.safeParse('3').error?.issues[0]?.message).toContain(
      'stable lowercase identifier',
    );
  });

  it('only accepts scopeKey values shaped like computeScopeKey output', () => {
    expect(ScopeKey.safeParse('scope_0123456789ab').success).toBe(true);
    expect(ScopeKey.safeParse('anything-i-typed-by-hand').success).toBe(false);
  });
});

describe('V2 semantic role vocabulary', () => {
  it('accepts every word in the closed list', () => {
    expect(SemanticRole.safeParse('app-bar').success).toBe(true);
    expect(SemanticRole.safeParse('scroll-list').success).toBe(true);
    expect(SemanticRole.safeParse('unknown').success).toBe(true);
  });

  it('rejects free-form strings not in the closed list', () => {
    expect(SemanticRole.safeParse('super-fancy-widget').success).toBe(false);
    expect(SemanticRole.safeParse('Button').success).toBe(false);
  });
});

describe('V2 token binding literals', () => {
  it('keeps cross-stack literals separate from catalog Token IDs', () => {
    expect(TOKEN_BINDING_LITERALS).toEqual(['transparent', 'none']);
  });
});
