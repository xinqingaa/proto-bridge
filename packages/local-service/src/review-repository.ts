import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createReviewEvent,
  reduceReviewEvents,
  type ReviewActor,
  type ReviewArtifact,
  type ReviewEvent,
  type ReviewEventPayload,
  type ReviewSession,
  type ReviewSessionSeed,
} from '@proto-bridge/core/review';
import { V2ContractError } from '@proto-bridge/core/v2';
import { generateOperationalId } from '@proto-bridge/core/v2/store';

const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

type OpenReview = {
  release: () => Promise<void>;
  queue: Promise<unknown>;
};

export class ReviewRepository {
  private readonly openReviews = new Map<string, OpenReview>();

  constructor(
    private readonly root: string,
    private readonly workspaceId: string,
    private readonly generation: () => string | 'legacy-unavailable',
  ) {}

  async start(seed: ReviewSessionSeed): Promise<ReviewSession> {
    this.assertSeed(seed);
    const directory = this.runDirectory(seed.reviewRunId);
    await mkdir(directory, { recursive: true });
    const eventsPath = path.join(directory, 'events.ndjson');
    try {
      await readFile(eventsPath, 'utf8');
      throw new V2ContractError('review-already-exists', `Review ${seed.reviewRunId} already exists.`);
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    await this.ensureOpen(seed.reviewRunId);
    const event = createReviewEvent({
      eventId: generateOperationalId('review-event'),
      previousEventDigest: null,
      at: new Date().toISOString(),
      actor: 'operator',
      payload: { kind: 'session-started', seed },
    });
    await writeFile(eventsPath, `${JSON.stringify(event)}\n`, { flag: 'wx' });
    return this.persistDerived(seed.reviewRunId, [event]);
  }

  async read(reviewRunId: string): Promise<ReviewSession> {
    const events = await this.readEvents(reviewRunId);
    const session = reduceReviewEvents(events, { generationId: this.generation() });
    this.assertSeed(session);
    return session;
  }

  async append(input: {
    reviewRunId: string;
    actor: ReviewActor;
    tool?: string;
    payload: ReviewEventPayload;
  }): Promise<ReviewSession> {
    const opened = await this.ensureOpen(input.reviewRunId);
    const operation = opened.queue.then(async () => {
      const events = await this.readEvents(input.reviewRunId);
      const current = reduceReviewEvents(events, { generationId: this.generation() });
      const event = createReviewEvent({
        eventId: generateOperationalId('review-event'),
        previousEventDigest: current.eventHeadDigest,
        at: new Date().toISOString(),
        actor: input.actor,
        ...(input.tool === undefined ? {} : { tool: input.tool }),
        payload: input.payload,
      });
      const next = [...events, event];
      const session = reduceReviewEvents(next, { generationId: this.generation() });
      const handle = await open(path.join(this.runDirectory(input.reviewRunId), 'events.ndjson'), 'a');
      try {
        await handle.writeFile(`${JSON.stringify(event)}\n`);
        await handle.sync();
      } finally {
        await handle.close();
      }
      return this.persistDerived(input.reviewRunId, next, session);
    });
    opened.queue = operation.catch(() => undefined);
    return operation as Promise<ReviewSession>;
  }

  async putArtifact(reviewRunId: string, artifact: ReviewArtifact, bytes: Uint8Array): Promise<string> {
    await this.ensureOpen(reviewRunId);
    const actual = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (actual !== artifact.digest || bytes.byteLength !== artifact.byteLength) {
      throw new V2ContractError('review-artifact-digest-mismatch', 'Review artifact bytes do not match the declared digest/length.');
    }
    const artifactPath = path.join(this.runDirectory(reviewRunId), 'artifacts', `${actual.slice('sha256:'.length)}.bin`);
    await mkdir(path.dirname(artifactPath), { recursive: true });
    try {
      await writeFile(artifactPath, bytes, { flag: 'wx' });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error;
      const existing = await readFile(artifactPath);
      if (!existing.equals(Buffer.from(bytes))) throw new V2ContractError('review-artifact-digest-mismatch', 'Existing Review artifact content conflicts with its digest.');
    }
    return artifactPath;
  }

  async getArtifact(reviewRunId: string, digest: string): Promise<Uint8Array> {
    this.assertRunId(reviewRunId);
    if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new V2ContractError('invalid-schema', 'Review artifact digest must be sha256.');
    try {
      return await readFile(path.join(this.runDirectory(reviewRunId), 'artifacts', `${digest.slice('sha256:'.length)}.bin`));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') throw new V2ContractError('unknown-reference', `Unknown Review artifact ${digest}.`);
      throw error;
    }
  }

  async close(): Promise<string[]> {
    const ids = [...this.openReviews.keys()].sort();
    await Promise.all([...this.openReviews.values()].map((item) => item.release()));
    this.openReviews.clear();
    return ids;
  }

  private async persistDerived(reviewRunId: string, events: ReviewEvent[], derived?: ReviewSession): Promise<ReviewSession> {
    const session = derived ?? reduceReviewEvents(events, { generationId: this.generation() });
    const destination = path.join(this.runDirectory(reviewRunId), 'session.json');
    const temporary = `${destination}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(session, null, 2)}\n`);
    await rename(temporary, destination);
    return session;
  }

  private async readEvents(reviewRunId: string): Promise<ReviewEvent[]> {
    this.assertRunId(reviewRunId);
    let raw: string;
    try {
      raw = await readFile(path.join(this.runDirectory(reviewRunId), 'events.ndjson'), 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new V2ContractError('unknown-reference', `Unknown Review ${reviewRunId}.`);
      }
      throw error;
    }
    try {
      return raw.split('\n').filter(Boolean).map((line) => JSON.parse(line) as ReviewEvent);
    } catch {
      throw new V2ContractError('review-event-log-corrupt', `Review ${reviewRunId} event log is not valid NDJSON.`);
    }
  }

  private async ensureOpen(reviewRunId: string): Promise<OpenReview> {
    this.assertRunId(reviewRunId);
    const existing = this.openReviews.get(reviewRunId);
    if (existing) return existing;
    const directory = this.runDirectory(reviewRunId);
    await mkdir(directory, { recursive: true });
    const lockPath = path.join(directory, 'writer.lock');
    let handle;
    try {
      handle = await open(lockPath, 'wx');
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
        let holderPid: number | undefined;
        try {
          const holder = JSON.parse(await readFile(lockPath, 'utf8')) as { pid?: unknown };
          if (typeof holder.pid === 'number') holderPid = holder.pid;
        } catch {
          // An unreadable lock is stale only when it cannot identify a live writer.
        }
        if (holderPid !== undefined && isProcessAlive(holderPid)) {
          throw new V2ContractError('writer-lock-held', `Review ${reviewRunId} already has a writer.`);
        }
        await rm(lockPath, { force: true });
        handle = await open(lockPath, 'wx');
      }
      if (!handle) throw error;
    }
    await handle.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
    await handle.close();
    const opened: OpenReview = {
      queue: Promise.resolve(),
      release: async () => rm(lockPath, { force: true }),
    };
    this.openReviews.set(reviewRunId, opened);
    return opened;
  }

  private assertSeed(seed: Pick<ReviewSessionSeed, 'workspaceId' | 'generationId' | 'reviewRunId'>): void {
    this.assertRunId(seed.reviewRunId);
    if (seed.workspaceId !== this.workspaceId) throw new V2ContractError('workspace-mismatch', 'Review belongs to another Workspace.');
    if (seed.generationId !== this.generation()) throw new V2ContractError('workspace-generation-mismatch', 'Review belongs to another Workspace generation.');
  }

  private assertRunId(reviewRunId: string): void {
    if (!RUN_ID.test(reviewRunId)) throw new V2ContractError('invalid-schema', 'Review run ID is not a safe path segment.');
  }

  private runDirectory(reviewRunId: string): string {
    return path.join(this.root, reviewRunId);
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
