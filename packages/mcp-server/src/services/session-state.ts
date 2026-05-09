import type { GeneratedEvidence, GeneratedUiPlan } from '../types.js';

export class EvidenceStore {
  private readonly evidences = new Map<string, GeneratedEvidence>();

  add(evidence: GeneratedEvidence): void {
    this.evidences.set(evidence.id, evidence);
  }

  get(evidenceId: string): GeneratedEvidence | undefined {
    return this.evidences.get(evidenceId);
  }

  require(evidenceId: string): GeneratedEvidence {
    const evidence = this.get(evidenceId);
    if (!evidence) throw new Error(`Unknown evidenceId: ${evidenceId}`);
    return evidence;
  }

  values(): GeneratedEvidence[] {
    return [...this.evidences.values()];
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

export function createEvidenceRecordId(evidenceId: string): string {
  return evidenceId;
}

export function createUiPlanRecordId(planId: string): string {
  return planId;
}
