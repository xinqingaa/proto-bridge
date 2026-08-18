import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir, rm } from 'node:fs/promises';
import { join as pathJoin } from 'node:path';
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
  compileReconstructionObligations,
  type ReviewProviderFailure,
  type ReviewProviderSessionReceipt,
  type ReviewSession,
} from '@proto-bridge/core/review';
import {
  LOCAL_SERVICE_PROTOCOL_VERSION,
  type BundleEvidenceDetails,
  type CaptureConsoleState,
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
  private readonly jobHost = new CaptureJobHost();
  private server: Server | undefined;
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
    if (session.providerSession?.sessionIdentityDigest === providerSession.sessionIdentityDigest) return;
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

    if (request.method === 'GET' && path === '/api/v2/console') {
      const bundles = await this.store.listBundles();
      const state: CaptureConsoleState = {
        workspaceId: this.store.workspaceId,
        generationId: this.currentGenerationId,
        bundles: await Promise.all(
          bundles.map(async (bundle) => {
            const activeSnapshot = await this.store.getActiveSnapshot(
              bundle.bundleId,
            );
            const snapshotIds = await this.store.listSnapshotIds(
              bundle.bundleId,
            );
            const snapshots = (
              await Promise.all(
                snapshotIds.map((snapshotId) =>
                  this.store.getSnapshot(bundle.bundleId, snapshotId),
                ),
              )
            ).filter(
              (snapshot): snapshot is BundleSnapshot => snapshot !== undefined,
            );
            return {
              bundle,
              snapshots,
              ...(activeSnapshot ? { activeSnapshot } : {}),
            };
          }),
        ),
        jobs: await this.store.listJobs(),
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
      const requiredObligations = compileReconstructionObligations(
        (await buildAcceptanceContractFromStore({ store: this.store, handoff })).contract,
      );
      if (body.seed.obligationContractVersion !== 1 || body.seed.verificationContractVersion !== 1 || JSON.stringify(body.seed.requiredObligations) !== JSON.stringify(requiredObligations)) {
        throw new V2ContractError('invalid-schema', 'Review seed obligations do not match the fixed Handoff Acceptance Contract.');
      }
      success(response, await this.reviews.start(body.seed), 201);
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
      success(response, await this.reviews.append({ reviewRunId, actor: approval.actor, payload: { kind: 'human-finalized', confirmationRef: approval.confirmationRef, decision: 'complete' } }), 201);
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
      const record = this.preflights.get(body.preflightId);
      if (!record || Date.parse(record.expiresAt) <= Date.now()) {
        throw new V2ContractError(
          'preflight-expired',
          'Preflight expired; run it again before creating a Job.',
        );
      }
      const acceptedWarningIds = [
        ...new Set(body.acceptedWarningIds ?? []),
      ].sort();
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
      const bundleId = body.bundleId
        ? BundleId.parse(body.bundleId)
        : (generateOperationalId('bundle') as BundleId);
      const accepted = await this.jobHost.accept({
        store: this.store,
        bundleId,
        preflight: refreshed,
        runtimeBaseUrl: this.options.runtimeBaseUrl,
        driver:
          this.options.driverFactory?.() ?? new PlaywrightCaseCaptureDriver(),
      });
      success(response, { job: accepted.job }, 202);
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
        acknowledgedRiskKinds: RiskKind.array().parse(
          body.acknowledgedRiskKinds,
        ),
      });
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
      const handoffId = HandoffId.parse(body.handoffId);
      const handoff = await this.store.getHandoff(handoffId);
      if (!handoff) {
        throw new V2ContractError(
          'unknown-reference',
          `Handoff ${handoffId} does not exist.`,
        );
      }
      const targetRoot = String(body.targetRoot ?? '').trim();
      if (!targetRoot) {
        throw new V2ContractError(
          'invalid-schema',
          'deliveries require targetRoot.',
        );
      }
      const overwriteDeliveryId = body.overwriteDeliveryId?.trim();
      if (overwriteDeliveryId && /[\\/]/.test(overwriteDeliveryId)) {
        throw new V2ContractError(
          'invalid-schema',
          'overwriteDeliveryId must be a single path segment.',
        );
      }
      const receipt = await writeDeliveryReceipt({
        storeRoot: this.options.storeRoot,
        targetRoot,
        handoff,
        source: 'gui',
        ...(body.runId ? { runId: body.runId } : {}),
        acceptedWarningIds: body.acceptedWarningIds ?? [],
        acknowledgedRiskKinds: body.acknowledgedRiskKinds ?? [],
        ...(body.implementationIntent
          ? { implementationIntent: body.implementationIntent }
          : {}),
        ...(overwriteDeliveryId ? { overwriteDeliveryId } : {}),
      });
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
