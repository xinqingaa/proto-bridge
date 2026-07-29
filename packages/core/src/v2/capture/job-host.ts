import type { BundleId, JobId } from '../contracts/ids.js';
import type { CaptureJob } from '../contracts/job.js';
import { isTerminalJobStatus } from '../contracts/vocabulary.js';
import type { V2Store } from '../store/types.js';
import type { CaseCaptureDriver } from './playwright-driver.js';
import type { CapturePreflight } from './preflight.js';
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
};

export type AcceptedCaptureJob = {
  job: CaptureJob;
  completion: Promise<CaptureOrchestratorResult>;
};

/**
 * Process-local executor for durably persisted Capture Jobs. Job identity
 * and recovery stay in Store; this host only owns live AbortControllers.
 */
export class CaptureJobHost {
  private readonly controllers = new Map<JobId, AbortController>();
  private readonly completions = new Map<
    JobId,
    Promise<CaptureOrchestratorResult>
  >();

  async accept(input: AcceptCaptureJobInput): Promise<AcceptedCaptureJob> {
    const job = await input.store.createJob({
      bundleId: input.bundleId,
      selection: input.preflight.selection,
      inputVersion: input.preflight.inputVersion,
    });
    const controller = new AbortController();
    this.controllers.set(job.jobId, controller);
    const completion = capturePreflightToStore({
      ...input,
      jobId: job.jobId,
      signal: controller.signal,
    }).finally(() => {
      this.controllers.delete(job.jobId);
      this.completions.delete(job.jobId);
    });
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
    if (controller) {
      controller.abort();
      return job;
    }
    return store.finalizeJob(jobId, 'cancelled');
  }

  completion(jobId: JobId): Promise<CaptureOrchestratorResult> | undefined {
    return this.completions.get(jobId);
  }
}
