import type { GeneratedRun, GeneratedSnapshot, GeneratedUiPlan, MigrationContext } from '../types.js';
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

export class SnapshotStore {
  private readonly snapshots = new Map<string, GeneratedSnapshot>();

  add(snapshot: GeneratedSnapshot): void {
    this.snapshots.set(snapshot.id, snapshot);
  }

  get(snapshotId: string): GeneratedSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  require(snapshotId: string): GeneratedSnapshot {
    const snapshot = this.get(snapshotId);
    if (!snapshot) throw new Error(`Unknown snapshotId: ${snapshotId}`);
    return snapshot;
  }

  values(): GeneratedSnapshot[] {
    return [...this.snapshots.values()];
  }
}

export class UiPlanStore {
  private readonly plans = new Map<string, GeneratedUiPlan>();

  add(plan: GeneratedUiPlan): void {
    this.plans.set(plan.id, plan);
  }

  get(planId: string): GeneratedUiPlan | undefined {
    return this.plans.get(planId);
  }

  require(planId: string): GeneratedUiPlan {
    const plan = this.get(planId);
    if (!plan) throw new Error(`Unknown planId: ${planId}`);
    return plan;
  }

  values(): GeneratedUiPlan[] {
    return [...this.plans.values()];
  }
}

export function createRunId(context: MigrationContext): string {
  const slug = outputSlug(context.source.route, context.source.vueRelativePath ?? context.source.vuePath);
  return `${slug}-${Date.now().toString(36)}`;
}

export function createSnapshotRunId(snapshotId: string): string {
  return snapshotId;
}

export function createUiPlanRunId(planId: string): string {
  return planId;
}
