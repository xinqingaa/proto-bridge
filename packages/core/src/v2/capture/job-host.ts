import type { BundleId, JobId } from '../contracts/ids.js';
import type { CaptureJob } from '../contracts/job.js';
import { isTerminalJobStatus } from '../contracts/vocabulary.js';
import type { V2Store } from '../store/types.js';
import type { CaseCaptureDriver } from './playwright-driver.js';
import type { CapturePreflight } from './preflight.js';
import type {
  LifecycleOperationKey,
  OperationRequestDigest,
} from '../contracts/prototype-lifecycle.js';
import {
  capturePreflightToStore,
  type CaptureOrchestratorResult,
} from './orchestrator.js';

export type AcceptCaptureJobInput = {
  store: V2Store;
  bundleId: BundleId;
  preflight: CapturePreflight;
  runtimeBaseUrl: string;
  driver: CaseCaptureDriver;
  operationKey?: LifecycleOperationKey;
  operationRequestDigest?: OperationRequestDigest;
};

export type AcceptedCaptureJob = {
  job: CaptureJob;
  completion: Promise<CaptureOrchestratorResult>;
};

/**
 * One execution queue per Workspace writer (a `V2Store` instance owns the
 * Workspace writer lock). Shared by every host in the process so two Jobs
 * can never run, and commit, against the same Workspace concurrently.
 */
const workspaceQueues = new WeakMap<V2Store, Promise<void>>();

/**
 * Process-local executor for durably persisted Capture Jobs. Job identity
 * and recovery stay in Store; this host only owns live AbortControllers and
 * the Workspace single-flight queue. Accepted Jobs stay `queued` in Store
 * until the previous Job of the Workspace is terminal.
 */
export class CaptureJobHost {
  private readonly controllers = new Map<JobId, AbortController>();
  private readonly completions = new Map<
    JobId,
    Promise<CaptureOrchestratorResult>
  >();
  private readonly started = new Set<JobId>();
  private readonly cancelledBeforeStart = new Set<JobId>();

  async accept(input: AcceptCaptureJobInput): Promise<AcceptedCaptureJob> {
    const job = await input.store.createJob({
      bundleId: input.bundleId,
      selection: input.preflight.selection,
      inputVersion: input.preflight.inputVersion,
      ...(input.operationKey
        ? {
            operationKey: input.operationKey,
            operationRequestDigest: input.operationRequestDigest,
          }
        : {}),
    });
    const controller = new AbortController();
    this.controllers.set(job.jobId, controller);
    const previous = workspaceQueues.get(input.store) ?? Promise.resolve();
    const completion = previous
      .then(() => {
        if (this.cancelledBeforeStart.has(job.jobId)) {
          throw new Error(`Capture Job ${job.jobId} was cancelled before it started.`);
        }
        this.started.add(job.jobId);
        return capturePreflightToStore({
          ...input,
          jobId: job.jobId,
          signal: controller.signal,
        });
      })
      .finally(() => {
        this.controllers.delete(job.jobId);
        this.completions.delete(job.jobId);
        this.started.delete(job.jobId);
        this.cancelledBeforeStart.delete(job.jobId);
      });
    workspaceQueues.set(
      input.store,
      completion.then(
        () => undefined,
        () => undefined,
      ),
    );
    this.completions.set(job.jobId, completion);
    // The Service observes the completion through Store state. Prevent a
    // detached background rejection from becoming an unhandled process error.
    void completion.catch(() => undefined);
    return { job, completion };
  }

  async cancel(store: V2Store, jobId: JobId): Promise<CaptureJob> {
    const job = await store.getJob(jobId);
    if (!job) throw new Error(`Capture Job ${jobId} does not exist.`);
    if (isTerminalJobStatus(job.status)) return job;
    const controller = this.controllers.get(jobId);
    if (controller && this.started.has(jobId)) {
      controller.abort();
      return job;
    }
    if (controller) {
      this.cancelledBeforeStart.add(jobId);
      controller.abort();
    }
    return store.finalizeJob(jobId, 'cancelled');
  }

  completion(jobId: JobId): Promise<CaptureOrchestratorResult> | undefined {
    return this.completions.get(jobId);
  }
}
