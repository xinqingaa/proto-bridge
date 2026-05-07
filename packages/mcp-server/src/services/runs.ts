import type { GeneratedRun, MigrationContext } from '../types.js';
import { outputSlug } from './page-input.js';

export class RunStore {
  private readonly runs = new Map<string, GeneratedRun>();

  add(run: GeneratedRun): void {
    this.runs.set(run.id, run);
  }

  get(runId: string): GeneratedRun | undefined {
    return this.runs.get(runId);
  }

  require(runId: string): GeneratedRun {
    const run = this.get(runId);
    if (!run) throw new Error(`Unknown runId: ${runId}`);
    return run;
  }

  values(): GeneratedRun[] {
    return [...this.runs.values()];
  }
}

export function createRunId(context: MigrationContext): string {
  const slug = outputSlug(context.source.route, context.source.vueRelativePath ?? context.source.vuePath);
  return `${slug}-${Date.now().toString(36)}`;
}
