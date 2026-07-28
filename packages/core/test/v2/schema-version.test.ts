import { describe, expect, it } from 'vitest';
import { assertSupportedSchemaVersion, UnsupportedSchemaVersionError, V2_SCHEMA_MAJOR } from '../../src/v2/index.js';

describe('assertSupportedSchemaVersion', () => {
  it('accepts the current major version', () => {
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', V2_SCHEMA_MAJOR)).not.toThrow();
  });

  it('rejects any other major instead of guessing field semantics', () => {
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', 99)).toThrow(UnsupportedSchemaVersionError);
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', undefined)).toThrow(UnsupportedSchemaVersionError);
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', '1')).toThrow(UnsupportedSchemaVersionError);
  });
});
