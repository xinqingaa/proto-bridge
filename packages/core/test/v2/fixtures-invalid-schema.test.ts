import { describe, expect, it } from 'vitest';
import { AgentHandoff, CaseEvidenceRevision, CaseKey, FragmentRef, Candidate, Workspace, fixtures } from '../../src/v2/index.js';
import type { InvalidSchemaFixture } from '../../src/v2/fixtures/reference-case-slice/invalid-schema.js';

const SCHEMAS = { Workspace, CaseKey, CaseEvidenceRevision, AgentHandoff, FragmentRef, Candidate };

describe('sample.task-list invalid fixtures each fail schema validation', () => {
  const f = fixtures.referenceCaseSlice;

  it.each(f.INVALID_SCHEMA_FIXTURES)('$name', (fixture: InvalidSchemaFixture) => {
    const schema = SCHEMAS[fixture.schemaName];
    const result = schema.safeParse(fixture.input);
    expect(result.success).toBe(false);
  });

  it('the corresponding valid objects still parse, proving the invalid fixtures fail for the intended reason', () => {
    expect(CaseKey.safeParse(f.BASE_CASE).success).toBe(true);
    expect(CaseEvidenceRevision.safeParse(f.PRIMARY_ACTIVE_REVISION).success).toBe(true);
    expect(AgentHandoff.safeParse(f.HANDOFF).success).toBe(true);
  });
});
