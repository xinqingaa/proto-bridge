import { describe, expect, it } from 'vitest';
import {
  AgentHandoff,
  assertSupportedSchemaVersion,
  BlobRecord,
  Bundle,
  BundleSnapshot,
  CatalogRevision,
  CaptureJob,
  CaseAttempt,
  CaseEvidenceRevision,
  fixtures,
  Issue,
  Run,
  StalenessReport,
  UnsupportedSchemaVersionError,
  V2_SCHEMA_MAJOR,
  Workspace,
} from '../../src/v2/index.js';

const f = fixtures.referenceCaseSlice;

describe('assertSupportedSchemaVersion', () => {
  it('accepts the current major version', () => {
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', V2_SCHEMA_MAJOR)).not.toThrow();
  });

  it('rejects any other major instead of guessing field semantics', () => {
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', 99)).toThrow(UnsupportedSchemaVersionError);
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', undefined)).toThrow(UnsupportedSchemaVersionError);
    expect(() => assertSupportedSchemaVersion('CaseEvidenceRevision', '1')).toThrow(UnsupportedSchemaVersionError);
  });

  it.each([
    ['Workspace', Workspace, f.WORKSPACE],
    ['Bundle', Bundle, f.BUNDLE],
    ['CaseEvidenceRevision', CaseEvidenceRevision, f.PRIMARY_ACTIVE_REVISION],
    ['CaseAttempt', CaseAttempt, f.PRIMARY_CAPTURE_ATTEMPT],
    ['Run', Run, f.RUN_1],
    ['BundleSnapshot', BundleSnapshot, f.SNAPSHOT],
    [
      'CatalogRevision',
      CatalogRevision,
      {
        schemaVersion: V2_SCHEMA_MAJOR,
        catalogRevisionId: 'catalog-schema-version',
        workspaceId: f.WORKSPACE_ID,
        bundleId: f.BUNDLE_ID,
        prototypeId: f.PROTOTYPE_ID,
        kind: 'screen',
        inputDigest: 'catalog-input-v1',
        createdAt: f.T0,
        entries: [],
      },
    ],
    [
      'BlobRecord',
      BlobRecord,
      {
        schemaVersion: V2_SCHEMA_MAJOR,
        blobId: 'blob-schema-version',
        workspaceId: f.WORKSPACE_ID,
        bundleId: f.BUNDLE_ID,
        kind: 'debug',
        mediaType: 'text/plain',
        byteLength: 1,
        digest: `sha256:${'0'.repeat(64)}`,
        createdAt: f.T0,
        ownerRefs: [{ kind: 'revision', objectId: f.PRIMARY_REVISION_ID }],
      },
    ],
    ['StalenessReport', StalenessReport, f.STALENESS_REPORT],
    ['Issue', Issue, f.UNKNOWN_ISSUE],
    ['AgentHandoff', AgentHandoff, f.HANDOFF],
    [
      'CaptureJob',
      CaptureJob,
      {
        schemaVersion: V2_SCHEMA_MAJOR,
        jobId: 'job-schema-version',
        workspaceId: f.WORKSPACE_ID,
        bundleId: f.BUNDLE_ID,
        selection: f.RUN_1.selection,
        inputVersion: f.RUN_1.inputVersion,
        status: 'queued',
        acceptedAt: f.T0,
        journal: [],
      },
    ],
  ] as const)('%s rejects an unsupported persisted-object major', (_kind, schema, fixture) => {
    expect(schema.safeParse({ ...fixture, schemaVersion: 99 }).success).toBe(false);
  });
});
