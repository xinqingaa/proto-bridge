import { z } from 'zod';
import { SemanticRole } from '../contracts/vocabulary.js';
import { CatalogEntry, CatalogKind } from '../contracts/catalog.js';
import { AuthoringDiagnostic } from '../contracts/authoring-diagnostic.js';

/**
 * Browser-safe V2 Runtime Capture Protocol.
 *
 * Keep this module free of Node imports. PBWork loads it in the browser,
 * while Core/Playwright uses the same executable schemas at the producer
 * boundary.
 */
export const RUNTIME_CAPTURE_PROTOCOL_VERSION = 2 as const;
export const RUNTIME_CAPTURE_GLOBAL = '__PROTO_BRIDGE_CAPTURE_V2__' as const;

const StableId = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
const TokenBindingSlot = z
  .string()
  .regex(/^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/);

export const RuntimeFragmentIdentity = z
  .object({
    screenId: StableId,
    pbId: StableId,
    pbKey: StableId.optional(),
  })
  .strict();
export type RuntimeFragmentIdentity = z.infer<typeof RuntimeFragmentIdentity>;

export const RuntimeVariantManifest = z
  .object({
    variantId: StableId,
    label: z.string().min(1),
    fixtureId: StableId.optional(),
    /**
     * Authored completeness boundary for a full instrumented capture.
     * Missing means that Runtime can expose observed markers, but cannot
     * prove that the semantic set is complete.
     */
    requiredFragments: z.array(RuntimeFragmentIdentity).optional(),
  })
  .strict();
export type RuntimeVariantManifest = z.infer<typeof RuntimeVariantManifest>;

export const RuntimeActionManifest = z
  .object({
    actionId: StableId,
    kind: z.literal('click'),
    target: RuntimeFragmentIdentity,
  })
  .strict();
export type RuntimeActionManifest = z.infer<typeof RuntimeActionManifest>;

export const RuntimeCheckpointManifest = z
  .object({
    checkpointId: StableId,
    screenId: StableId,
    variantId: StableId,
    requiredFragments: z.array(RuntimeFragmentIdentity),
    expectedStates: z
      .array(
        z
          .object({
            fragment: RuntimeFragmentIdentity,
            key: StableId,
            value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
          })
          .strict(),
      )
      .optional(),
    expectedFragmentKeys: z
      .array(
        z
          .object({
            fragment: RuntimeFragmentIdentity.omit({ pbKey: true }),
            keys: z.array(StableId),
          })
          .strict(),
      )
      .optional(),
    forbiddenFragments: z.array(RuntimeFragmentIdentity).optional(),
  })
  .strict();
export type RuntimeCheckpointManifest = z.infer<
  typeof RuntimeCheckpointManifest
>;

export const RuntimeScenarioManifest = z
  .object({
    scenarioId: StableId,
    label: z.string().min(1),
    ownerScreenId: StableId,
    initialVariantId: StableId,
    actionIds: z.array(StableId).min(1),
    checkpoints: z.array(RuntimeCheckpointManifest).min(1),
  })
  .strict();
export type RuntimeScenarioManifest = z.infer<typeof RuntimeScenarioManifest>;

export const RuntimeScreenManifest = z
  .object({
    prototypeId: StableId,
    screenId: StableId,
    screenSlug: StableId,
    path: z.string().startsWith('/prototype/'),
    sourcePath: z.string().min(1).optional(),
    defaultVariantId: StableId,
    variants: z.array(RuntimeVariantManifest).min(1),
    actions: z.array(RuntimeActionManifest),
    scenarios: z.array(RuntimeScenarioManifest),
    requiredScenarioIds: z.array(StableId).optional(),
    /** New Screens are strict; omitted only by pre-convergence producers. */
    evidencePolicy: z.enum(['strict', 'legacy']).optional(),
  })
  .strict();
export type RuntimeScreenManifest = z.infer<typeof RuntimeScreenManifest>;

export const RuntimeCatalogInput = z
  .object({
    kind: CatalogKind,
    inputDigest: z.string().min(1),
    entries: z.array(CatalogEntry),
  })
  .strict();
export type RuntimeCatalogInput = z.infer<typeof RuntimeCatalogInput>;

export const RuntimeCaptureManifest = z
  .object({
    protocolVersion: z.literal(RUNTIME_CAPTURE_PROTOCOL_VERSION),
    inputVersion: z.string().min(1),
    capabilities: z
      .array(
        z.enum([
          'describe',
          'prepare',
          'readiness',
          'semantic-snapshot',
          'reset',
          'scenario',
        ]),
      )
      .min(5),
    screens: z.array(RuntimeScreenManifest).min(1),
    /** Immutable producer inputs from which Capture creates Catalog revisions. */
    catalogs: z.array(RuntimeCatalogInput).default([]),
    /** Producer diagnostics consumed unchanged by PBWork and CLI Preflight. */
    authoringDiagnostics: z.array(AuthoringDiagnostic).default([]),
  })
  .strict();
export type RuntimeCaptureManifest = z.infer<typeof RuntimeCaptureManifest>;

export const RuntimeActualDimensions = z
  .object({
    prototypeId: StableId,
    screenId: StableId,
    variantId: StableId,
    themeId: StableId,
    fixtureId: StableId.optional(),
    viewport: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        deviceScaleFactor: z.number().positive(),
      })
      .strict(),
  })
  .strict();
export type RuntimeActualDimensions = z.infer<typeof RuntimeActualDimensions>;

export const RuntimeSemanticNode = z
  .object({
    fragment: RuntimeFragmentIdentity,
    role: SemanticRole,
    tag: z.string().min(1),
    text: z.string(),
    visible: z.boolean(),
    bbox: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number().min(0),
        height: z.number().min(0),
      })
      .strict(),
    /** Design-system component id when the node is a registered PBWork component. */
    componentId: StableId.optional(),
    /** Selected authored props that affect Evidence (tone, selectionStyle, …). */
    props: z.record(z.string(), z.unknown()).optional(),
    /** Live token slot → token id bindings from the component or data-pb-token-* attrs. */
    tokenBindings: z.record(z.string(), z.string().min(1)).optional(),
    /** Authored binding candidates with their real producer provenance. */
    tokenBindingEvidence: z
      .array(
        z
          .object({
            slot: TokenBindingSlot,
            tokenId: StableId,
            source: z.enum([
              'component-contract',
              'runtime-registration',
              'data-pb',
            ]),
          })
          .strict(),
      )
      .optional(),
    tokenBindingConflicts: z
      .array(
        z
          .object({
            slot: TokenBindingSlot,
            candidates: z.array(StableId).min(2),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export type RuntimeSemanticNode = z.infer<typeof RuntimeSemanticNode>;

const DescribeRequest = z.object({ kind: z.literal('describe') }).strict();
const PrepareRequest = z
  .object({
    kind: z.literal('prepare'),
    expected: z
      .object({
        prototypeId: StableId,
        screenId: StableId,
        variantId: StableId,
        themeId: StableId,
        fixtureId: StableId.optional(),
      })
      .strict(),
  })
  .strict();
const ReadinessRequest = z
  .object({
    kind: z.literal('readiness'),
    expected: RuntimeActualDimensions.omit({ viewport: true }).extend({
      viewport: RuntimeActualDimensions.shape.viewport.pick({
        width: true,
        height: true,
      }),
    }),
    requiredFragments: z.array(RuntimeFragmentIdentity).default([]),
  })
  .strict();
const SemanticSnapshotRequest = z
  .object({
    kind: z.literal('semantic-snapshot'),
    fragments: z.array(RuntimeFragmentIdentity).default([]),
  })
  .strict();
const ResetRequest = z.object({ kind: z.literal('reset') }).strict();
const ExecuteActionRequest = z
  .object({
    kind: z.literal('execute-action'),
    scenarioId: StableId,
    actionId: StableId,
  })
  .strict();
const VerifyCheckpointRequest = z
  .object({
    kind: z.literal('verify-checkpoint'),
    scenarioId: StableId,
    checkpointId: StableId,
  })
  .strict();

export const RuntimeCaptureRequestPayload = z.discriminatedUnion('kind', [
  DescribeRequest,
  PrepareRequest,
  ReadinessRequest,
  SemanticSnapshotRequest,
  ResetRequest,
  ExecuteActionRequest,
  VerifyCheckpointRequest,
]);
export type RuntimeCaptureRequestPayload = z.infer<
  typeof RuntimeCaptureRequestPayload
>;

export const RuntimeCaptureRequest = z
  .object({
    protocolVersion: z.literal(RUNTIME_CAPTURE_PROTOCOL_VERSION),
    requestId: StableId,
    payload: RuntimeCaptureRequestPayload,
  })
  .strict();
export type RuntimeCaptureRequest = z.infer<typeof RuntimeCaptureRequest>;

const successEnvelope = <T extends z.ZodTypeAny>(kind: string, payload: T) =>
  z
    .object({
      protocolVersion: z.literal(RUNTIME_CAPTURE_PROTOCOL_VERSION),
      requestId: StableId,
      kind: z.literal(kind),
      ok: z.literal(true),
      payload,
    })
    .strict();

export const RuntimeDescribeSuccess = successEnvelope(
  'describe',
  z.object({ manifest: RuntimeCaptureManifest }).strict(),
);
export const RuntimePrepareSuccess = successEnvelope(
  'prepare',
  z.object({ actual: RuntimeActualDimensions }).strict(),
);
export const RuntimeReadinessSuccess = successEnvelope(
  'readiness',
  z
    .object({
      actual: RuntimeActualDimensions,
      stable: z.literal(true),
      checks: z.array(z.string().min(1)).min(1),
    })
    .strict(),
);
export const RuntimeSemanticSnapshotSuccess = successEnvelope(
  'semantic-snapshot',
  z
    .object({
      actual: RuntimeActualDimensions,
      nodes: z.array(RuntimeSemanticNode),
    })
    .strict(),
);
export const RuntimeResetSuccess = successEnvelope(
  'reset',
  z.object({ actual: RuntimeActualDimensions }).strict(),
);
export const RuntimeExecuteActionSuccess = successEnvelope(
  'execute-action',
  z.object({ actionId: StableId, actual: RuntimeActualDimensions }).strict(),
);
export const RuntimeVerifyCheckpointSuccess = successEnvelope(
  'verify-checkpoint',
  z
    .object({ checkpointId: StableId, actual: RuntimeActualDimensions })
    .strict(),
);

export const RUNTIME_CAPTURE_ERROR_CODES = [
  'protocol-mismatch',
  'invalid-request',
  'dimension-mismatch',
  'unknown-action',
  'unknown-scenario',
  'unknown-checkpoint',
  'fragment-not-found',
  'duplicate-fragment-identity',
  'invalid-semantic-marker',
  'invalid-fragment-role',
  'invalid-business-identity',
  'fragment-not-visible',
  'fragment-occluded',
  'runtime-not-ready',
  'command-failed',
] as const;

export const RuntimeCaptureFailure = z
  .object({
    protocolVersion: z.literal(RUNTIME_CAPTURE_PROTOCOL_VERSION),
    requestId: StableId,
    kind: z.string().min(1),
    ok: z.literal(false),
    error: z
      .object({
        code: z.enum(RUNTIME_CAPTURE_ERROR_CODES),
        message: z.string().min(1),
        details: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();
export type RuntimeCaptureFailure = z.infer<typeof RuntimeCaptureFailure>;

export const RuntimeCaptureSuccess = z.discriminatedUnion('kind', [
  RuntimeDescribeSuccess,
  RuntimePrepareSuccess,
  RuntimeReadinessSuccess,
  RuntimeSemanticSnapshotSuccess,
  RuntimeResetSuccess,
  RuntimeExecuteActionSuccess,
  RuntimeVerifyCheckpointSuccess,
]);
export type RuntimeCaptureSuccess = z.infer<typeof RuntimeCaptureSuccess>;

export const RuntimeCaptureResponse = z.union([
  RuntimeCaptureSuccess,
  RuntimeCaptureFailure,
]);
export type RuntimeCaptureResponse = z.infer<typeof RuntimeCaptureResponse>;

export type RuntimeCaptureApi = {
  readonly protocolVersion: typeof RUNTIME_CAPTURE_PROTOCOL_VERSION;
  request(request: unknown): Promise<unknown>;
};
