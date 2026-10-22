import { markRaw } from "vue";
import { defineStore } from "pinia";
import type {
  CaptureJob,
  FragmentRef,
  StalenessReport,
} from "@proto-bridge/core/v2";
import type { SelectionDraft } from "@proto-bridge/core/v2/capture";
import type {
  BundleEvidenceDetails,
  CaptureConsoleState,
  EvidenceInventory,
  BundleDeletePlan,
  LocalServiceSession,
} from "@proto-bridge/core/v2/service-contract";
import {
  captureServiceClient,
  LocalServiceClientError,
} from "@/capture/service-client";
import { formatCaptureError } from "@/capture/presentation";
import { loadPrototypes, loadPrototypeScreens, loadPrototypeThemePack } from "@/design-system/loaders";
import { resolveRuntimeTheme } from "@/design-system/theme/runtime-theme";

const TERMINAL_JOB_STATUSES = [
  "completed",
  "cancelled",
  "interrupted",
  "failed",
] as const;

export type CaptureNotice = {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  bundleId?: string;
  snapshotId?: string;
};

function defaultScope(fragments: FragmentRef[] = []) {
  return {
    fragments,
    screenshots:
      fragments.length > 0
        ? ({ mode: "selected", targets: fragments } as const)
        : ({ mode: "all" } as const),
    sourcePolicy: false,
    debugPolicy: false,
    evidenceInputMode: "instrumented" as const,
    minEvidenceLevel: "instrumented-runtime" as const,
  };
}

function allSelections(screenId: string) {
  const screen = loadPrototypeScreens().find(
    (candidate) => candidate.screenId === screenId,
  );
  const scenarioIds = screen?.scenarios?.map((scenario) => scenario.id) ?? [];
  return {
    variants: {
      mode: "explicit" as const,
      variantIds: screen?.variants.map((variant) => variant.id) ?? [],
    },
    scenarios: scenarioIds.length
      ? { mode: "explicit" as const, scenarioIds }
      : { mode: "none" as const },
  };
}

/** Build the stable default whole-prototype selection used by formal finalization. */
export function createPrototypeCaptureDraft(
  prototypeId: string,
  capturePurpose: SelectionDraft["capturePurpose"] = "implementation-delivery",
): SelectionDraft | null {
  const prototype = loadPrototypes().find((item) => item.id === prototypeId);
  if (!prototype) return null;
  const screens = loadPrototypeScreens()
    .filter((screen) => screen.prototypeId === prototypeId)
    .map((screen) => ({
      screenId: screen.screenId,
      ...allSelections(screen.screenId),
      deviceIds: ["iphone-14"],
      captureScope: defaultScope(),
    }));
  if (!screens.length) return null;
  const pack = loadPrototypeThemePack(prototype.id);
  const resolved = resolveRuntimeTheme(
    prototype.themePackId,
    pack.defaultTheme,
    pack.defaultMode,
  );
  return {
    prototypeId,
    capturePurpose,
    themePack: resolved.identity,
    screens,
    acceptedWarningIds: [],
  };
}

export const useCaptureStore = defineStore("capture-v2", {
  state: () => {
    return {
      session: null as LocalServiceSession | null,
      consoleState: null as CaptureConsoleState | null,
      evidenceInventory: null as EvidenceInventory | null,
      deletePlan: null as BundleDeletePlan | null,
      activeJob: null as CaptureJob | null,
      selectedJob: null as CaptureJob | null,
      details: null as BundleEvidenceDetails | null,
      stalenessReport: null as StalenessReport | null,
      agentPrompt: null as string | null,
      deliveryArtifact: null as {
        deliveryId: string;
        agentPromptPath: string;
        receiptPath: string;
      } | null,
      screenshotUrls: {} as Record<string, string>,
      jobCenterOpen: false,
      notice: null as CaptureNotice | null,
      connecting: false,
      busy: false,
      lastError: null as string | null,
      lastErrorCode: null as string | null,
      consolePollingPaused: false,
    };
  },
  getters: {
    connected: (state) => state.session !== null,
    deliveryTargetRoot: (state) => state.session?.deliveryTargetRoot ?? "",
    jobFinished(state): boolean {
      return Boolean(
        state.activeJob &&
        TERMINAL_JOB_STATUSES.includes(
          state.activeJob.status as (typeof TERMINAL_JOB_STATUSES)[number],
        ),
      );
    },
  },
  actions: {
    setError(error: unknown) {
      this.lastError = formatCaptureError(error);
      this.lastErrorCode =
        error instanceof LocalServiceClientError ? error.code : "unknown";
    },
    clearError() {
      this.lastError = null;
      this.lastErrorCode = null;
      this.consolePollingPaused = false;
    },
    dismissNotice() {
      this.notice = null;
    },
    clearSelectedJob() {
      this.selectedJob = null;
    },
    clearStaleWorkspaceUi() {
      this.activeJob = null;
      this.selectedJob = null;
      this.details = null;
      this.stalenessReport = null;
      this.agentPrompt = null;
      this.deliveryArtifact = null;
      this.deletePlan = null;
      this.jobCenterOpen = false;
      this.revokeScreenshotUrls();
    },
    clearWorkspaceScopedState() {
      this.clearStaleWorkspaceUi();
      this.evidenceInventory = null;
      this.consoleState = null;
    },
    async reconcileLocalWorkspaceCache() {
      if (!this.session || this.session.generationId === "legacy-unavailable") {
        return false;
      }
      const { usePrototypeLifecycleStore } = await import(
        "@/app/stores/prototypeLifecycle"
      );
      const lifecycle = usePrototypeLifecycleStore();
      const document = await captureServiceClient.prototypeLifecycle();
      await lifecycle.hydrateFromService(document, loadPrototypes());
      return false;
    },
    async connect() {
      if (this.connected || this.connecting) return;
      this.connecting = true;
      this.clearError();
      try {
        this.session = await captureServiceClient.connect();
        await this.refreshConsole();
      } catch (error) {
        this.session = null;
        this.setError(error);
      } finally {
        this.connecting = false;
      }
    },
    async refreshConsole() {
      if (this.consolePollingPaused) return false;
      try {
        const nextConsoleState = await captureServiceClient.consoleState();
        if (this.session && nextConsoleState.generationId !== this.session.generationId) {
          this.clearStaleWorkspaceUi();
          this.session.generationId = nextConsoleState.generationId;
          this.notice = {
            tone: "info",
            title: "Workspace 已重置",
            message: "Local Service 已切换到新 generation，原型生命周期将从 Workspace 元数据重新载入。",
          };
        }
        this.consoleState = nextConsoleState;
        await this.reconcileLocalWorkspaceCache();
        if (this.activeJob) {
          const refreshed = this.consoleState.jobs.find(
            (job) => job.jobId === this.activeJob?.jobId,
          );
          if (refreshed) this.activeJob = refreshed;
        }
        return true;
      } catch (error) {
        if (
          error instanceof LocalServiceClientError &&
          ["unauthorized", "workspace-generation-mismatch"].includes(error.code)
        ) {
          this.session = null;
          captureServiceClient.disconnect();
          this.clearWorkspaceScopedState();
          this.consolePollingPaused = false;
          await this.connect();
          return false;
        }
        this.setError(error);
        this.consolePollingPaused = true;
        return false;
      }
    },
    async refreshActiveJob() {
      if (!this.activeJob) return;
      try {
        const previousStatus = this.activeJob.status;
        const wasTerminal = TERMINAL_JOB_STATUSES.includes(
          previousStatus as (typeof TERMINAL_JOB_STATUSES)[number],
        );
        this.activeJob = await captureServiceClient.getJob(
          this.activeJob.jobId,
        );
        const isTerminal = TERMINAL_JOB_STATUSES.includes(
          this.activeJob.status as (typeof TERMINAL_JOB_STATUSES)[number],
        );
        if (!isTerminal) return;

        // Only hydrate evidence when the job newly reaches a terminal state.
        // Re-fetching on every poll revokes screenshot object URLs and makes
        // Evidence Viewer images flicker (and 404-spams failed bundles).
        const justFinished = !wasTerminal;
        if (!justFinished) return;

        await this.loadBundle(this.activeJob.bundleId);
        const coverage = this.details?.activeSnapshot.coverage.counts;
        const failed =
          (coverage?.failed ?? 0) +
          (coverage?.unsupported ?? 0) +
          (coverage?.cancelled ?? 0) +
          (coverage?.interrupted ?? 0);
        const successful = (coverage?.captured ?? 0) + (coverage?.reused ?? 0);
        const completed = this.activeJob.status === "completed";
        this.notice = {
          tone:
            completed && failed === 0
              ? "success"
              : completed && successful > 0
                ? "warning"
                : "error",
          title:
            completed && failed === 0
              ? "证据采集完成"
              : completed
                ? "证据采集部分完成"
                : `证据采集${this.activeJob.status}`,
          message: this.details
            ? `${successful} 项成功或复用，${failed} 项未完成。`
            : "任务已结束，但还没有可打开的采集结果。",
          bundleId: this.activeJob.bundleId,
          ...(this.details
            ? { snapshotId: this.details.activeSnapshot.snapshotId }
            : {}),
        };
      } catch (error) {
        this.setError(error);
      }
    },
    async cancelActiveJob() {
      if (!this.activeJob) return;
      try {
        await captureServiceClient.cancelJob(this.activeJob.jobId);
        await this.refreshActiveJob();
      } catch (error) {
        this.setError(error);
      }
    },
    async loadBundle(bundleId: string) {
      this.clearError();
      try {
        const details = await captureServiceClient.bundleDetails(bundleId);
        this.revokeScreenshotUrls();
        this.details = markRaw(details);
      } catch (error) {
        this.setError(error);
      }
    },
    async loadSnapshot(bundleId: string, snapshotId: string) {
      this.clearError();
      try {
        const details = await captureServiceClient.snapshotDetails(
          bundleId,
          snapshotId,
        );
        this.revokeScreenshotUrls();
        this.details = markRaw(details);
      } catch (error) {
        this.setError(error);
      }
    },
    revokeScreenshotUrls() {
      Object.values(this.screenshotUrls).forEach((url) =>
        URL.revokeObjectURL(url),
      );
      this.screenshotUrls = {};
    },
    async checkStaleness() {
      if (!this.details) return;
      try {
        this.stalenessReport = await captureServiceClient.checkStaleness(
          this.details.bundle.bundleId,
          this.details.activeSnapshot.snapshotId,
        );
        await this.loadBundle(this.details.bundle.bundleId);
      } catch (error) {
        this.setError(error);
      }
    },
    async checkInventoryEvidence(bundleId: string, snapshotId: string) {
      try {
        await captureServiceClient.checkStaleness(bundleId, snapshotId);
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      }
    },
    async trashBundles(bundleIds: string[]) {
      try {
        await captureServiceClient.trashBundles(bundleIds);
        this.deletePlan = null;
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      }
    },
    async restoreBundles(bundleIds: string[]) {
      try {
        await captureServiceClient.restoreBundles(bundleIds);
        this.deletePlan = null;
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      }
    },
    async previewDeleteBundles(bundleIds: string[]) {
      try {
        this.deletePlan =
          await captureServiceClient.planDeleteBundles(bundleIds);
      } catch (error) {
        this.setError(error);
      }
    },
    async applyDeletePlan() {
      if (!this.deletePlan) return;
      try {
        await captureServiceClient.applyDeleteBundles(this.deletePlan);
        this.deletePlan = null;
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      }
    },
    async resetWorkspaceEvidence() {
      if (!this.session || this.session.generationId === "legacy-unavailable") {
        this.setError(
          new Error("当前 Workspace 无法重置（generation 不可用）。"),
        );
        return;
      }
      this.busy = true;
      this.clearError();
      try {
        const plan = await captureServiceClient.previewWorkspaceReset({
          workspaceId: this.session.workspaceId,
        });
        await captureServiceClient.applyWorkspaceReset({
          planId: plan.planId,
          workspaceId: plan.workspaceId,
          generationId: plan.generationId,
        });
        captureServiceClient.disconnect();
        this.session = null;
        this.notice = null;
        this.clearWorkspaceScopedState();
        const { usePrototypeLifecycleStore } = await import(
          "@/app/stores/prototypeLifecycle"
        );
        usePrototypeLifecycleStore().resetAfterWorkspaceReset(loadPrototypes());
        await this.connect();
      } catch (error) {
        this.setError(error);
      } finally {
        this.busy = false;
      }
    },
    async archiveCurrentBundle() {
      if (!this.details) return;
      try {
        await captureServiceClient.archiveBundle(this.details.bundle.bundleId);
        await this.loadBundle(this.details.bundle.bundleId);
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      }
    },
    async forkCurrentBundle() {
      if (!this.details) return;
      try {
        await captureServiceClient.forkBundle(
          this.details.bundle.bundleId,
          this.details.activeSnapshot.snapshotId,
        );
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      }
    },
    async loadDelivery(deliveryId: string) {
      this.busy = true;
      this.clearError();
      try {
        const delivery = await captureServiceClient.deliveryDetails(deliveryId);
        this.agentPrompt = delivery.agentPrompt;
        this.deliveryArtifact = {
          deliveryId: delivery.deliveryId,
          agentPromptPath: delivery.agentPromptPath,
          receiptPath: delivery.receiptPath,
        };
        return true;
      } catch (error) {
        this.setError(error);
        return false;
      } finally {
        this.busy = false;
      }
    },
  },
});
