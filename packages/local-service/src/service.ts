import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join as pathJoin, relative as pathRelative, resolve as pathResolve, sep as pathSep } from 'node:path';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  BlobId,
  BundleId,
  HandoffId,
  JobId,
  RiskKind,
  SnapshotId,
  StalenessReportId,
  V2ContractError,
  LifecycleOperationKey,
  OperationRequestDigest,
  PrototypeLifecycleDocument,
  FinalizationFailedCase,
  incompleteCaseCount,
  PrototypeLifecycleRecord,
  type PrototypeLifecycleOperation,
  buildHandoffIndex,
  buildEvidenceInventory,
  computeScopeKey,
  type BundleSnapshot,
  type SelectedCase,
} from '@proto-bridge/core/v2';
import {
  CaptureJobHost,
  PlaywrightCaseCaptureDriver,
  SelectionDraft,
  createAgentHandoff,
  evaluateAgentHandoff,
  preflightInstrumentedRuntime,
  selectionDraftFromSelectedCases,
  type CapturePreflight,
  type CaseCaptureDriver,
} from '@proto-bridge/core/v2/capture';
import {
  LocalFileStore,
  assertDeliveryTargetRootMatch,
  deliveryRootFromStoreRoot,
  generateOperationalId,
  createWorkspaceResetPlan,
  reviewsRootFromStoreRoot,
  validateWorkspaceResetPlan,
  writeDeliveryReceipt,
  buildAcceptanceContractFromStore,
  type V2Store,
} from '@proto-bridge/core/v2/store';
import {
  selectReviewProfileForConsumer,
  type ReviewProviderFailure,
  type ReviewProviderSessionReceipt,
  type ReviewSession,
  type ReviewSessionSeed,
} from '@proto-bridge/core/review';
import {
  detectTargetAdapter,
  readTargetIdentity,
} from '@proto-bridge/core/target';
import {
  LOCAL_SERVICE_PROTOCOL_VERSION,
  type BundleEvidenceDetails,
  type CaptureConsoleState,
  type CaptureResultHandoffFact,
  type CaptureResultReceiptFact,
  type CaptureSnapshotReadFailure,
  type EvidenceInventory,
  type BundleDeletePlan,
  type CreateDeliveryRequest,
  type DeliveryDetail,
  type DeliveryListItem,
  type CreateJobRequest,
  type CreatePreflightRequest,
  type HandoffPreviewRequest,
  type LocalServiceSession,
  type StoredPreflight,
  type WorkspaceResetApplyRequest,
  type WorkspaceResetPreviewRequest,
  type WorkspaceResetResult,
  type UpdatePrototypeLifecycleRequest,
  type MigratePrototypeLifecycleRequest,
  type StartTargetReviewRequest,
  type RecordScreenshotViewedRequest,
  type RunTargetRenderRequest,
  type RunScenarioReplayRequest,
  type RecordArtifactCompareRequest,
  type RecordReviewFindingsRequest,
  type RecordReviewAssessmentsRequest,
  type RecordTargetClaimsVerifiedRequest,
  type CreateReviewApprovalRequest,
  type ConsumeReviewApprovalRequest,
} from '@proto-bridge/core/v2/service-contract';
import { ReviewRepository } from './review-repository.js';
import { FlutterMcpProvider } from './flutter-mcp-provider.js';
import { FlutterReviewRuntime, runtimeErrorsDetected } from './flutter-review-runtime.js';
import { FlutterMcpProviderError } from './flutter-mcp-provider.js';

const BODY_LIMIT_BYTES = 1024 * 1024;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type PreflightRecord = StoredPreflight & {
  draft: SelectionDraft;
};

type SessionRecord = {
  expiresAt: number;
  generationId: string | 'legacy-unavailable';
};

type ReviewApprovalRecord = CreateReviewApprovalRequest & { expiresAt: number };

export type LocalServiceOptions = {
  host?: '127.0.0.1' | '::1';
  port?: number;
  allowedOrigins: string[];
  runtimeBaseUrl: string;
  storeRoot: string;
  workspaceId: string;
  deliveryTargetRoot: string;
  maxCases?: number;
  preflightTtlMs?: number;
  maxStoreBytes?: number;
  preflightProvider?: (
    draft: SelectionDraft,
  ) => Promise<{ preflight: CapturePreflight }>;
  driverFactory?: () => CaseCaptureDriver;
  flutterMcpProviderFactory?: () => FlutterMcpProvider;
};

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function success(response: ServerResponse, data: unknown, status = 200): void {
  json(response, status, { ok: true, data });
}

function failure(
  response: ServerResponse,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  json(response, status, {
    ok: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  });
}

function errorStatus(code: string): number {
  if (code === 'internal-error') return 500;
  if (code === 'unauthorized') return 401;
  if (code === 'unknown-reference') return 404;
  if (code === 'preflight-expired') return 409;
  if (code === 'writer-lock-held') return 409;
  if (code === 'revision-conflict' || code === 'idempotency-conflict') return 409;
  if ([
    'workspace-resetting',
    'workspace-generation-mismatch',
    'reset-plan-expired',
    'reset-plan-drift',
    'external-store-destroyed',
    'writer-lock-lost',
  ].includes(code)) return 409;
  if (code === 'capacity-exceeded') return 413;
  return 400;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > BODY_LIMIT_BYTES) {
      throw new V2ContractError(
        'unsafe-input',
        `Request payload exceeds ${BODY_LIMIT_BYTES} bytes.`,
      );
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new V2ContractError(
      'invalid-schema',
      'Request body must be valid JSON.',
    );
  }
}

function decodeArtifactBytes(value: string): Uint8Array {
  if (typeof value !== 'string' || value.length === 0) {
    throw new V2ContractError('invalid-schema', 'Review artifact bytesBase64 is required.');
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.byteLength === 0 || bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) {
    throw new V2ContractError('invalid-schema', 'Review artifact bytesBase64 is not canonical base64.');
  }
  return bytes;
}

function consumeReviewApproval(
  approvals: Map<string, ReviewApprovalRecord>,
  token: string,
  kind: ReviewApprovalRecord['kind'],
  reviewRunId: string,
): ReviewApprovalRecord {
  const approval = approvals.get(token);
  approvals.delete(token);
  if (!approval || approval.expiresAt <= Date.now() || approval.kind !== kind || approval.reviewRunId !== reviewRunId) {
    throw new V2ContractError('unauthorized', `A live one-time ${kind} approval issued outside the ordinary MCP tool parameters is required.`);
  }
  return approval;
}

function matrixIdentity(preflight: CapturePreflight): string {
  return JSON.stringify(
    preflight.matrix.map((entry) => ({
      caseId: entry.selectedCase.caseId,
      captureScope: entry.selectedCase.captureScope,
    })),
  );
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function operationRequestDigest(value: unknown): OperationRequestDigest {
  return `sha256:${createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function reviewSeedSelection(seed: ReviewSessionSeed): object {
  return {
    targetContentDigest: seed.targetContentDigest,
    selectedCaseIds: seed.selectedCaseIds,
    requiredSourceDigests: seed.requiredSourceDigests,
    requiredScenarioCaseIds: seed.requiredScenarioCaseIds,
    obligationContractVersion: seed.obligationContractVersion,
    requiredObligations: seed.requiredObligations,
    verificationContractVersion: seed.verificationContractVersion,
    reviewProfile: seed.reviewProfile,
    runtimeProvider: seed.runtimeProvider,
  };
}

async function selectedCasesForSnapshot(
  store: V2Store,
  bundleId: BundleId,
  snapshot: BundleSnapshot,
): Promise<SelectedCase[]> {
  const activeKeys = new Set(
    snapshot.activeSlots.map((slot) => `${slot.caseId}/${slot.scopeKey}`),
  );
  const cases = [
    ...new Map(
      (await store.listRuns(bundleId))
        .flatMap((run) => run.selection.cases)
        .filter((selected) =>
          activeKeys.has(
            `${selected.caseId}/${computeScopeKey(selected.captureScope)}`,
          ),
        )
        .map(
          (selected) =>
            [
              `${selected.caseId}/${computeScopeKey(selected.captureScope)}`,
              selected,
            ] as const,
        ),
    ).values(),
  ];
  if (cases.length !== activeKeys.size) {
    throw new V2ContractError(
      'unknown-reference',
      'Active Snapshot Case/Scope cannot be reconstructed from its immutable Runs.',
    );
  }
  return cases;
}

export class ProtoBridgeLocalService {
  readonly serviceInstanceId = generateOperationalId('service');
  readonly store: LocalFileStore;
  readonly reviews: ReviewRepository;
  private readonly options: Required<
    Pick<LocalServiceOptions, 'host' | 'port' | 'preflightTtlMs'>
  > &
    LocalServiceOptions;
  private readonly allowedOrigins: Set<string>;
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly preflights = new Map<string, PreflightRecord>();
  private readonly reviewApprovals = new Map<string, ReviewApprovalRecord>();
  private readonly operationLocks = new Map<string, Promise<void>>();
  private readonly jobHost = new CaptureJobHost();
  private server: Server | undefined;
  private lifecycleReconciliationTimer: ReturnType<typeof setInterval> | undefined;
  private lifecycleReconciliationInFlight: Promise<void> | undefined;
  private finalizedOrphanJobIds: string[] = [];
  private workspaceResetting = false;
  private currentGenerationId: string | 'legacy-unavailable' = 'legacy-unavailable';
  private externalStoreDestroyed = false;
  private flutterMcpProvider: FlutterMcpProvider | undefined;

  constructor(options: LocalServiceOptions) {
    this.options = {
      ...options,
      host: options.host ?? '127.0.0.1',
      port: options.port ?? 3988,
      preflightTtlMs: options.preflightTtlMs ?? 5 * 60 * 1000,
    };
    this.allowedOrigins = new Set(
      options.allowedOrigins.map((origin) => new URL(origin).origin),
    );
    if (!options.deliveryTargetRoot?.trim()) {
      throw new V2ContractError(
        'invalid-schema',
        'Local Service requires deliveryTargetRoot from Workspace delivery.targetRoot.',
      );
    }
    const runtimeOrigin = new URL(options.runtimeBaseUrl);
    if (
      !['127.0.0.1', 'localhost', '::1'].includes(runtimeOrigin.hostname) ||
      !['http:', 'https:'].includes(runtimeOrigin.protocol)
    ) {
      throw new V2ContractError(
        'unsafe-input',
        'Local Service Runtime origin must resolve to the local machine.',
      );
    }
    this.store = new LocalFileStore({
      root: options.storeRoot,
      workspaceId: options.workspaceId,
      ...(options.maxStoreBytes === undefined
        ? {}
        : { maxBytes: options.maxStoreBytes }),
    });
    this.reviews = new ReviewRepository(
      reviewsRootFromStoreRoot(options.storeRoot, options.workspaceId),
      options.workspaceId,
      () => this.currentGenerationId,
    );
  }

  async start(): Promise<{ host: string; port: number }> {
    if (this.server) throw new Error('Local Service is already started.');
    const initialized = await this.store.init();
    this.finalizedOrphanJobIds = initialized.finalizedOrphanJobs;
    this.currentGenerationId = initialized.lifecycle.generationId;
    await this.cleanupIncompleteDeliveries();
    await this.reconcilePrototypeLifecycle().catch((error: unknown) => {
      console.error('Prototype lifecycle reconciliation failed during Service startup.', error);
    });
    this.lifecycleReconciliationTimer = setInterval(
      () => void this.reconcilePrototypeLifecycle().catch((error: unknown) => {
        console.error('Prototype lifecycle reconciliation failed.', error);
      }),
      1000,
    );
    this.server = createServer((request, response) => {
      void this.handle(request, response).catch((error: unknown) => {
        const schemaError =
          error instanceof Error && error.name === 'ZodError';
        const code =
          error instanceof V2ContractError
            ? error.code
            : schemaError
              ? 'invalid-schema'
              : 'internal-error';
        const message =
          error instanceof Error
            ? error.message
            : 'Unexpected Local Service error.';
        const details =
          error instanceof V2ContractError ? error.details : undefined;
        failure(response, errorStatus(code), code, message, details);
      });
    });
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(this.options.port, this.options.host, () =>
        resolve(),
      );
    });
    const address = this.server.address() as AddressInfo;
    return { host: this.options.host, port: address.port };
  }

  async close(): Promise<void> {
    if (this.lifecycleReconciliationTimer) {
      clearInterval(this.lifecycleReconciliationTimer);
      this.lifecycleReconciliationTimer = undefined;
    }
    const server = this.server;
    this.server = undefined;
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await this.flutterMcpProvider?.close();
    this.flutterMcpProvider = undefined;
    await this.reviews.close();
    await this.store.close();
  }

  getFlutterMcpProvider(): FlutterMcpProvider {
    this.flutterMcpProvider ??= this.options.flutterMcpProviderFactory?.() ?? new FlutterMcpProvider();
    return this.flutterMcpProvider;
  }

  private async appendRuntimeProgress(
    reviewRunId: string,
    session: ReviewSession,
    providerSession: ReviewProviderSessionReceipt,
    failures: ReviewProviderFailure[],
  ): Promise<void> {
    for (const failure of failures) {
      await this.reviews.append({ reviewRunId, actor: 'runner', tool: providerSession.providerId, payload: { kind: 'provider-call-failed', failure } });
    }
    if (
      session.providerSession?.sessionIdentityDigest === providerSession.sessionIdentityDigest
      && JSON.stringify(session.providerSession.application) === JSON.stringify(providerSession.application)
    ) return;
    if (session.providerSession) {
      await this.reviews.append({
        reviewRunId,
        actor: 'runner',
        tool: providerSession.providerId,
        payload: { kind: 'runtime-provider-session-invalidated', reason: 'provider-session-changed' },
      });
    }
    await this.reviews.append({
      reviewRunId,
      actor: 'runner',
      tool: providerSession.providerId,
      payload: { kind: 'runtime-provider-connected', receipt: providerSession },
    });
  }

  private async recordProviderError(reviewRunId: string, error: unknown): Promise<ReviewSession> {
    const providerError = error instanceof FlutterMcpProviderError
      ? error
      : new FlutterMcpProviderError('runtime-provider-failed', error instanceof Error ? error.message : String(error), false);
    const providerId = this.getFlutterMcpProvider().currentHandshake()?.providerId ?? 'dart-flutter-mcp';
    const failures = providerError.failures.length > 0 ? providerError.failures : [this.syntheticRuntimeFailure(providerError.code, providerError.message)];
    for (const failure of failures) {
      await this.reviews.append({ reviewRunId, actor: 'runner', tool: providerId, payload: { kind: 'provider-call-failed', failure } });
    }
    const runtimeStatus = providerError.code === 'side-effect-outcome-unknown'
      ? 'needs-human' as const
      : /(?:not-found|ambiguous|capability-missing|process|transport|timeout)/.test(providerError.code)
        ? 'unavailable' as const
        : 'unverified' as const;
    return this.reviews.append({
      reviewRunId,
      actor: 'runner',
      tool: providerId,
      payload: { kind: 'runtime-provider-terminated', runtimeStatus, reason: providerError.code },
    });
  }

  private async recordRuntimeTerminal(
    reviewRunId: string,
    providerId: string,
    runtimeStatus: 'unavailable' | 'unverified' | 'needs-human',
    reason: string,
  ): Promise<ReviewSession> {
    const failure = this.syntheticRuntimeFailure(reason, reason);
    await this.reviews.append({ reviewRunId, actor: 'runner', tool: providerId, payload: { kind: 'provider-call-failed', failure } });
    return this.reviews.append({ reviewRunId, actor: 'runner', tool: providerId, payload: { kind: 'runtime-provider-terminated', runtimeStatus, reason } });
  }

  private syntheticRuntimeFailure(code: string, detail: string): ReviewProviderFailure {
    const at = new Date().toISOString();
    return {
      operationId: `flutter-mcp-terminal-${randomUUID()}`,
      operation: 'inspect',
      attemptOrdinal: 1,
      errorCode: code,
      retryable: false,
      startedAt: at,
      finishedAt: at,
      detailDigest: `sha256:${createHash('sha256').update(detail).digest('hex')}`,
    };
  }

  private assertOrigin(request: IncomingMessage): void {
    const origin = request.headers.origin;
    // Browsers commonly omit Origin for same-origin GET requests. Those
    // requests still require the unguessable Authorization session below;
    // every state-changing request and session creation requires an explicit
    // configured Origin.
    if (!origin && request.method === 'GET') return;
    if (!origin || !this.allowedOrigins.has(new URL(origin).origin)) {
      throw new V2ContractError(
        'unsafe-input',
        `Browser Origin ${origin ?? '<missing>'} is not allowed by this Local Service.`,
      );
    }
  }

  private async deliveryReceiptFacts(): Promise<CaptureResultReceiptFact[]> {
    const deliveryRoot = deliveryRootFromStoreRoot(this.options.storeRoot);
    let entries: string[] = [];
    try {
      entries = await readdir(deliveryRoot);
    } catch {
      return [];
    }
    const receipts: CaptureResultReceiptFact[] = [];
    for (const entry of entries) {
      if (entry === 'latest.json' || entry.includes('.')) continue;
      try {
        const receiptRaw = await readFile(pathJoin(deliveryRoot, entry, 'receipt.json'), 'utf8');
        const receipt = JSON.parse(receiptRaw) as {
          deliveryId?: string;
          bundleId?: string;
          snapshotId?: string;
          handoffId?: string;
          source?: unknown;
        };
        if (!receipt.deliveryId || !receipt.bundleId || !receipt.snapshotId || !receipt.handoffId) {
          continue;
        }
        receipts.push({
          deliveryId: receipt.deliveryId,
          bundleId: receipt.bundleId,
          snapshotId: receipt.snapshotId,
          handoffId: receipt.handoffId,
          ...(receipt.source === 'cli' || receipt.source === 'gui' ? { source: receipt.source } : {}),
        });
      } catch {
        // Skip corrupt or partial delivery folders. Absence is not a guessed source.
      }
    }
    return receipts;
  }

  private async evidenceDetails(
    bundleId: string,
    snapshot: BundleSnapshot,
  ): Promise<BundleEvidenceDetails> {
    const bundle = await this.store.getBundle(bundleId);
    if (!bundle)
      throw new V2ContractError(
        'unknown-reference',
        'Bundle does not exist.',
      );
    const revisions = await this.store.listEvidenceRevisions(bundleId);
    const activeRevisionIds = new Set(
      snapshot.activeSlots.map((slot) => slot.revisionId),
    );
    return {
      bundle,
      activeSnapshot: snapshot,
      runs: await this.store.listRuns(bundleId),
      activeRevisions: revisions.filter((revision) =>
        activeRevisionIds.has(revision.revisionId),
      ),
      blobs: await this.store.listBlobRecords(bundleId),
      stalenessReports: await this.store.listStalenessReports(bundleId),
      handoffs: await this.store.listHandoffs(bundleId),
    };
  }

  private requireSession(request: IncomingMessage): void {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new V2ContractError(
        'unauthorized',
        'A Local Service session is required.',
      );
    }
    const token = authorization.slice('Bearer '.length);
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      throw new V2ContractError(
        'unauthorized',
        'Local Service session is invalid or expired.',
      );
    }
    if (session.generationId !== this.currentGenerationId) {
      this.sessions.delete(token);
      throw new V2ContractError(
        'workspace-generation-mismatch',
        'Local Service session belongs to an earlier Workspace generation.',
      );
    }
  }

  private async ensureStoreHealthy(): Promise<void> {
    if (this.externalStoreDestroyed) {
      throw new V2ContractError('external-store-destroyed', 'Workspace Store was destroyed or replaced; stop the Service and explicitly reinitialize it.');
    }
    try {
      await this.store.assertHealthy();
    } catch (error) {
      if (error instanceof V2ContractError && ['external-store-destroyed', 'writer-lock-lost'].includes(error.code)) {
        this.externalStoreDestroyed = true;
        this.sessions.clear();
        this.preflights.clear();
        this.reviewApprovals.clear();
        await this.store.close();
      }
      throw error;
    }
  }

  private async withOperationLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.operationLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.operationLocks.set(key, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.operationLocks.get(key) === queued) {
        this.operationLocks.delete(key);
      }
    }
  }

  private async updateFinalizationOperation(
    operationKey: LifecycleOperationKey,
    update: (operation: PrototypeLifecycleOperation) => PrototypeLifecycleOperation,
  ): Promise<void> {
    await this.updateFinalizationRecord(operationKey, (record) => {
      if (record.operation.kind !== 'finalizing') return record;
      return {
        ...record,
        operation: update(record.operation),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private async updateFinalizationRecord(
    operationKey: LifecycleOperationKey,
    update: (record: PrototypeLifecycleRecord) => PrototypeLifecycleRecord,
    historyEntry?: {
      id: string;
      prototypeId: string;
      from: 'active' | 'review' | 'final' | 'archived';
      to: 'active' | 'review' | 'final' | 'archived';
      note: string;
      changedAt: string;
    },
  ): Promise<PrototypeLifecycleRecord | undefined> {
    let result: PrototypeLifecycleRecord | undefined;
    await this.withOperationLock(`lifecycle:${this.store.workspaceId}`, async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const document = await this.store.getPrototypeLifecycleDocument();
        const entry = Object.entries(document.records).find(([, record]) =>
          (record.operation.kind === 'finalizing' || record.operation.kind === 'rolling-back' || record.operation.kind === 'failed') &&
          record.operation.operationKey === operationKey,
        );
        if (!entry) return;
        const [prototypeId, record] = entry;
        const nextRecord = PrototypeLifecycleRecord.parse(update(record));
        const next = PrototypeLifecycleDocument.parse({
          ...document,
          revision: document.revision + 1,
          history: historyEntry
            ? [historyEntry, ...document.history].slice(0, 500)
            : document.history,
          records: {
            ...document.records,
            [prototypeId]: nextRecord,
          },
          updatedAt: new Date().toISOString(),
        });
        try {
          await this.store.compareAndSetPrototypeLifecycleDocument({
            expectedRevision: document.revision,
            document: next,
          });
          result = nextRecord;
          return;
        } catch (error) {
          if (
            !(error instanceof V2ContractError) ||
            error.code !== 'revision-conflict'
          ) {
            throw error;
          }
        }
      }
      throw new V2ContractError(
        'revision-conflict',
        'Could not update the finalization record because it kept changing.',
      );
    });
    return result;
  }

  private async assertClientLifecycleUpdate(
    previous: PrototypeLifecycleDocument,
    next: PrototypeLifecycleDocument,
  ): Promise<void> {
    for (const [prototypeId, oldRecord] of Object.entries(previous.records)) {
      const nextRecord = next.records[prototypeId];
      if (!nextRecord) continue;
      if (nextRecord.stage === 'final' && oldRecord.stage !== 'final') {
        throw new V2ContractError('unsafe-input', 'Only Local Service reconciliation may mark a prototype final.');
      }
      const oldOperation = oldRecord.operation;
      const nextOperation = nextRecord.operation;
      if (oldOperation.kind === 'finalizing' && nextOperation.kind === 'finalizing') {
        for (const field of ['jobId', 'bundleId', 'snapshotId', 'handoffId', 'deliveryId'] as const) {
          if (oldOperation[field] !== nextOperation[field]) {
            throw new V2ContractError('unsafe-input', `PBWork cannot change server-owned finalization reference ${field}.`);
          }
        }
        if (oldOperation.phase !== nextOperation.phase) {
          const userTransitions =
            (oldOperation.phase === 'preflighting' && nextOperation.phase === 'awaiting-confirmation') ||
            (oldOperation.phase === 'awaiting-risks' && nextOperation.phase === 'building-prompt');
          if (!userTransitions) {
            throw new V2ContractError('unsafe-input', 'This finalization phase is owned by Local Service.');
          }
          if (nextOperation.phase === 'building-prompt') {
            const bundleId = oldOperation.bundleId;
            const snapshotId = oldOperation.snapshotId;
            if (!bundleId || !snapshotId) {
              throw new V2ContractError('unknown-reference', '风险确认缺少固定 Bundle/Snapshot 引用。');
            }
            const evaluated = await this.evaluateHandoffForSnapshot(bundleId, snapshotId);
            const acknowledged = new Set(nextOperation.acknowledgedRiskKinds);
            const missing = evaluated.evaluation.risks
              .map((risk) => risk.kind)
              .filter((kind) => !acknowledged.has(kind));
            if (missing.length) {
              throw new V2ContractError('invalid-schema', `仍需逐项确认风险：${[...new Set(missing)].join('、')}。`);
            }
          }
        }
      }
      if (oldRecord.stage === 'final' && nextRecord.stage === 'review') {
        if (oldOperation.kind !== 'rolling-back') {
          throw new V2ContractError('unsafe-input', '定稿产物必须先进入回退操作后才能清除绑定。');
        }
        for (const bundleId of oldOperation.bundleIds) {
          const bundle = await this.store.getBundle(bundleId);
          if (bundle && bundle.status !== 'trashed') {
            throw new V2ContractError('unsafe-input', `Bundle ${bundleId} 尚未移入回收站。`);
          }
        }
      }
    }
  }

  private async validateMigratedArtifacts(
    record: PrototypeLifecycleRecord,
  ): Promise<string | null> {
    const artifacts = record.artifacts;
    if (!artifacts) return '旧定稿记录没有固定产物引用。';
    const bundle = await this.store.getBundle(artifacts.bundleId);
    if (!bundle || bundle.status === 'trashed') return '绑定的 Bundle 不存在或已移入回收站。';
    const job = await this.store.getJob(artifacts.jobId);
    if (!job || job.bundleId !== artifacts.bundleId || job.status !== 'completed' || !job.runId) {
      return '绑定的采集 Job 不存在、未完成，或不属于该 Bundle。';
    }
    const snapshot = await this.store.getSnapshot(artifacts.bundleId, artifacts.snapshotId);
    if (!snapshot || snapshot.sourceRunId !== job.runId) {
      return '绑定的 Snapshot 不存在，或与采集 Job 的 Run 不一致。';
    }
    if (incompleteCaseCount(snapshot.coverage.counts) > 0) {
      return '绑定的 Snapshot Coverage 不完整。';
    }
    const handoff = await this.store.getHandoff(artifacts.handoffId);
    if (
      !handoff ||
      handoff.workspaceId !== this.store.workspaceId ||
      handoff.bundleId !== artifacts.bundleId ||
      handoff.snapshotId !== artifacts.snapshotId
    ) {
      return '绑定的 Handoff 不存在，或与 Bundle/Snapshot 不一致。';
    }
    if (!/^[a-zA-Z0-9._+-]+$/.test(artifacts.deliveryId) || artifacts.deliveryId === '.' || artifacts.deliveryId === '..') {
      return '绑定的 Delivery ID 不是安全的固定目录名。';
    }
    const deliveryRoot = deliveryRootFromStoreRoot(this.options.storeRoot);
    const deliveryDir = pathResolve(deliveryRoot, artifacts.deliveryId);
    const expectedReceiptPath = pathResolve(deliveryDir, 'receipt.json');
    const expectedPromptPath = pathResolve(deliveryDir, 'agent-prompt.md');
    const receiptPath = pathResolve(artifacts.receiptPath);
    const promptPath = pathResolve(artifacts.agentPromptPath);
    const insideDelivery = (candidate: string) => {
      const relative = pathRelative(deliveryRoot, candidate);
      return relative !== '' && relative !== '..' && !relative.startsWith(`..${pathSep}`);
    };
    if (
      receiptPath !== expectedReceiptPath ||
      promptPath !== expectedPromptPath ||
      !insideDelivery(receiptPath) ||
      !insideDelivery(promptPath)
    ) {
      return '绑定的 Delivery 文件路径与固定目录不一致。';
    }
    try {
      const [receiptText, promptText] = await Promise.all([
        readFile(receiptPath, 'utf8'),
        readFile(promptPath, 'utf8'),
      ]);
      const receipt = JSON.parse(receiptText) as Record<string, unknown>;
      if (
        receipt.deliveryId !== artifacts.deliveryId ||
        receipt.workspaceId !== this.store.workspaceId ||
        receipt.bundleId !== artifacts.bundleId ||
        receipt.runId !== job.runId ||
        receipt.snapshotId !== artifacts.snapshotId ||
        receipt.handoffId !== artifacts.handoffId ||
        pathResolve(String(receipt.receiptPath ?? '')) !== expectedReceiptPath ||
        pathResolve(String(receipt.agentPromptPath ?? '')) !== expectedPromptPath ||
        promptText.trim().length === 0
      ) {
        return 'Delivery Receipt 与生命周期记录中的固定引用不一致。';
      }
    } catch {
      return '绑定的 Delivery Receipt 或 Agent Prompt 缺失或无法读取。';
    }
    return null;
  }

  private async validateLifecycleMigration(
    input: MigratePrototypeLifecycleRequest,
  ): Promise<PrototypeLifecycleDocument> {
    const candidate = PrototypeLifecycleDocument.parse(input.document);
    if (
      candidate.workspaceId !== this.store.workspaceId ||
      candidate.generationId !== this.currentGenerationId ||
      candidate.revision !== 1
    ) {
      throw new V2ContractError('workspace-generation-mismatch', 'Lifecycle migration must match the current Workspace generation.');
    }
    const current = await this.store.getPrototypeLifecycleDocument();
    if (current.revision !== 0 || Object.keys(current.records).length !== 0) {
      throw new V2ContractError('revision-conflict', 'Lifecycle migration is only allowed before lifecycle records exist.', current);
    }
    const records = { ...candidate.records };
    const rejected = new Set<string>();
    for (const [prototypeId, record] of Object.entries(records)) {
      if (record.stage !== 'final' && record.stage !== 'archived') continue;
      const reason = await this.validateMigratedArtifacts(record);
      if (!reason) continue;
      rejected.add(prototypeId);
      records[prototypeId] = {
        ...record,
        stage: 'review',
        operation: {
          kind: 'failed',
          action: 'finalize',
          message: `旧浏览器定稿绑定未通过固定引用校验，未迁移为正式定稿；Evidence 仅作诊断：${reason}`,
          failedAt: new Date().toISOString(),
        },
        artifacts: null,
        updatedAt: new Date().toISOString(),
      };
    }
    const sanitized = PrototypeLifecycleDocument.parse({
      ...candidate,
      records,
      history: candidate.history.filter((entry) =>
        !rejected.has(entry.prototypeId) || (entry.to !== 'final' && entry.to !== 'archived'),
      ),
    });
    return this.store.importPrototypeLifecycleDocument(sanitized);
  }

  private async reconcilePrototypeLifecycle(): Promise<void> {
    if (this.lifecycleReconciliationInFlight) {
      return this.lifecycleReconciliationInFlight;
    }
    const reconciliation = this.reconcilePrototypeLifecycleOnce().finally(() => {
      this.lifecycleReconciliationInFlight = undefined;
    });
    this.lifecycleReconciliationInFlight = reconciliation;
    return reconciliation;
  }

  private async cleanupIncompleteDeliveries(): Promise<void> {
    const root = deliveryRootFromStoreRoot(this.options.storeRoot);
    let entries: string[];
    try {
      entries = await readdir(root);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.startsWith('.tmp-operation-')) {
        await rm(pathJoin(root, entry), { recursive: true, force: true });
        continue;
      }
      if (!entry.startsWith('operation-')) continue;
      try {
        await readFile(pathJoin(root, entry, 'receipt.json'));
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
          await rm(pathJoin(root, entry), { recursive: true, force: true });
          continue;
        }
        throw error;
      }
    }
  }

  private async reconcilePrototypeLifecycleOnce(): Promise<void> {
    await this.store.assertHealthy();
    const document = await this.store.getPrototypeLifecycleDocument();
    for (const record of Object.values(document.records)) {
      if (record.operation.kind === 'rolling-back') {
        try {
          await this.reconcileRollback(record);
        } catch (error) {
          const message = `定稿回退失败：${error instanceof Error ? error.message : '未知错误'}。修复后可重试回退。`;
          try {
            await this.failRollback(record.operation.operationKey, message);
          } catch (persistError) {
            console.error(
              `Could not persist rollback failure for ${record.prototypeId}; the Service will retry reconciliation on restart.`,
              persistError,
            );
          }
        }
      } else if (record.operation.kind === 'finalizing') {
        try {
          await this.reconcileFinalization(record);
        } catch (error) {
          await this.failFinalization(
            record.operation.operationKey,
            `后台定稿收尾失败：${error instanceof Error ? error.message : '未知错误'}。修复后可重新检查。`,
          );
        }
      }
    }
  }

  private async failFinalization(
    operationKey: LifecycleOperationKey,
    message: string,
    failedCases: Array<{ caseId: string; reason: string }> = [],
  ): Promise<void> {
    await this.updateFinalizationRecord(operationKey, (record) => {
      if (record.operation.kind !== 'finalizing') return record;
      const failedAt = new Date().toISOString();
      return {
        ...record,
        operation: {
          kind: 'failed',
          operationKey,
          action: 'finalize',
          message,
          failedAt,
          ...(failedCases.length ? { failedCases } : {}),
        },
        updatedAt: failedAt,
      };
    });
  }

  private async failRollback(
    operationKey: LifecycleOperationKey,
    message: string,
  ): Promise<void> {
    await this.updateFinalizationRecord(operationKey, (record) => {
      if (record.operation.kind !== 'rolling-back') return record;
      const failedAt = new Date().toISOString();
      return {
        ...record,
        operation: {
          kind: 'failed',
          operationKey,
          action: 'rollback',
          message,
          failedAt,
        },
        updatedAt: failedAt,
      };
    });
  }

  private async failedCasesForJob(
    job: Awaited<ReturnType<LocalFileStore['getJob']>> & {},
  ): Promise<Array<{ caseId: string; reason: string }>> {
    const run = job.runId
      ? await this.store.getRun(job.bundleId, job.runId)
      : undefined;
    const failedAttempts = (run?.attempts ?? []).filter(
      (attempt) => !['captured', 'reused'].includes(attempt.result),
    );
    if (failedAttempts.length > 0) {
      return failedAttempts.map((attempt) => ({
        caseId: attempt.caseId,
        reason: attempt.reason ?? attempt.result,
      }));
    }
    if (run?.attempts.length) return [];

    return job.journal
      .filter((entry) => entry.event === 'case-finished' && entry.detail)
      .flatMap((entry) => {
        const detail = entry.detail!;
        const failedMarker = detail.lastIndexOf(':failed:');
        if (failedMarker >= 0) {
          return [{
            caseId: detail.slice(0, failedMarker),
            reason: detail.slice(failedMarker + ':failed:'.length) || '采集失败',
          }];
        }
        const separator = detail.lastIndexOf(':');
        if (separator < 1) return [];
        const caseId = detail.slice(0, separator);
        const result = detail.slice(separator + 1);
        if (result === 'captured' || result === 'reused') return [];
        if (result === 'failed') return [{ caseId, reason: '采集失败' }];
        if (result === 'cancelled' || result === 'interrupted' || result === 'unsupported' || result === 'skipped') {
          return [{ caseId, reason: result }];
        }
        return [{ caseId, reason: result || '采集失败' }];
      });
  }

  private async reconcileFinalization(
    record: PrototypeLifecycleRecord,
  ): Promise<void> {
    if (record.operation.kind !== 'finalizing') return;
    const operation = record.operation;
    if (operation.phase === 'awaiting-confirmation') {
      const existing = await this.store.findJobByOperationKey(operation.operationKey);
      if (existing) {
        await this.updateFinalizationOperation(operation.operationKey, (current) =>
          current.kind === 'finalizing'
            ? {
                ...current,
                phase: 'capturing',
                jobId: existing.jobId,
                bundleId: existing.bundleId,
                requestDigest: existing.operationRequestDigest,
              }
            : current,
        );
      }
      return;
    }
    if (operation.phase === 'capturing') {
      if (!operation.jobId || !operation.bundleId) {
        await this.failFinalization(operation.operationKey, '定稿 operation 缺少固定 Job/Bundle 引用。');
        return;
      }
      const job = await this.store.getJob(operation.jobId);
      if (!job || job.bundleId !== operation.bundleId || job.operationKey !== operation.operationKey) {
        await this.failFinalization(operation.operationKey, '无法找到与定稿 operation 固定绑定的采集 Job。');
        return;
      }
      if (!['completed', 'failed', 'cancelled', 'interrupted'].includes(job.status)) return;
      if (job.status !== 'completed') {
        const failedCases = await this.failedCasesForJob(job);
        await this.failFinalization(operation.operationKey, `整原型采集以 ${job.status} 结束。`, failedCases);
        return;
      }
      const snapshot = await this.store.getActiveSnapshot(job.bundleId);
      if (!snapshot || snapshot.sourceRunId !== job.runId) {
        await this.failFinalization(operation.operationKey, '采集 Job 已结束，但找不到其固定 Run 对应的 Snapshot。');
        return;
      }
      const incomplete = incompleteCaseCount(snapshot.coverage.counts);
      if (incomplete > 0) {
        const run = job.runId ? await this.store.getRun(job.bundleId, job.runId) : undefined;
        const failedCases = (run?.attempts ?? [])
          .filter((attempt) => !['captured', 'reused'].includes(attempt.result))
          .map((attempt) => ({
            caseId: attempt.caseId,
            reason: attempt.reason ?? attempt.result,
          }));
        const counts = snapshot.coverage.counts;
        await this.failFinalization(
          operation.operationKey,
          `整原型采集未完整：${counts.captured + counts.reused}/${counts.selected} 项有效，${incomplete} 项失败，尚未生成 Handoff 和提示词。`,
          failedCases,
        );
        return;
      }
      await this.updateFinalizationOperation(operation.operationKey, (current) =>
        current.kind === 'finalizing'
          ? {
              ...current,
              phase: 'awaiting-risks',
              snapshotId: snapshot.snapshotId,
              acknowledgedRiskKinds: [],
            }
          : current,
      );
      return;
    }
    if (operation.phase === 'awaiting-risks') {
      if (!operation.bundleId || !operation.snapshotId) {
        await this.failFinalization(operation.operationKey, '风险确认阶段缺少固定 Bundle/Snapshot 引用。');
        return;
      }
      let evaluated: Awaited<ReturnType<typeof this.evaluateHandoffForSnapshot>>;
      try {
        evaluated = await this.evaluateHandoffForSnapshot(operation.bundleId, operation.snapshotId);
      } catch (error) {
        await this.failFinalization(
          operation.operationKey,
          `定稿风险评估失败：${error instanceof Error ? error.message : '未知错误'}。修复后可重新检查。`,
        );
        return;
      }
      const requiredRiskKinds = new Set(evaluated.evaluation.risks.map((risk) => risk.kind));
      const acknowledgedRiskKinds = new Set(operation.acknowledgedRiskKinds);
      const missing = [...requiredRiskKinds].filter((kind) => !acknowledgedRiskKinds.has(kind));
      if (missing.length > 0) return;
      await this.updateFinalizationOperation(operation.operationKey, (current) =>
        current.kind === 'finalizing' && current.phase === 'awaiting-risks'
          ? { ...current, phase: 'building-prompt' }
          : current,
      );
      return;
    }
    if (operation.phase !== 'building-prompt') return;
    try {
      await this.withOperationLock(`operation:${operation.operationKey}`, () =>
        this.buildFinalizationArtifacts(record),
      );
    } catch (error) {
      await this.failFinalization(
        operation.operationKey,
        `Agent 提示词生成失败：${error instanceof Error ? error.message : '未知错误'}。修复后可重新检查。`,
      );
    }
  }

  private async evaluateHandoffForSnapshot(bundleId: string, snapshotId: string) {
    const snapshot = await this.store.getSnapshot(BundleId.parse(bundleId), SnapshotId.parse(snapshotId));
    if (!snapshot) throw new V2ContractError('unknown-reference', '定稿 Snapshot 不存在。');
    const run = await this.store.getRun(bundleId as never, snapshot.sourceRunId);
    if (!run) throw new V2ContractError('unknown-reference', '定稿 Snapshot 的来源 Run 不存在。');
    const activeCases = await selectedCasesForSnapshot(this.store, BundleId.parse(bundleId), snapshot);
    let current: CapturePreflight | undefined;
    try {
      current = (await this.runPreflight(selectionDraftFromSelectedCases(run.selection.prototypeId, activeCases))).preflight;
    } catch (error) {
      if (!(error instanceof V2ContractError) || error.code !== 'unknown-reference') throw error;
    }
    const interactionCoverage = current
      ? {
          required: current.interactionCoverage.required,
          captured: current.interactionCoverage.selected,
          missingScenarioIds: current.interactionCoverage.missingScenarioIds,
        }
      : { required: 1, captured: 0, missingScenarioIds: ['authored-reference-removed'] };
    const dependencyDigests: Record<string, string> = current
      ? { [`manifest:${run.selection.prototypeId}`]: current.manifestDigest }
      : {};
    if (current) {
      for (const selected of activeCases) dependencyDigests[`runtime:${selected.caseKey.screenId}`] = current.inputVersion;
    }
    const report = await this.store.createStalenessReport({
      bundleId: BundleId.parse(bundleId),
      snapshotId: SnapshotId.parse(snapshotId),
      inputVersion: current?.inputVersion ?? 'authored-reference-removed',
      currentDependencyDigests: dependencyDigests,
    });
    const evaluation = await evaluateAgentHandoff({
      store: this.store,
      bundleId: BundleId.parse(bundleId),
      snapshotId: SnapshotId.parse(snapshotId),
      selectedCases: run.selection.cases,
      stalenessReport: report,
      interactionCoverage,
    });
    return { snapshot, run, activeCases, current, report, evaluation, interactionCoverage };
  }

  private async buildFinalizationArtifacts(record: PrototypeLifecycleRecord): Promise<void> {
    if (record.operation.kind !== 'finalizing') return;
    const operation = record.operation;
    if (!operation.jobId || !operation.bundleId || !operation.snapshotId || !operation.requestDigest) {
      await this.failFinalization(operation.operationKey, '定稿 operation 缺少固定 Job、Bundle、Snapshot 或请求摘要。');
      return;
    }
    const job = await this.store.getJob(operation.jobId);
    if (!job || job.status !== 'completed' || job.bundleId !== operation.bundleId || job.operationKey !== operation.operationKey) {
      await this.failFinalization(operation.operationKey, '定稿 Job 引用已失效或未成功完成。');
      return;
    }
    const snapshot = await this.store.getSnapshot(
      BundleId.parse(operation.bundleId),
      SnapshotId.parse(operation.snapshotId),
    );
    if (!snapshot) {
      await this.failFinalization(operation.operationKey, '定稿 Snapshot 不存在，未生成 Handoff 和提示词。');
      return;
    }
    if (snapshot.sourceRunId !== job.runId) {
      await this.failFinalization(
        operation.operationKey,
        '定稿 Snapshot 与 Job 固定绑定的来源 Run 不一致，未生成 Handoff 和提示词。',
      );
      return;
    }
    const incomplete = incompleteCaseCount(snapshot.coverage.counts);
    if (incomplete !== 0) {
      const failedCases = await this.failedCasesForJob(job);
      await this.failFinalization(
        operation.operationKey,
        `定稿 Snapshot 仍有 ${incomplete} 项未完成，未生成 Handoff 和提示词。`,
        failedCases,
      );
      return;
    }
    const evaluated = await this.evaluateHandoffForSnapshot(operation.bundleId, operation.snapshotId);
    const requiredRiskKinds = new Set(evaluated.evaluation.risks.map((risk) => risk.kind));
    const acknowledged = new Set(operation.acknowledgedRiskKinds);
    const missing = [...requiredRiskKinds].filter((kind) => !acknowledged.has(kind));
    if (missing.length) {
      await this.failFinalization(operation.operationKey, `缺少风险确认：${missing.join('、')}。请重新检查风险后再开始生成提示词。`);
      return;
    }
    const handoffDigest = operationRequestDigest({
      bundleId: operation.bundleId,
      snapshotId: operation.snapshotId,
      implementationIntent: operation.implementationIntent ?? '',
      acknowledgedRiskKinds: [...operation.acknowledgedRiskKinds].sort(),
    });
    const handoff = await createAgentHandoff({
      store: this.store,
      bundleId: BundleId.parse(operation.bundleId),
      snapshotId: SnapshotId.parse(operation.snapshotId),
      selectedCases: evaluated.run.selection.cases,
      stalenessReport: evaluated.report,
      currentInputVersion: evaluated.current?.inputVersion ?? 'authored-reference-removed',
      interactionCoverage: evaluated.interactionCoverage,
      ...(operation.implementationIntent ? { implementationIntent: operation.implementationIntent } : {}),
      acknowledgedRiskKinds: operation.acknowledgedRiskKinds,
      operationKey: operation.operationKey,
      operationRequestDigest: handoffDigest,
    });
    await this.updateFinalizationOperation(operation.operationKey, (current) =>
      current.kind === 'finalizing' ? { ...current, handoffId: handoff.handoffId } : current,
    );
    const acceptedWarningIds = operation.acceptedWarningIds;
    const deliveryDigest = operationRequestDigest({
      handoffId: handoff.handoffId,
      targetRoot: this.options.deliveryTargetRoot,
      implementationIntent: operation.implementationIntent ?? '',
      runId: job.runId ?? '',
      acceptedWarningIds: [...acceptedWarningIds].sort(),
      acknowledgedRiskKinds: [...operation.acknowledgedRiskKinds].sort(),
    });
    const receipt = await writeDeliveryReceipt({
      storeRoot: this.options.storeRoot,
      targetRoot: this.options.deliveryTargetRoot,
      handoff,
      source: 'gui',
      ...(job.runId ? { runId: job.runId } : {}),
      acceptedWarningIds,
      acknowledgedRiskKinds: operation.acknowledgedRiskKinds,
      ...(operation.implementationIntent ? { implementationIntent: operation.implementationIntent } : {}),
      operationKey: operation.operationKey,
      operationRequestDigest: deliveryDigest,
    });
    await this.updateFinalizationOperation(operation.operationKey, (current) =>
      current.kind === 'finalizing'
        ? { ...current, deliveryId: receipt.deliveryId }
        : current,
    );
    const finalizedAt = new Date().toISOString();
    const historyEntry = {
      id: `${record.prototypeId}-${finalizedAt}-${randomUUID().slice(0, 8)}`,
      prototypeId: record.prototypeId,
      from: 'review' as const,
      to: 'final' as const,
      note: '整原型采集与提示词生成完成',
      changedAt: finalizedAt,
    };
    await this.updateFinalizationRecord(operation.operationKey, (latest) => {
      if (latest.operation.kind !== 'finalizing') return latest;
      return PrototypeLifecycleRecord.parse({
        ...latest,
        stage: 'final',
        operation: { kind: 'idle' },
        artifacts: {
          jobId: operation.jobId,
          bundleId: operation.bundleId,
          snapshotId: operation.snapshotId,
          handoffId: handoff.handoffId,
          deliveryId: receipt.deliveryId,
          agentPromptPath: receipt.agentPromptPath,
          receiptPath: receipt.receiptPath,
          finalizedAt,
          operationKey: operation.operationKey,
          requestDigest: deliveryDigest,
        },
        updatedAt: finalizedAt,
      });
    }, historyEntry);
  }

  private async reconcileRollback(record: PrototypeLifecycleRecord): Promise<void> {
    if (record.operation.kind !== 'rolling-back') return;
    for (const bundleId of record.operation.bundleIds) {
      const bundle = await this.store.getBundle(bundleId);
      if (bundle && bundle.status !== 'trashed') await this.store.trashBundle(bundleId);
    }
    const completedAt = new Date().toISOString();
    const historyEntry = {
      id: `${record.prototypeId}-${completedAt}-${randomUUID().slice(0, 8)}`,
      prototypeId: record.prototypeId,
      from: 'final' as const,
      to: 'review' as const,
      note: record.operation.note ?? '清理定稿 Evidence 后回退',
      changedAt: completedAt,
    };
    await this.updateFinalizationRecord(record.operation.operationKey, (latest) => {
      if (latest.operation.kind !== 'rolling-back') return latest;
      return PrototypeLifecycleRecord.parse({
        ...latest,
        stage: 'review',
        operation: { kind: 'idle' },
        artifacts: null,
        updatedAt: completedAt,
      });
    }, historyEntry);
  }

  private async runPreflight(
    draft: SelectionDraft,
  ): Promise<{ preflight: CapturePreflight }> {
    if (this.options.preflightProvider) {
      return this.options.preflightProvider(draft);
    }
    return preflightInstrumentedRuntime({
      draft,
      runtimeBaseUrl: this.options.runtimeBaseUrl,
      ...(this.options.maxCases === undefined
        ? {}
        : { maxCases: this.options.maxCases }),
    });
  }

  private async handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    this.assertOrigin(request);
    const url = new URL(request.url ?? '/', 'http://local.invalid');
    const path = url.pathname;

    await this.ensureStoreHealthy();

    if (request.method === 'POST' && path === '/api/v2/session') {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + SESSION_TTL_MS;
      this.sessions.set(token, { expiresAt, generationId: this.currentGenerationId });
      const session: LocalServiceSession = {
        protocolVersion: LOCAL_SERVICE_PROTOCOL_VERSION,
        serviceInstanceId: this.serviceInstanceId,
        sessionToken: token,
        workspaceId: this.store.workspaceId,
        generationId: this.currentGenerationId,
        expiresAt: new Date(expiresAt).toISOString(),
        finalizedOrphanJobIds: this.finalizedOrphanJobIds,
        deliveryTargetRoot: this.options.deliveryTargetRoot,
      };
      success(response, session, 201);
      return;
    }

    this.requireSession(request);

    if (request.method === 'POST' && path === '/api/v2/workspace/reset/preview') {
      const body = (await readBody(request)) as WorkspaceResetPreviewRequest;
      if (body.workspaceId !== this.store.workspaceId) {
        throw new V2ContractError('workspace-mismatch', `Reset requested for ${String(body.workspaceId)}, but this Service owns ${this.store.workspaceId}.`);
      }
      if (this.currentGenerationId === 'legacy-unavailable') {
        throw new V2ContractError('workspace-generation-mismatch', 'Legacy Workspace must be upgraded by the writer before reset preview.');
      }
      const runningTasks = (await this.store.listNonTerminalJobs()).map((job) => `job:${job.jobId}`).sort();
      const plan = await createWorkspaceResetPlan({
        workspaceId: this.store.workspaceId,
        generationId: this.currentGenerationId,
        storeRoot: this.options.storeRoot,
        deliveriesRoot: deliveryRootFromStoreRoot(this.options.storeRoot),
        reviewsRoot: reviewsRootFromStoreRoot(this.options.storeRoot, this.store.workspaceId),
        runningTasks,
      });
      success(response, plan, 201);
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/workspace/reset/apply') {
      if (this.workspaceResetting) {
        throw new V2ContractError(
          'workspace-resetting',
          'Workspace reset is already in progress.',
        );
      }
      const body = (await readBody(request)) as WorkspaceResetApplyRequest;
      if (body.workspaceId !== this.store.workspaceId) {
        throw new V2ContractError(
          'workspace-mismatch',
          `Reset requested for ${String(body.workspaceId)}, but this Service owns ${this.store.workspaceId}.`,
        );
      }
      if (body.generationId !== this.currentGenerationId) {
        throw new V2ContractError('workspace-generation-mismatch', `Reset apply expected ${body.generationId}; Service owns ${this.currentGenerationId}.`);
      }
      const jobs = await this.store.listJobs();
      const runningJobs = jobs.filter(
        (job) => !['completed', 'failed', 'cancelled', 'interrupted'].includes(job.status),
      );
      const runningTasks = runningJobs.map((job) => `job:${job.jobId}`).sort();
      const plan = await validateWorkspaceResetPlan({
        planId: body.planId,
        workspaceId: body.workspaceId,
        generationId: body.generationId,
        storeRoot: this.options.storeRoot,
        deliveriesRoot: deliveryRootFromStoreRoot(this.options.storeRoot),
        reviewsRoot: reviewsRootFromStoreRoot(this.options.storeRoot, this.store.workspaceId),
        runningTasks,
      });
      this.workspaceResetting = true;
      try {
        const stoppedReviewRunIds = await this.reviews.close();
        for (const job of runningJobs) {
          await this.jobHost.cancel(this.store, job.jobId);
        }
        await Promise.allSettled(
          runningJobs
            .map((job) => this.jobHost.completion(job.jobId))
            .filter(
              (completion): completion is NonNullable<typeof completion> =>
                completion !== undefined,
            ),
        );
        const reset = await this.store.resetWorkspace(body.generationId);
        await rm(deliveryRootFromStoreRoot(this.options.storeRoot), {
          recursive: true,
          force: true,
        });
        await rm(reviewsRootFromStoreRoot(this.options.storeRoot, this.store.workspaceId), { recursive: true, force: true });
        const revokedSessionCount = this.sessions.size;
        this.preflights.clear();
        this.reviewApprovals.clear();
        this.finalizedOrphanJobIds = [];
        this.sessions.clear();
        this.currentGenerationId = reset.newGenerationId;
        const result: WorkspaceResetResult = {
          workspaceId: this.store.workspaceId,
          oldGenerationId: reset.oldGenerationId,
          newGenerationId: reset.newGenerationId,
          actualRemoved: {
            evidence: plan.evidence,
            deliveries: plan.deliveries,
            reviews: plan.reviews,
            prototypeLifecycle: plan.prototypeLifecycle,
          },
          revokedSessionCount,
          stoppedJobIds: runningJobs.map((job) => job.jobId),
          stoppedReviewRunIds,
        };
        success(response, result);
      } finally {
        this.workspaceResetting = false;
      }
      return;
    }

    if (this.workspaceResetting) {
      throw new V2ContractError(
        'workspace-resetting',
        'Workspace reset is in progress; retry this request shortly.',
      );
    }

    if (request.method === 'GET' && path === '/api/v2/prototype-lifecycle') {
      success(response, await this.store.getPrototypeLifecycleDocument());
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/prototype-lifecycle/migrate') {
      const body = (await readBody(request)) as MigratePrototypeLifecycleRequest;
      const migrated = await this.withOperationLock(
        `lifecycle:${this.store.workspaceId}`,
        () => this.validateLifecycleMigration(body),
      );
      success(response, migrated, 201);
      return;
    }

    if (request.method === 'PUT' && path === '/api/v2/prototype-lifecycle') {
      const body = (await readBody(request)) as UpdatePrototypeLifecycleRequest;
      if (!Number.isInteger(body.expectedRevision) || body.expectedRevision < 0) {
        throw new V2ContractError(
          'invalid-schema',
          'expectedRevision must be a non-negative integer.',
        );
      }
      const document = PrototypeLifecycleDocument.parse(body.document);
      if (document.workspaceId !== this.store.workspaceId) {
        throw new V2ContractError(
          'workspace-mismatch',
          'Prototype lifecycle update belongs to another Workspace.',
        );
      }
      if (document.generationId !== this.currentGenerationId) {
        throw new V2ContractError(
          'workspace-generation-mismatch',
          'Prototype lifecycle update belongs to an earlier Workspace generation.',
        );
      }
      const saved = await this.withOperationLock(
        `lifecycle:${this.store.workspaceId}`,
        async () => {
          const previous = await this.store.getPrototypeLifecycleDocument();
          await this.assertClientLifecycleUpdate(previous, document);
          return this.store.compareAndSetPrototypeLifecycleDocument({
            expectedRevision: body.expectedRevision,
            document,
          });
        },
      );
      success(response, saved);
      return;
    }

    if (request.method === 'GET' && path === '/api/v2/console') {
      const bundles = await this.store.listBundles();
      const unreadableSnapshots: CaptureSnapshotReadFailure[] = [];
      const bundleSummaries = await Promise.all(
        bundles.map(async (bundle) => {
          const snapshotIds = await this.store.listSnapshotIds(bundle.bundleId);
          const snapshots: BundleSnapshot[] = [];
          for (const snapshotId of snapshotIds) {
            try {
              const snapshot = await this.store.getSnapshot(bundle.bundleId, snapshotId);
              if (snapshot) snapshots.push(snapshot);
              else unreadableSnapshots.push({ bundleId: bundle.bundleId, snapshotId });
            } catch {
              unreadableSnapshots.push({ bundleId: bundle.bundleId, snapshotId });
            }
          }
          let activeSnapshot: BundleSnapshot | undefined;
          try {
            activeSnapshot = await this.store.getActiveSnapshot(bundle.bundleId);
          } catch {
            activeSnapshot = undefined;
          }
          return {
            bundle,
            snapshots,
            ...(activeSnapshot ? { activeSnapshot } : {}),
          };
        }),
      );
      const handoffs: CaptureResultHandoffFact[] = (await this.store.listHandoffs()).map((handoff) => ({
        handoffId: handoff.handoffId,
        bundleId: handoff.bundleId,
        snapshotId: handoff.snapshotId,
      }));
      const state: CaptureConsoleState = {
        workspaceId: this.store.workspaceId,
        generationId: this.currentGenerationId,
        bundles: bundleSummaries,
        jobs: await this.store.listJobs(),
        receipts: await this.deliveryReceiptFacts(),
        handoffs,
        unreadableSnapshots,
      };
      success(response, state);
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/reviews') {
      const body = (await readBody(request)) as StartTargetReviewRequest;
      const handoff = await this.store.getHandoff(HandoffId.parse(body.seed?.handoffId));
      if (!handoff || handoff.bundleId !== body.seed.bundleId || handoff.snapshotId !== body.seed.snapshotId) {
        throw new V2ContractError('unknown-reference', 'Review seed does not match a persisted Handoff/Bundle/Snapshot.');
      }
      const built = await buildAcceptanceContractFromStore({ store: this.store, handoff });
      const blobs = await this.store.listBlobRecords(handoff.bundleId);
      const consumer = { handoff, evidence: built.evidence, acceptance: built.contract, blobs };
      const selected = selectReviewProfileForConsumer(consumer, body.seed.reviewProfile?.coverageProfile);
      const index = buildHandoffIndex(consumer);
      const selectedSet = new Set(selected.selectedCaseIds);
      const selectedGroups = index.screenshotGroups.filter((group) => group.caseIds.some((caseId) => selectedSet.has(caseId)));
      const requiredSourceDigests = [...new Set(selectedGroups.flatMap((group) => group.digest ? [group.digest] : []))].sort();
      const adapter = await detectTargetAdapter(body.seed.targetRoot);
      const targetIdentity = await readTargetIdentity(body.seed.targetRoot);
      if (targetIdentity.head !== body.seed.targetBaselineCommit) {
        throw new V2ContractError('invalid-schema', 'Review Target baseline commit does not match the current Target HEAD.');
      }
      if (adapter.adapterId === 'flutter') {
        const coveredCases = new Set(selectedGroups.filter((group) => group.digest).flatMap((group) => group.caseIds));
        const missingCases = selected.selectedCaseIds.filter((caseId) => !coveredCases.has(caseId));
        if (missingCases.length > 0) throw new V2ContractError('unknown-reference', `Flutter Runtime Review requires fixed Source Screenshot evidence for selected Cases: ${missingCases.join(', ')}.`);
      }
      const authoritative = {
        targetContentDigest: targetIdentity.contentDigest,
        selectedCaseIds: selected.selectedCaseIds,
        requiredSourceDigests,
        requiredScenarioCaseIds: selected.selectedScenarioCaseIds,
        obligationContractVersion: 1 as const,
        requiredObligations: selected.selectedObligations,
        verificationContractVersion: 1 as const,
        reviewProfile: selected.profile,
        runtimeProvider: adapter.adapterId === 'flutter'
          ? { required: true, providerId: 'dart-flutter-mcp' }
          : { required: false },
      };
      if (
        body.seed.obligationContractVersion !== 1
        || body.seed.verificationContractVersion !== 1
        || selectedGroups.some((group) => !group.digest)
        || JSON.stringify(reviewSeedSelection(body.seed)) !== JSON.stringify(reviewSeedSelection({ ...body.seed, ...authoritative }))
      ) {
        throw new V2ContractError('invalid-schema', 'Review seed Profile, selection, Runtime provider, or obligations do not match the authoritative Handoff/Target calculation.');
      }
      success(response, await this.reviews.start({ ...body.seed, ...authoritative }), 201);
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/review-approvals') {
      const body = (await readBody(request)) as CreateReviewApprovalRequest;
      await this.reviews.read(body.reviewRunId);
      const token = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + 10 * 60 * 1000;
      this.reviewApprovals.set(token, { ...body, expiresAt });
      success(response, { token, kind: body.kind, reviewRunId: body.reviewRunId, expiresAt: new Date(expiresAt).toISOString() }, 201);
      return;
    }

    const reviewMatch = path.match(/^\/api\/v2\/reviews\/([^/]+)$/);
    if (request.method === 'GET' && reviewMatch) {
      success(response, await this.reviews.read(reviewMatch[1]!));
      return;
    }

    const reviewArtifactMatch = path.match(/^\/api\/v2\/reviews\/([^/]+)\/artifacts\/(sha256(?::|%3A|%3a)[a-f0-9]{64})$/);
    if (request.method === 'GET' && reviewArtifactMatch) {
      const artifactDigest = decodeURIComponent(reviewArtifactMatch[2]!);
      const bytes = await this.reviews.getArtifact(reviewArtifactMatch[1]!, artifactDigest);
      response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(Buffer.from(bytes));
      return;
    }

    const reviewOperation = path.match(/^\/api\/v2\/reviews\/([^/]+)\/(viewed|render|replay|compare|claims|findings|assessments|tranches|finalize)$/);
    if (request.method === 'POST' && reviewOperation) {
      const reviewRunId = reviewOperation[1]!;
      const operation = reviewOperation[2]!;
      if (operation === 'viewed') {
        const body = (await readBody(request)) as RecordScreenshotViewedRequest;
        const bytes = decodeArtifactBytes(body.bytesBase64);
        await this.reviews.putArtifact(reviewRunId, body.artifact, bytes);
        success(response, await this.reviews.append({
          reviewRunId,
          actor: 'mcp',
          tool: 'read_evidence_screenshot',
          payload: { kind: 'screenshot-viewed', screenId: body.screenId, caseIds: body.caseIds, source: body.artifact },
        }), 201);
        return;
      }
      if (operation === 'render') {
        const body = (await readBody(request)) as RunTargetRenderRequest;
        const session = await this.reviews.read(reviewRunId);
        if (!session.runtimeProvider.required || session.runtimeProvider.providerId !== 'dart-flutter-mcp') {
          throw new V2ContractError('invalid-schema', 'This Review has no Flutter Runtime provider; render is not applicable.');
        }
        try {
          const rendered = await new FlutterReviewRuntime(this.getFlutterMcpProvider()).render(session, body);
          await this.appendRuntimeProgress(reviewRunId, session, rendered.providerSession, rendered.failures);
          await this.reviews.putArtifact(reviewRunId, rendered.artifact, rendered.bytes);
          let updated = await this.reviews.append({
            reviewRunId,
            actor: 'runner',
            tool: rendered.providerSession.providerId,
            payload: {
              kind: 'target-rendered', screenId: rendered.artifact.owner.screenId, caseId: body.caseId,
              sourceDigest: body.sourceDigest, tranche: body.tranche, round: body.round, attemptId: body.attemptId,
              targetRevision: session.targetRevision, target: rendered.artifact, runtimeReceipt: rendered.runtimeReceipt,
              runtimeErrorReceipts: rendered.runtimeErrorReceipts,
              structureObservation: rendered.structureObservation,
              stateObservation: rendered.stateObservation,
            },
          });
          if (runtimeErrorsDetected(rendered.runtimeErrors)) updated = await this.recordRuntimeTerminal(reviewRunId, rendered.providerSession.providerId, 'needs-human', 'runtime-errors-detected');
          success(response, updated, 201);
        } catch (error) {
          success(response, await this.recordProviderError(reviewRunId, error), 200);
        }
        return;
      }
      if (operation === 'replay') {
        const body = (await readBody(request)) as RunScenarioReplayRequest;
        const session = await this.reviews.read(reviewRunId);
        if (!session.runtimeProvider.required || session.runtimeProvider.providerId !== 'dart-flutter-mcp') {
          throw new V2ContractError('invalid-schema', 'This Review has no Flutter Runtime provider; Scenario replay is not applicable.');
        }
        try {
          const replayed = await new FlutterReviewRuntime(this.getFlutterMcpProvider()).replay(session, body);
          await this.appendRuntimeProgress(reviewRunId, session, replayed.providerSession, replayed.failures);
          let updated = await this.reviews.append({
            reviewRunId,
            actor: 'runner',
            tool: replayed.providerSession.providerId,
            payload: {
              kind: 'scenario-replayed', screenId: replayed.transition.screenId, caseId: body.caseId,
              scenarioId: replayed.transition.scenarioId, receiptDigest: replayed.runtimeReceipt.resultDigest,
              targetRevision: session.targetRevision, transition: replayed.transition, runtimeReceipt: replayed.runtimeReceipt,
              runtimeErrorReceipts: replayed.runtimeErrorReceipts,
            },
          });
          if (runtimeErrorsDetected(replayed.runtimeErrors)) updated = await this.recordRuntimeTerminal(reviewRunId, replayed.providerSession.providerId, 'needs-human', 'runtime-errors-detected');
          success(response, updated, 201);
        } catch (error) {
          success(response, await this.recordProviderError(reviewRunId, error), 200);
        }
        return;
      }
      if (operation === 'compare') {
        const body = (await readBody(request)) as RecordArtifactCompareRequest;
        await this.reviews.putArtifact(reviewRunId, body.diff.artifact, decodeArtifactBytes(body.diff.bytesBase64));
        if (body.overlay) await this.reviews.putArtifact(reviewRunId, body.overlay.artifact, decodeArtifactBytes(body.overlay.bytesBase64));
        success(response, await this.reviews.append({
          reviewRunId,
          actor: 'runner',
          tool: body.receiptTool,
          payload: {
            kind: 'artifacts-compared', screenId: body.screenId, caseId: body.caseId, attemptId: body.attemptId,
            sourceDigest: body.sourceDigest, targetDigest: body.targetDigest, diff: body.diff.artifact,
            ...(body.overlay ? { overlay: body.overlay.artifact } : {}), comparable: body.comparable,
            ...(body.normalizedDiffSignature === undefined ? {} : { normalizedDiffSignature: body.normalizedDiffSignature }),
            ...(body.reason === undefined ? {} : { reason: body.reason }),
          },
        }), 201);
        return;
      }
      if (operation === 'claims') {
        const body = (await readBody(request)) as RecordTargetClaimsVerifiedRequest;
        success(response, await this.reviews.append({
          reviewRunId,
          actor: 'runner',
          tool: body.receiptTool,
          payload: { kind: 'target-claims-verified', receipt: body.receipt },
        }), 201);
        return;
      }
      if (operation === 'findings') {
        const body = (await readBody(request)) as RecordReviewFindingsRequest;
        success(response, await this.reviews.append({ reviewRunId, actor: body.actor, payload: { kind: 'findings-recorded', findings: body.findings } }), 201);
        return;
      }
      if (operation === 'assessments') {
        const body = (await readBody(request)) as RecordReviewAssessmentsRequest;
        success(response, await this.reviews.append({ reviewRunId, actor: 'agent', payload: { kind: 'obligations-assessed', assessments: body.assessments } }), 201);
        return;
      }
      if (operation === 'tranches') {
        const body = (await readBody(request)) as ConsumeReviewApprovalRequest;
        const approval = consumeReviewApproval(this.reviewApprovals, body.approvalToken, 'tranche', reviewRunId) as Extract<CreateReviewApprovalRequest, { kind: 'tranche' }>;
        success(response, await this.reviews.append({ reviewRunId, actor: approval.actor, payload: { kind: 'tranche-authorized', screenId: approval.screenId, tranche: approval.tranche, approvalRef: approval.approvalRef } }), 201);
        return;
      }
      const body = (await readBody(request)) as ConsumeReviewApprovalRequest;
      const approval = consumeReviewApproval(this.reviewApprovals, body.approvalToken, 'finalize', reviewRunId) as Extract<CreateReviewApprovalRequest, { kind: 'finalize' }>;
      const session = await this.reviews.read(reviewRunId);
      success(response, await this.reviews.append({
        reviewRunId,
        actor: approval.actor,
        payload: {
          kind: 'human-finalized', confirmationRef: approval.confirmationRef,
          decision: session.reviewProfile.coverageProfile === 'l3-full' ? 'complete' : 'accept',
        },
      }), 201);
      return;
    }

    if (request.method === 'GET' && path === '/api/v2/evidence-inventory') {
      const bundles = await this.store.listBundles();
      const inventory: EvidenceInventory = buildEvidenceInventory(
        this.store.workspaceId,
        await Promise.all(
          bundles.map(async (bundle) => ({
            bundle,
            ...((await this.store.getActiveSnapshot(bundle.bundleId))
              ? {
                  activeSnapshot: (await this.store.getActiveSnapshot(
                    bundle.bundleId,
                  ))!,
                }
              : {}),
            runs: await this.store.listRuns(bundle.bundleId),
            revisions: await this.store.listEvidenceRevisions(bundle.bundleId),
            blobs: await this.store.listBlobRecords(bundle.bundleId),
            stalenessReports: await this.store.listStalenessReports(
              bundle.bundleId,
            ),
            handoffs: await this.store.listHandoffs(bundle.bundleId),
          })),
        ),
      );
      success(response, inventory);
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/bundles/trash') {
      const body = (await readBody(request)) as { bundleIds?: unknown };
      const bundleIds = BundleId.array().min(1).parse(body.bundleIds);
      success(
        response,
        await Promise.all(
          [...new Set(bundleIds)].map((bundleId) =>
            this.store.trashBundle(bundleId),
          ),
        ),
      );
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/bundles/restore') {
      const body = (await readBody(request)) as { bundleIds?: unknown };
      const bundleIds = BundleId.array().min(1).parse(body.bundleIds);
      success(
        response,
        await Promise.all(
          [...new Set(bundleIds)].map((bundleId) =>
            this.store.restoreBundle(bundleId),
          ),
        ),
      );
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/delete-plans') {
      const body = (await readBody(request)) as { bundleIds?: unknown };
      const bundleIds = BundleId.array().min(1).parse(body.bundleIds);
      success(response, await this.store.planDeleteBundles(bundleIds), 201);
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/delete-plans/apply') {
      const body = (await readBody(request)) as { plan?: BundleDeletePlan };
      if (!body.plan) {
        throw new V2ContractError('invalid-schema', 'Delete Plan is required.');
      }
      success(response, await this.store.applyDeleteBundles(body.plan));
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/preflights') {
      const body = (await readBody(request)) as CreatePreflightRequest;
      const draft = SelectionDraft.parse(body.draft);
      const { preflight } = await this.runPreflight(draft);
      const createdAt = new Date();
      const expiresAt = new Date(
        createdAt.getTime() + this.options.preflightTtlMs,
      );
      const record: PreflightRecord = {
        preflightId: generateOperationalId('preflight'),
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        result: preflight,
        draft,
      };
      this.preflights.set(record.preflightId, record);
      success(
        response,
        {
          preflightId: record.preflightId,
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
          result: record.result,
        } satisfies StoredPreflight,
        201,
      );
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/jobs') {
      const body = (await readBody(request)) as CreateJobRequest;
      const operationKey = body.operationKey
        ? LifecycleOperationKey.parse(body.operationKey)
        : undefined;
      const create = async () => {
        const existing = operationKey
          ? await this.store.findJobByOperationKey(operationKey)
          : undefined;
        const record = this.preflights.get(body.preflightId);
        if (!record || Date.parse(record.expiresAt) <= Date.now()) {
          if (existing && body.operationRequestDigest) {
            const digest = OperationRequestDigest.parse(
              body.operationRequestDigest,
            );
            if (digest === existing.operationRequestDigest) {
              success(response, { job: existing }, 202);
              return;
            }
            throw new V2ContractError(
              'idempotency-conflict',
              `Capture operation ${operationKey} was already accepted with different input.`,
              { jobId: existing.jobId },
            );
          }
          throw new V2ContractError(
            'preflight-expired',
            'Preflight expired; run it again before creating a Job.',
          );
        }
        const acceptedWarningIds = [...new Set(body.acceptedWarningIds ?? [])].sort();
        const refreshedDraft = SelectionDraft.parse({
          ...record.draft,
          acceptedWarningIds,
        });
        const refreshed = (await this.runPreflight(refreshedDraft)).preflight;
        if (
          refreshed.inputVersion !== record.result.inputVersion ||
          refreshed.manifestDigest !== record.result.manifestDigest ||
          matrixIdentity(refreshed) !== matrixIdentity(record.result)
        ) {
          throw new V2ContractError(
            'preflight-expired',
            'Runtime input or Case Matrix changed after Preflight.',
          );
        }
        if (!refreshed.ready) {
          throw new V2ContractError(
            'invalid-schema',
            `Warnings must be accepted individually: ${refreshed.unacceptedWarningIds.join(', ')}.`,
          );
        }
        const bundleId = existing?.bundleId ?? (body.bundleId
          ? BundleId.parse(body.bundleId)
          : (generateOperationalId('bundle') as BundleId));
        const digest = operationRequestDigest({
          bundleId,
          selection: refreshed.selection,
          inputVersion: refreshed.inputVersion,
          acceptedWarningIds,
        });
        if (
          body.operationRequestDigest &&
          OperationRequestDigest.parse(body.operationRequestDigest) !== digest
        ) {
          throw new V2ContractError(
            'idempotency-conflict',
            `Capture operation ${operationKey} request changed after confirmation.`,
          );
        }
        if (existing) {
          if (existing.operationRequestDigest !== digest) {
            throw new V2ContractError(
              'idempotency-conflict',
              `Capture operation ${operationKey} was already accepted with different input.`,
              { jobId: existing.jobId },
            );
          }
          if (operationKey) {
            await this.updateFinalizationOperation(operationKey, (operation) =>
              operation.kind === 'finalizing'
                ? {
                    ...operation,
                    phase: 'capturing',
                    jobId: existing.jobId,
                    bundleId: existing.bundleId,
                    requestDigest: digest,
                    acceptedWarningIds,
                  }
                : operation,
            );
          }
          success(response, { job: existing }, 202);
          return;
        }
        const accepted = await this.jobHost.accept({
          store: this.store,
          bundleId,
          preflight: refreshed,
          runtimeBaseUrl: this.options.runtimeBaseUrl,
          ...(operationKey ? { operationKey, operationRequestDigest: digest } : {}),
          driver:
            this.options.driverFactory?.() ?? new PlaywrightCaseCaptureDriver(),
        });
        if (operationKey) {
          await this.updateFinalizationOperation(operationKey, (operation) =>
            operation.kind === 'finalizing'
                ? {
                    ...operation,
                    phase: 'capturing',
                    jobId: accepted.job.jobId,
                  bundleId: accepted.job.bundleId,
                  requestDigest: digest,
                  acceptedWarningIds,
                }
              : operation,
          );
        }
        success(response, { job: accepted.job }, 202);
      };
      if (operationKey) {
        await this.withOperationLock(`operation:${operationKey}`, create);
      } else {
        await create();
      }
      return;
    }

    const jobMatch = path.match(/^\/api\/v2\/jobs\/([^/]+)$/);
    if (request.method === 'GET' && jobMatch) {
      const jobId = JobId.parse(jobMatch[1]);
      const job = await this.store.getJob(jobId);
      if (!job)
        throw new V2ContractError('unknown-reference', `Unknown Job ${jobId}.`);
      success(response, job);
      return;
    }

    const cancelMatch = path.match(/^\/api\/v2\/jobs\/([^/]+)\/cancel$/);
    if (request.method === 'POST' && cancelMatch) {
      const job = await this.jobHost.cancel(
        this.store,
        JobId.parse(cancelMatch[1]),
      );
      success(response, job);
      return;
    }

    const retryMatch = path.match(/^\/api\/v2\/jobs\/([^/]+)\/retry-draft$/);
    if (request.method === 'POST' && retryMatch) {
      const job = await this.store.getJob(JobId.parse(retryMatch[1]));
      if (!job)
        throw new V2ContractError('unknown-reference', 'Job does not exist.');
      const run = job.runId
        ? await this.store.getRun(job.bundleId, job.runId)
        : undefined;
      const failedCaseIds = new Set(
        run?.attempts
          .filter((attempt) =>
            ['failed', 'unsupported', 'cancelled', 'interrupted'].includes(
              attempt.result,
            ),
          )
          .map((attempt) => attempt.caseId) ?? [],
      );
      const cases = job.selection.cases.filter(
        (selected) =>
          failedCaseIds.size === 0 || failedCaseIds.has(selected.caseId),
      );
      success(
        response,
        selectionDraftFromSelectedCases(job.selection.prototypeId, cases),
      );
      return;
    }

    const bundleMatch = path.match(/^\/api\/v2\/bundles\/([^/]+)$/);
    if (request.method === 'GET' && bundleMatch) {
      const bundleId = BundleId.parse(bundleMatch[1]);
      const bundle = await this.store.getBundle(bundleId);
      if (!bundle)
        throw new V2ContractError(
          'unknown-reference',
          'Bundle does not exist.',
        );
      const activeSnapshot = await this.store.getActiveSnapshot(bundleId);
      if (!activeSnapshot) {
        throw new V2ContractError(
          'unknown-reference',
          'Bundle has no active Snapshot.',
        );
      }
      success(response, await this.evidenceDetails(bundleId, activeSnapshot));
      return;
    }

    const snapshotDetailsMatch = path.match(
      /^\/api\/v2\/bundles\/([^/]+)\/snapshots\/([^/]+)$/,
    );
    if (request.method === 'GET' && snapshotDetailsMatch) {
      const bundleId = BundleId.parse(snapshotDetailsMatch[1]);
      const snapshotId = SnapshotId.parse(snapshotDetailsMatch[2]);
      const snapshot = await this.store.getSnapshot(bundleId, snapshotId);
      if (!snapshot) {
        throw new V2ContractError(
          'unknown-reference',
          'Bundle Snapshot does not exist.',
        );
      }
      success(response, await this.evidenceDetails(bundleId, snapshot));
      return;
    }

    const staleDraftMatch = path.match(
      /^\/api\/v2\/bundles\/([^/]+)\/stale-draft$/,
    );
    if (request.method === 'POST' && staleDraftMatch) {
      const bundleId = BundleId.parse(staleDraftMatch[1]);
      const body = (await readBody(request)) as { reportId?: unknown };
      const reportId = StalenessReportId.parse(body.reportId);
      const report = (await this.store.listStalenessReports(bundleId)).find(
        (candidate) => candidate.reportId === reportId,
      );
      if (!report) {
        throw new V2ContractError(
          'unknown-reference',
          'Staleness Report does not exist.',
        );
      }
      const activeSnapshot = await this.store.getActiveSnapshot(bundleId);
      if (!activeSnapshot || activeSnapshot.snapshotId !== report.snapshotId) {
        throw new V2ContractError(
          'preflight-expired',
          'Staleness Report no longer describes the active Snapshot.',
        );
      }
      const bundle = await this.store.getBundle(bundleId);
      if (!bundle) {
        throw new V2ContractError(
          'unknown-reference',
          'Bundle does not exist.',
        );
      }
      const staleKeys = new Set(
        report.perRevision
          .filter((entry) => entry.stale)
          .map((entry) => `${entry.caseId}/${entry.scopeKey}`),
      );
      const cases = [
        ...new Map(
          (await this.store.listRuns(bundleId))
            .flatMap((run) => run.selection.cases)
            .filter((selected) =>
              staleKeys.has(
                `${selected.caseId}/${computeScopeKey(selected.captureScope)}`,
              ),
            )
            .map(
              (selected) =>
                [
                  `${selected.caseId}/${computeScopeKey(selected.captureScope)}`,
                  selected,
                ] as const,
            ),
        ).values(),
      ];
      if (cases.length === 0) {
        throw new V2ContractError(
          'invalid-schema',
          'Staleness Report has no stale Case/Scope to recapture.',
        );
      }
      success(
        response,
        selectionDraftFromSelectedCases(bundle.prototypeId, cases),
      );
      return;
    }

    const recaptureDraftMatch = path.match(
      /^\/api\/v2\/bundles\/([^/]+)\/recapture-draft$/,
    );
    if (request.method === 'POST' && recaptureDraftMatch) {
      const bundleId = BundleId.parse(recaptureDraftMatch[1]);
      const body = (await readBody(request)) as { caseId?: unknown };
      const activeSnapshot = await this.store.getActiveSnapshot(bundleId);
      const bundle = await this.store.getBundle(bundleId);
      if (!bundle || !activeSnapshot) {
        throw new V2ContractError(
          'unknown-reference',
          'Bundle or active Snapshot does not exist.',
        );
      }
      const activeCases = await selectedCasesForSnapshot(
        this.store,
        bundleId,
        activeSnapshot,
      );
      const selectedCases =
        typeof body.caseId === 'string'
          ? activeCases.filter((selected) => selected.caseId === body.caseId)
          : activeCases;
      if (selectedCases.length === 0) {
        throw new V2ContractError(
          'unknown-reference',
          'The requested active Case does not exist.',
        );
      }
      success(
        response,
        selectionDraftFromSelectedCases(bundle.prototypeId, selectedCases),
      );
      return;
    }

    const archiveMatch = path.match(/^\/api\/v2\/bundles\/([^/]+)\/archive$/);
    if (request.method === 'POST' && archiveMatch) {
      success(
        response,
        await this.store.archiveBundle(BundleId.parse(archiveMatch[1])),
      );
      return;
    }

    const forkMatch = path.match(/^\/api\/v2\/bundles\/([^/]+)\/fork$/);
    if (request.method === 'POST' && forkMatch) {
      const body = (await readBody(request)) as { snapshotId?: unknown };
      const result = await this.store.forkBundle({
        sourceBundleId: BundleId.parse(forkMatch[1]),
        sourceSnapshotId: SnapshotId.parse(body.snapshotId),
        bundleId: generateOperationalId('bundle') as BundleId,
      });
      success(response, result, 201);
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/staleness') {
      const body = (await readBody(request)) as {
        bundleId?: unknown;
        snapshotId?: unknown;
      };
      const bundleId = BundleId.parse(body.bundleId);
      const snapshotId = SnapshotId.parse(body.snapshotId);
      const snapshot = await this.store.getSnapshot(bundleId, snapshotId);
      if (!snapshot)
        throw new V2ContractError(
          'unknown-reference',
          'Snapshot does not exist.',
        );
      const run = await this.store.getRun(bundleId, snapshot.sourceRunId);
      if (!run)
        throw new V2ContractError(
          'unknown-reference',
          'Snapshot source Run does not exist.',
        );
      const activeCases = await selectedCasesForSnapshot(
        this.store,
        bundleId,
        snapshot,
      );
      const draft = selectionDraftFromSelectedCases(
        run.selection.prototypeId,
        activeCases,
      );
      let current: CapturePreflight | undefined;
      try {
        current = (await this.runPreflight(draft)).preflight;
      } catch (error) {
        if (
          !(error instanceof V2ContractError) ||
          error.code !== 'unknown-reference'
        ) {
          throw error;
        }
      }
      const dependencyDigests: Record<string, string> = current
        ? { [`manifest:${run.selection.prototypeId}`]: current.manifestDigest }
        : {};
      if (current) {
        for (const selected of activeCases) {
          dependencyDigests[`runtime:${selected.caseKey.screenId}`] =
            current.inputVersion;
        }
      }
      success(
        response,
        await this.store.createStalenessReport({
          bundleId,
          snapshotId,
          inputVersion: current?.inputVersion ?? 'authored-reference-removed',
          currentDependencyDigests: dependencyDigests,
        }),
        201,
      );
      return;
    }

    if (
      request.method === 'POST' &&
      (path === '/api/v2/handoffs/preview' || path === '/api/v2/handoffs')
    ) {
      const body = (await readBody(request)) as HandoffPreviewRequest;
      const bundleId = BundleId.parse(body.bundleId);
      const snapshotId = SnapshotId.parse(body.snapshotId);
      const operationKey = body.operationKey
        ? LifecycleOperationKey.parse(body.operationKey)
        : undefined;
      const acknowledgedRiskKinds = RiskKind.array().parse(
        body.acknowledgedRiskKinds,
      );
      const requestDigest = operationKey
        ? operationRequestDigest({
            bundleId,
            snapshotId,
            implementationIntent: body.implementationIntent ?? '',
            acknowledgedRiskKinds: [...acknowledgedRiskKinds].sort(),
          })
        : undefined;
      if (
        body.operationRequestDigest &&
        OperationRequestDigest.parse(body.operationRequestDigest) !==
          requestDigest
      ) {
        throw new V2ContractError(
          'idempotency-conflict',
          `Handoff operation ${operationKey} request changed after confirmation.`,
        );
      }
      if (operationKey && !path.endsWith('/preview')) {
        const existing = await this.store.findHandoffByOperationKey(operationKey);
        if (existing) {
          if (existing.operationRequestDigest !== requestDigest) {
            throw new V2ContractError(
              'idempotency-conflict',
              `Handoff operation ${operationKey} was already created with different input.`,
              { handoffId: existing.handoffId },
            );
          }
          await this.updateFinalizationOperation(operationKey, (operation) =>
            operation.kind === 'finalizing'
              ? { ...operation, handoffId: existing.handoffId }
              : operation,
          );
          success(response, { handoff: existing, persisted: true }, 200);
          return;
        }
      }
      const snapshot = await this.store.getSnapshot(bundleId, snapshotId);
      if (!snapshot)
        throw new V2ContractError(
          'unknown-reference',
          'Snapshot does not exist.',
        );
      const run = await this.store.getRun(bundleId, snapshot.sourceRunId);
      if (!run)
        throw new V2ContractError(
          'unknown-reference',
          'Snapshot source Run does not exist.',
        );
      const activeCases = await selectedCasesForSnapshot(
        this.store,
        bundleId,
        snapshot,
      );
      let current: CapturePreflight | undefined;
      try {
        current = (
          await this.runPreflight(
            selectionDraftFromSelectedCases(
              run.selection.prototypeId,
              activeCases,
            ),
          )
        ).preflight;
      } catch (error) {
        if (
          !(error instanceof V2ContractError) ||
          error.code !== 'unknown-reference'
        ) {
          throw error;
        }
      }
      const interactionCoverage = current
        ? {
            required: current.interactionCoverage.required,
            captured: current.interactionCoverage.selected,
            missingScenarioIds:
              current.interactionCoverage.missingScenarioIds,
          }
        : {
            required: 1,
            captured: 0,
            missingScenarioIds: ['authored-reference-removed'],
          };
      const dependencyDigests: Record<string, string> = current
        ? { [`manifest:${run.selection.prototypeId}`]: current.manifestDigest }
        : {};
      if (current) {
        for (const selected of activeCases) {
          dependencyDigests[`runtime:${selected.caseKey.screenId}`] =
            current.inputVersion;
        }
      }
      const report = await this.store.createStalenessReport({
        bundleId,
        snapshotId,
        inputVersion: current?.inputVersion ?? 'authored-reference-removed',
        currentDependencyDigests: dependencyDigests,
      });
      const evaluation = await evaluateAgentHandoff({
        store: this.store,
        bundleId,
        snapshotId,
        selectedCases: run.selection.cases,
        stalenessReport: report,
        interactionCoverage,
      });
      if (path.endsWith('/preview')) {
        success(response, {
          ...evaluation,
          persisted: false,
        });
        return;
      }
      const handoff = await createAgentHandoff({
        store: this.store,
        bundleId,
        snapshotId,
        selectedCases: run.selection.cases,
        stalenessReport: report,
        currentInputVersion:
          current?.inputVersion ?? 'authored-reference-removed',
        interactionCoverage,
        ...(body.implementationIntent
          ? { implementationIntent: body.implementationIntent }
          : {}),
        acknowledgedRiskKinds,
        ...(operationKey && requestDigest
          ? { operationKey, operationRequestDigest: requestDigest }
          : {}),
      });
      if (operationKey) {
        await this.updateFinalizationOperation(operationKey, (operation) =>
          operation.kind === 'finalizing'
            ? { ...operation, handoffId: handoff.handoffId }
            : operation,
        );
      }
      success(response, { handoff, persisted: true }, 201);
      return;
    }

    const deliveryMatch = path.match(/^\/api\/v2\/deliveries\/([^/]+)$/);
    if (request.method === 'GET' && deliveryMatch) {
      const deliveryId = decodeURIComponent(deliveryMatch[1]!);
      if (!deliveryId || /[\\/]/.test(deliveryId)) {
        throw new V2ContractError(
          'invalid-schema',
          'deliveryId must be a single path segment.',
        );
      }
      const deliveryDir = pathJoin(
        deliveryRootFromStoreRoot(this.options.storeRoot),
        deliveryId,
      );
      let receiptRaw: string;
      let agentPrompt: string;
      try {
        [receiptRaw, agentPrompt] = await Promise.all([
          readFile(pathJoin(deliveryDir, 'receipt.json'), 'utf8'),
          readFile(pathJoin(deliveryDir, 'agent-prompt.md'), 'utf8'),
        ]);
      } catch {
        throw new V2ContractError(
          'unknown-reference',
          `Delivery ${deliveryId} does not exist or is incomplete.`,
        );
      }
      const receipt = JSON.parse(receiptRaw) as DeliveryListItem;
      const detail: DeliveryDetail = {
        deliveryId,
        bundleId: receipt.bundleId,
        snapshotId: receipt.snapshotId,
        handoffId: receipt.handoffId,
        createdAt: receipt.createdAt,
        agentPromptPath: receipt.agentPromptPath,
        receiptPath: receipt.receiptPath,
        ...(receipt.freshnessStatus
          ? { freshnessStatus: receipt.freshnessStatus }
          : {}),
        agentPrompt,
      };
      success(response, detail);
      return;
    }

    if (request.method === 'GET' && path === '/api/v2/deliveries') {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const bundleFilter = url.searchParams.get('bundleId')?.trim() || undefined;
      const deliveryRoot = deliveryRootFromStoreRoot(this.options.storeRoot);
      let entries: string[] = [];
      try {
        entries = await readdir(deliveryRoot);
      } catch {
        success(response, { deliveries: [] as DeliveryListItem[] });
        return;
      }
      const deliveries: DeliveryListItem[] = [];
      for (const entry of entries) {
        if (entry === 'latest.json' || entry.includes('.')) continue;
        try {
          const receiptRaw = await readFile(
            pathJoin(deliveryRoot, entry, 'receipt.json'),
            'utf8',
          );
          const receipt = JSON.parse(receiptRaw) as {
            deliveryId?: string;
            bundleId?: string;
            snapshotId?: string;
            handoffId?: string;
            createdAt?: string;
            agentPromptPath?: string;
            receiptPath?: string;
            freshnessStatus?: 'fresh' | 'stale';
            source?: unknown;
          };
          if (!receipt.deliveryId || !receipt.bundleId || !receipt.snapshotId) {
            continue;
          }
          if (bundleFilter && receipt.bundleId !== bundleFilter) continue;
          deliveries.push({
            deliveryId: receipt.deliveryId,
            bundleId: receipt.bundleId,
            snapshotId: receipt.snapshotId,
            handoffId: receipt.handoffId ?? '',
            createdAt: receipt.createdAt ?? '',
            agentPromptPath: receipt.agentPromptPath ?? '',
            receiptPath: receipt.receiptPath ?? '',
            ...(receipt.freshnessStatus
              ? { freshnessStatus: receipt.freshnessStatus }
              : {}),
            ...(receipt.source === 'cli' || receipt.source === 'gui'
              ? { source: receipt.source }
              : {}),
          });
        } catch {
          // Skip corrupt / partial delivery folders.
        }
      }
      deliveries.sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
      success(response, { deliveries });
      return;
    }

    if (request.method === 'POST' && path === '/api/v2/deliveries') {
      const body = (await readBody(request)) as CreateDeliveryRequest;
      const operationKey = body.operationKey
        ? LifecycleOperationKey.parse(body.operationKey)
        : undefined;
      if (
        (operationKey === undefined) !==
        (body.operationRequestDigest === undefined)
      ) {
        throw new V2ContractError(
          'invalid-schema',
          'operationKey and operationRequestDigest must be supplied together.',
        );
      }
      const create = async () => {
        const handoffId = HandoffId.parse(body.handoffId);
        const handoff = await this.store.getHandoff(handoffId);
        if (!handoff) {
          throw new V2ContractError(
            'unknown-reference',
            `Handoff ${handoffId} does not exist.`,
          );
        }
        if (operationKey && handoff.operationKey !== operationKey) {
          throw new V2ContractError(
            'idempotency-conflict',
            'Delivery operation key does not match its fixed Handoff.',
          );
        }
        const targetRoot = await assertDeliveryTargetRootMatch(
          this.options.deliveryTargetRoot,
          body.targetRoot,
        );
        const overwriteDeliveryId = body.overwriteDeliveryId?.trim();
        if (overwriteDeliveryId && /[\\/]/.test(overwriteDeliveryId)) {
          throw new V2ContractError(
            'invalid-schema',
            'overwriteDeliveryId must be a single path segment.',
          );
        }
        const acceptedWarningIds = [...new Set(body.acceptedWarningIds ?? [])].sort();
        const acknowledgedRiskKinds = [...new Set(body.acknowledgedRiskKinds ?? [])].sort();
        const requestDigest = operationKey
          ? operationRequestDigest({
              handoffId,
              targetRoot,
              implementationIntent: body.implementationIntent ?? '',
              runId: body.runId ?? '',
              acceptedWarningIds,
              acknowledgedRiskKinds,
            })
          : undefined;
        if (
          body.operationRequestDigest &&
          OperationRequestDigest.parse(body.operationRequestDigest) !==
            requestDigest
        ) {
          throw new V2ContractError(
            'idempotency-conflict',
            `Delivery operation ${operationKey} request changed after confirmation.`,
          );
        }
        const receipt = await writeDeliveryReceipt({
          storeRoot: this.options.storeRoot,
          targetRoot,
          handoff,
          source: 'gui',
          ...(body.runId ? { runId: body.runId } : {}),
          acceptedWarningIds,
          acknowledgedRiskKinds,
          ...(body.implementationIntent
            ? { implementationIntent: body.implementationIntent }
            : {}),
          ...(overwriteDeliveryId ? { overwriteDeliveryId } : {}),
          ...(operationKey && requestDigest
            ? { operationKey, operationRequestDigest: requestDigest }
            : {}),
        });
        if (operationKey) {
          await this.updateFinalizationOperation(operationKey, (operation) =>
            operation.kind === 'finalizing'
              ? { ...operation, deliveryId: receipt.deliveryId }
              : operation,
          );
        }
        success(
          response,
          {
            deliveryId: receipt.deliveryId,
            agentPrompt: await readFile(receipt.agentPromptPath, 'utf8'),
            agentPromptPath: receipt.agentPromptPath,
            acceptanceContractPath: receipt.acceptanceContractPath,
            acceptanceChecklistPath: receipt.acceptanceChecklistPath,
            evidenceBriefPath: receipt.evidenceBriefPath,
            reviewIndexPath: receipt.reviewIndexPath,
            screenshotCount: receipt.screenshotCount,
            receiptPath: receipt.receiptPath,
            handoffId: receipt.handoffId,
            bundleId: receipt.bundleId,
            snapshotId: receipt.snapshotId,
          },
          overwriteDeliveryId ? 200 : 201,
        );
      };
      if (operationKey) {
        await this.withOperationLock(`operation:${operationKey}`, create);
      } else {
        await create();
      }
      return;
    }

    const blobMatch = path.match(/^\/api\/v2\/blobs\/([^/]+)\/([^/]+)$/);
    if (request.method === 'GET' && blobMatch) {
      const blob = await this.store.getBlob(
        BundleId.parse(blobMatch[1]),
        BlobId.parse(blobMatch[2]),
      );
      if (!blob)
        throw new V2ContractError('unknown-reference', 'Blob does not exist.');
      response.writeHead(200, {
        'Content-Type': blob.record.mediaType,
        'Content-Length': String(blob.bytes.byteLength),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(Buffer.from(blob.bytes));
      return;
    }

    failure(
      response,
      404,
      'unknown-reference',
      'Local Service route does not exist.',
    );
  }
}
