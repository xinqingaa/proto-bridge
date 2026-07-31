import { randomBytes } from 'node:crypto';
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
  generateOperationalId,
  writeDeliveryReceipt,
  type V2Store,
} from '@proto-bridge/core/v2/store';
import {
  LOCAL_SERVICE_PROTOCOL_VERSION,
  type BundleEvidenceDetails,
  type CaptureConsoleState,
  type CreateDeliveryRequest,
  type CreateJobRequest,
  type CreatePreflightRequest,
  type HandoffPreviewRequest,
  type LocalServiceSession,
  type StoredPreflight,
} from '@proto-bridge/core/v2/service-contract';

const BODY_LIMIT_BYTES = 1024 * 1024;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type PreflightRecord = StoredPreflight & {
  draft: SelectionDraft;
};

type SessionRecord = {
  expiresAt: number;
};

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
  if (code === 'unauthorized') return 401;
  if (code === 'unknown-reference') return 404;
  if (code === 'preflight-expired') return 409;
  if (code === 'writer-lock-held') return 409;
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
  readonly store: V2Store;
  private readonly options: Required<
    Pick<LocalServiceOptions, 'host' | 'port' | 'preflightTtlMs'>
  > &
    LocalServiceOptions;
  private readonly allowedOrigins: Set<string>;
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly preflights = new Map<string, PreflightRecord>();
  private readonly jobHost = new CaptureJobHost();
  private server: Server | undefined;
  private finalizedOrphanJobIds: string[] = [];

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
  }

  async start(): Promise<{ host: string; port: number }> {
    if (this.server) throw new Error('Local Service is already started.');
    const initialized = await this.store.init();
    this.finalizedOrphanJobIds = initialized.finalizedOrphanJobs;
    this.server = createServer((request, response) => {
      void this.handle(request, response).catch((error: unknown) => {
        const code =
          error instanceof V2ContractError ? error.code : 'internal-error';
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
    await this.store.close();
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

    if (request.method === 'POST' && path === '/api/v2/session') {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + SESSION_TTL_MS;
      this.sessions.set(token, { expiresAt });
      const session: LocalServiceSession = {
        protocolVersion: LOCAL_SERVICE_PROTOCOL_VERSION,
        serviceInstanceId: this.serviceInstanceId,
        sessionToken: token,
        workspaceId: this.store.workspaceId,
        expiresAt: new Date(expiresAt).toISOString(),
        finalizedOrphanJobIds: this.finalizedOrphanJobIds,
      };
      success(response, session, 201);
      return;
    }

    this.requireSession(request);

    if (request.method === 'GET' && path === '/api/v2/console') {
      const bundles = await this.store.listBundles();
      const state: CaptureConsoleState = {
        workspaceId: this.store.workspaceId,
        bundles: await Promise.all(
          bundles.map(async (bundle) => ({
            bundle,
            ...((await this.store.getActiveSnapshot(bundle.bundleId))
              ? {
                  activeSnapshot: (await this.store.getActiveSnapshot(
                    bundle.bundleId,
                  ))!,
                }
              : {}),
          })),
        ),
        jobs: await this.store.listJobs(),
      };
      success(response, state);
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
      const current = (await this.runPreflight(draft)).preflight;
      const dependencyDigests: Record<string, string> = {
        [`manifest:${run.selection.prototypeId}`]: current.manifestDigest,
      };
      for (const selected of activeCases) {
        dependencyDigests[`runtime:${selected.caseKey.screenId}`] =
          current.inputVersion;
      }
      success(
        response,
        await this.store.createStalenessReport({
          bundleId,
          snapshotId,
          inputVersion: current.inputVersion,
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
      const current = (
        await this.runPreflight(
          selectionDraftFromSelectedCases(
            run.selection.prototypeId,
            activeCases,
          ),
        )
      ).preflight;
      const dependencyDigests: Record<string, string> = {
        [`manifest:${run.selection.prototypeId}`]: current.manifestDigest,
      };
      for (const selected of activeCases) {
        dependencyDigests[`runtime:${selected.caseKey.screenId}`] =
          current.inputVersion;
      }
      const report = await this.store.createStalenessReport({
        bundleId,
        snapshotId,
        inputVersion: current.inputVersion,
        currentDependencyDigests: dependencyDigests,
      });
      const evaluation = await evaluateAgentHandoff({
        store: this.store,
        bundleId,
        snapshotId,
        selectedCases: run.selection.cases,
        stalenessReport: report,
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
        currentInputVersion: current.inputVersion,
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
      });
      success(
        response,
        {
          deliveryId: receipt.deliveryId,
          agentPromptPath: receipt.agentPromptPath,
          receiptPath: receipt.receiptPath,
          handoffId: receipt.handoffId,
          bundleId: receipt.bundleId,
          snapshotId: receipt.snapshotId,
        },
        201,
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
