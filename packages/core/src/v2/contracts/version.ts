/**
 * Every persisted V2 object must declare the schema major version it was
 * written with (pb-v2-spec.md "规范与可执行 Schema"). Readers must reject
 * unknown majors instead of guessing field semantics; the same major may
 * gain ignorable fields without changing existing field meaning.
 */
export const V2_SCHEMA_MAJOR = 1 as const;

export type SchemaVersion = typeof V2_SCHEMA_MAJOR;

export class UnsupportedSchemaVersionError extends Error {
  readonly objectKind: string;
  readonly foundVersion: unknown;
  readonly supportedMajor: number;

  constructor(objectKind: string, foundVersion: unknown) {
    super(
      `Unsupported schema version for ${objectKind}: found ${JSON.stringify(foundVersion)}, ` +
        `this reader only supports major version ${V2_SCHEMA_MAJOR}.`,
    );
    this.name = 'UnsupportedSchemaVersionError';
    this.objectKind = objectKind;
    this.foundVersion = foundVersion;
    this.supportedMajor = V2_SCHEMA_MAJOR;
  }
}

/**
 * Readers must call this before interpreting any field of a persisted V2
 * object. It never "best effort" upgrades or downgrades a payload.
 */
export function assertSupportedSchemaVersion(objectKind: string, version: unknown): asserts version is SchemaVersion {
  if (version !== V2_SCHEMA_MAJOR) {
    throw new UnsupportedSchemaVersionError(objectKind, version);
  }
}
