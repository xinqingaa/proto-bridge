import { defineStore } from "pinia";
import type {
  AgentHandoff,
  CaptureJob,
  FragmentRef,
  RiskKind,
  StalenessReport,
} from "@proto-bridge/core/v2";
import { buildAgentPrompt } from "@proto-bridge/core/v2/agent-prompt";
import type {
  ScenarioSelection,
  SelectionDraft,
  VariantSelection,
} from "@proto-bridge/core/v2/capture";
import type {
  BundleEvidenceDetails,
  CaptureConsoleState,
  EvidenceInventory,
  BundleDeletePlan,
  HandoffPreview,
  LocalServiceSession,
  StoredPreflight,
} from "@proto-bridge/core/v2/service-contract";
import {
  captureServiceClient,
  LocalServiceClientError,
} from "@/capture/service-client";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";

export type CaptureEntryKind =
  "current-screen" | "fragment" | "custom" | "prototype";

const CAPTURE_DRAFT_KEY = "pbwork.capture-v2.draft";
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

function readDraftSession(): {
  entryKind: CaptureEntryKind | null;
  returnTo: string;
  draft: SelectionDraft | null;
} {
  try {
    const raw = window.sessionStorage.getItem(CAPTURE_DRAFT_KEY);
    if (!raw) {
      return {
        entryKind: null,
        returnTo: "/workbench/overview",
        draft: null,
      };
    }
    const parsed = JSON.parse(raw) as {
      entryKind?: CaptureEntryKind;
      returnTo?: string;
      draft?: SelectionDraft;
    };
    return {
      entryKind: parsed.entryKind ?? null,
      returnTo: parsed.returnTo ?? "/workbench/overview",
      draft: parsed.draft ?? null,
    };
  } catch {
    return {
      entryKind: null,
      returnTo: "/workbench/overview",
      draft: null,
    };
  }
}

type CurrentScreenInput = {
  prototypeId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  returnTo: string;
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

function criticalScenarios(screenId: string): ScenarioSelection {
  const scenarioIds =
    loadPrototypeScreens()
      .find((screen) => screen.screenId === screenId)
      ?.scenarios?.filter((scenario) => scenario.critical)
      .map((scenario) => scenario.id) ?? [];
  return scenarioIds.length
    ? { mode: "explicit", scenarioIds }
    : { mode: "none" };
}

function currentScreenDraft(input: CurrentScreenInput): SelectionDraft {
  return {
    prototypeId: input.prototypeId,
    screens: [
      {
        screenId: input.screenId,
        variants: { mode: "explicit", variantIds: [input.variantId] },
        themeIds: [input.themeId],
        deviceIds: [input.deviceId],
        scenarios: criticalScenarios(input.screenId),
        captureScope: defaultScope(),
      },
    ],
    acceptedWarningIds: [],
  };
}

export const useCaptureStore = defineStore("capture-v2", {
  state: () => {
    const draftSession = readDraftSession();
    return {
      entryKind: draftSession.entryKind,
      returnTo: draftSession.returnTo,
      draft: draftSession.draft,
      session: null as LocalServiceSession | null,
      consoleState: null as CaptureConsoleState | null,
      evidenceInventory: null as EvidenceInventory | null,
      deletePlan: null as BundleDeletePlan | null,
      preflight: null as StoredPreflight | null,
      acceptedWarningIds: [] as string[],
      activeJob: null as CaptureJob | null,
      selectedJob: null as CaptureJob | null,
      details: null as BundleEvidenceDetails | null,
      stalenessReport: null as StalenessReport | null,
      handoffPreview: null as HandoffPreview | null,
      handoff: null as AgentHandoff | null,
      acknowledgedRiskKinds: [] as RiskKind[],
      handoffSheetOpen: false,
      handoffIntent: "",
      deliverStep: 0,
      agentPrompt: null as string | null,
      deliveryArtifact: null as {
        deliveryId: string;
        agentPromptPath: string;
        receiptPath: string;
      } | null,
      deliverTargetRoot: "apps/flutter_pb_app",
      recaptureBundleId: null as string | null,
      screenshotUrls: {} as Record<string, string>,
      composerOpen: false,
      jobCenterOpen: false,
      notice: null as CaptureNotice | null,
      connecting: false,
      busy: false,
      lastError: null as string | null,
      lastErrorCode: null as string | null,
    };
  },
  getters: {
    connected: (state) => state.session !== null,
    warningsAccepted(state): boolean {
      const required =
        state.preflight?.result.warnings.map((warning) => warning.warningId) ??
        [];
      const accepted = new Set(state.acceptedWarningIds);
      return required.every((warningId) => accepted.has(warningId));
    },
    risksAccepted(state): boolean {
      const required =
        state.handoffPreview?.risks.map((risk) => risk.kind) ?? [];
      const accepted = new Set(state.acknowledgedRiskKinds);
      return required.every((kind) => accepted.has(kind));
    },
    currentSnapshotHandoffs(state): AgentHandoff[] {
      if (!state.details) return [];
      const snapshotId = state.details.activeSnapshot.snapshotId;
      return state.details.handoffs.filter(
        (item) => item.snapshotId === snapshotId,
      );
    },
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
      this.lastError =
        error instanceof Error ? error.message : "证据采集操作失败。";
      this.lastErrorCode =
        error instanceof LocalServiceClientError ? error.code : "unknown";
    },
    clearError() {
      this.lastError = null;
      this.lastErrorCode = null;
    },
    openComposer() {
      this.deliverStep = 0;
      this.agentPrompt = null;
      this.deliveryArtifact = null;
      this.handoff = null;
      this.composerOpen = true;
      void this.runPreflight();
    },
    closeComposer() {
      this.composerOpen = false;
    },
    setDeliverStep(step: number) {
      this.deliverStep = Math.min(3, Math.max(0, step));
    },
    discardDraft() {
      this.entryKind = null;
      this.draft = null;
      this.preflight = null;
      this.acceptedWarningIds = [];
      this.recaptureBundleId = null;
      this.handoffPreview = null;
      this.persistDraft();
    },
    dismissNotice() {
      this.notice = null;
    },
    clearSelectedJob() {
      this.selectedJob = null;
    },
    invalidatePreflight() {
      this.preflight = null;
      this.acceptedWarningIds = [];
      this.handoffPreview = null;
      this.persistDraft();
    },
    persistDraft() {
      window.sessionStorage.setItem(
        CAPTURE_DRAFT_KEY,
        JSON.stringify({
          entryKind: this.entryKind,
          returnTo: this.returnTo,
          draft: this.draft,
        }),
      );
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
      try {
        this.consoleState = await captureServiceClient.consoleState();
        this.evidenceInventory = await captureServiceClient.evidenceInventory();
        if (this.activeJob) {
          const refreshed = this.consoleState.jobs.find(
            (job) => job.jobId === this.activeJob?.jobId,
          );
          if (refreshed) this.activeJob = refreshed;
        }
      } catch (error) {
        this.setError(error);
      }
    },
    beginCurrentScreen(input: CurrentScreenInput) {
      this.entryKind = "current-screen";
      this.returnTo = input.returnTo;
      this.draft = currentScreenDraft(input);
      this.invalidatePreflight();
      this.details = null;
      this.handoff = null;
      this.recaptureBundleId = null;
    },
    beginFragment(input: CurrentScreenInput & { fragment: FragmentRef }) {
      if (!input.fragment.pbId) {
        this.setError(
          new Error("Fragment 缺少稳定 data-pb-id，不能进入正式采集。"),
        );
        return false;
      }
      this.beginCurrentScreen(input);
      this.entryKind = "fragment";
      const screen = this.draft!.screens[0]!;
      screen.captureScope = defaultScope([input.fragment]);
      this.persistDraft();
      return true;
    },
    beginCustom(prototypeId: string, returnTo = "/workbench/overview") {
      const prototype = loadPrototypes().find(
        (item) => item.id === prototypeId,
      );
      const first = loadPrototypeScreens().find(
        (screen) => screen.prototypeId === prototypeId,
      );
      if (!prototype || !first) return;
      this.entryKind = "custom";
      this.returnTo = returnTo;
      this.draft = {
        prototypeId,
        screens: [
          {
            screenId: first.screenId,
            variants: { mode: "default" },
            themeIds: [prototype.defaultThemeId],
            deviceIds: ["iphone-14"],
            scenarios: { mode: "none" },
            captureScope: defaultScope(),
          },
        ],
        acceptedWarningIds: [],
      };
      this.recaptureBundleId = null;
      this.invalidatePreflight();
    },
    beginPrototype(prototypeId: string, returnTo = "/workbench/overview") {
      const prototype = loadPrototypes().find(
        (item) => item.id === prototypeId,
      );
      if (!prototype) return;
      this.entryKind = "prototype";
      this.returnTo = returnTo;
      this.draft = {
        prototypeId,
        screens: loadPrototypeScreens()
          .filter((screen) => screen.prototypeId === prototypeId)
          .map((screen) => ({
            screenId: screen.screenId,
            variants: { mode: "default" as const },
            themeIds: [prototype.defaultThemeId],
            deviceIds: ["iphone-14"],
            scenarios: { mode: "none" as const },
            captureScope: defaultScope(),
          })),
        acceptedWarningIds: [],
      };
      this.recaptureBundleId = null;
      this.invalidatePreflight();
    },
    toggleCustomScreen(screenId: string, selected: boolean) {
      if (!this.draft) return;
      const existing = this.draft.screens.find(
        (screen) => screen.screenId === screenId,
      );
      if (!selected) {
        this.draft.screens = this.draft.screens.filter(
          (screen) => screen.screenId !== screenId,
        );
      } else if (!existing) {
        const prototype = loadPrototypes().find(
          (item) => item.id === this.draft!.prototypeId,
        );
        this.draft.screens.push({
          screenId,
          variants: { mode: "default" },
          themeIds: [prototype?.defaultThemeId ?? "light"],
          deviceIds: ["iphone-14"],
          scenarios: { mode: "none" },
          captureScope: defaultScope(),
        });
      }
      this.invalidatePreflight();
    },
    setVariantMode(screenId: string, mode: VariantSelection["mode"]) {
      const screen = this.draft?.screens.find(
        (candidate) => candidate.screenId === screenId,
      );
      if (!screen) return;
      if (mode === "explicit") {
        const record = loadPrototypeScreens().find(
          (candidate) => candidate.screenId === screenId,
        );
        screen.variants = {
          mode: "explicit",
          variantIds: [record?.defaultVariantId ?? "default"],
        };
      } else {
        screen.variants = { mode };
      }
      this.invalidatePreflight();
    },
    setScenarioMode(screenId: string, mode: ScenarioSelection["mode"]) {
      const screen = this.draft?.screens.find(
        (candidate) => candidate.screenId === screenId,
      );
      if (!screen) return;
      if (mode === "explicit") {
        screen.scenarios = criticalScenarios(screenId);
      } else {
        screen.scenarios = { mode };
      }
      this.invalidatePreflight();
    },
    toggleVariantId(screenId: string, variantId: string, selected: boolean) {
      const screen = this.draft?.screens.find(
        (candidate) => candidate.screenId === screenId,
      );
      const record = loadPrototypeScreens().find(
        (candidate) => candidate.screenId === screenId,
      );
      if (!screen || !record) return;
      const current =
        screen.variants.mode === "explicit"
          ? screen.variants.variantIds
          : record.variants
              .filter((variant) => {
                if (screen.variants.mode === "all") return true;
                if (screen.variants.mode === "critical") {
                  return variant.critical;
                }
                if (screen.variants.mode === "default-and-critical") {
                  return (
                    variant.id === record.defaultVariantId || variant.critical
                  );
                }
                return variant.id === record.defaultVariantId;
              })
              .map((variant) => variant.id);
      const variantIds = selected
        ? [...new Set([...current, variantId])]
        : current.filter((item) => item !== variantId);
      if (variantIds.length === 0) {
        this.setError(new Error("每个页面至少需要选择一个状态。"));
        return;
      }
      screen.variants = { mode: "explicit", variantIds };
      this.invalidatePreflight();
    },
    toggleScenarioId(screenId: string, scenarioId: string, selected: boolean) {
      const screen = this.draft?.screens.find(
        (candidate) => candidate.screenId === screenId,
      );
      const record = loadPrototypeScreens().find(
        (candidate) => candidate.screenId === screenId,
      );
      if (!screen || !record) return;
      const current =
        screen.scenarios.mode === "explicit"
          ? screen.scenarios.scenarioIds
          : screen.scenarios.mode === "all"
            ? (record.scenarios ?? []).map((scenario) => scenario.id)
            : screen.scenarios.mode === "critical"
              ? (record.scenarios ?? [])
                  .filter((scenario) => scenario.critical)
                  .map((scenario) => scenario.id)
              : [];
      const scenarioIds = selected
        ? [...new Set([...current, scenarioId])]
        : current.filter((item) => item !== scenarioId);
      screen.scenarios = scenarioIds.length
        ? { mode: "explicit", scenarioIds }
        : { mode: "none" };
      this.invalidatePreflight();
    },
    setSourcePolicy(enabled: boolean) {
      if (!this.draft) return;
      this.draft.screens.forEach((screen) => {
        screen.captureScope.sourcePolicy = enabled;
      });
      this.invalidatePreflight();
    },
    setAllVariantMode(mode: VariantSelection["mode"]) {
      if (!this.draft) return;
      this.draft.screens.forEach((screen) => {
        if (mode === "explicit") {
          const record = loadPrototypeScreens().find(
            (candidate) => candidate.screenId === screen.screenId,
          );
          screen.variants = {
            mode: "explicit",
            variantIds: [record?.defaultVariantId ?? "default"],
          };
        } else {
          screen.variants = { mode };
        }
      });
      this.invalidatePreflight();
    },
    setAllScenarioMode(mode: ScenarioSelection["mode"]) {
      if (!this.draft) return;
      this.draft.screens.forEach((screen) => {
        screen.scenarios =
          mode === "explicit" ? criticalScenarios(screen.screenId) : { mode };
      });
      this.invalidatePreflight();
    },
    async runPreflight() {
      if (!this.draft) return;
      this.busy = true;
      this.clearError();
      try {
        this.preflight = await captureServiceClient.createPreflight(this.draft);
        this.acceptedWarningIds = [];
      } catch (error) {
        this.setError(error);
      } finally {
        this.busy = false;
      }
    },
    toggleWarning(warningId: string, accepted: boolean) {
      this.acceptedWarningIds = accepted
        ? [...new Set([...this.acceptedWarningIds, warningId])]
        : this.acceptedWarningIds.filter((item) => item !== warningId);
    },
    async createJob(bundleId?: string) {
      if (!this.preflight || !this.warningsAccepted) return;
      this.busy = true;
      this.clearError();
      try {
        const targetBundleId = bundleId ?? this.recaptureBundleId;
        const result = await captureServiceClient.createJob({
          preflightId: this.preflight.preflightId,
          acceptedWarningIds: this.acceptedWarningIds,
          ...(targetBundleId ? { bundleId: targetBundleId } : {}),
        });
        this.activeJob = result.job;
        this.selectedJob = null;
        this.details = null;
        this.agentPrompt = null;
        this.deliveryArtifact = null;
        this.handoff = null;
        this.deliverStep = 1;
        this.composerOpen = true;
        // Keep progress inside the Deliver FlowSheet; task center stays secondary.
        this.jobCenterOpen = false;
        this.notice = {
          tone: "info",
          title: "正在交付",
          message: `${result.job.selection.cases.length} 个采集项执行中。`,
          bundleId: result.job.bundleId,
        };
        await this.refreshConsole();
      } catch (error) {
        this.setError(error);
      } finally {
        this.busy = false;
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
        if (completed && this.details && this.composerOpen) {
          this.deliverStep = 2;
          this.acknowledgedRiskKinds = [];
          await this.previewCurrentHandoff();
          // Auto-ack risks for deliver continuity; risks stay in the Agent prompt.
          this.acknowledgedRiskKinds =
            this.handoffPreview?.risks.map((risk) => risk.kind) ?? [];
        }
      } catch (error) {
        this.setError(error);
      }
    },
    async resumeJob(job: CaptureJob) {
      if (
        TERMINAL_JOB_STATUSES.includes(
          job.status as (typeof TERMINAL_JOB_STATUSES)[number],
        )
      ) {
        this.selectedJob = job;
        return;
      }
      this.activeJob = job;
      this.selectedJob = job;
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
        this.details = details;
        await this.loadScreenshotUrls(bundleId);
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
        this.details = details;
        await this.loadScreenshotUrls(bundleId);
      } catch (error) {
        this.setError(error);
      }
    },
    async loadScreenshotUrls(bundleId: string) {
      if (!this.details) return;
      try {
        for (const blob of this.details.blobs.filter(
          (candidate) => candidate.kind === "screenshot",
        )) {
          this.screenshotUrls[blob.blobId] = await captureServiceClient.blobUrl(
            bundleId,
            blob.blobId,
          );
        }
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
        this.deletePlan = await captureServiceClient.planDeleteBundles(
          bundleIds,
        );
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
    async createStaleRecaptureDraft() {
      if (!this.details || !this.stalenessReport) return;
      try {
        const bundleId = this.details.bundle.bundleId;
        this.draft = await captureServiceClient.staleDraft(
          bundleId,
          this.stalenessReport.reportId,
        );
        this.entryKind = "custom";
        this.returnTo = "/workbench/capture";
        this.recaptureBundleId = bundleId;
        this.activeJob = null;
        this.details = null;
        this.stalenessReport = null;
        this.invalidatePreflight();
        this.openComposer();
      } catch (error) {
        this.setError(error);
      }
    },
    async recaptureEvidence(bundleId: string, caseId?: string) {
      try {
        this.draft = await captureServiceClient.recaptureDraft(
          bundleId,
          caseId,
        );
        this.entryKind = "custom";
        this.returnTo = "/workbench/capture";
        this.recaptureBundleId = bundleId;
        this.activeJob = null;
        this.details = null;
        this.invalidatePreflight();
        this.openComposer();
      } catch (error) {
        this.setError(error);
      }
    },
    async retryActiveJob() {
      if (!this.activeJob) return;
      await this.retryJob(this.activeJob);
    },
    async retryJob(job: CaptureJob) {
      try {
        this.draft = await captureServiceClient.retryDraft(job.jobId);
        this.entryKind = "custom";
        this.recaptureBundleId = job.bundleId;
        this.selectedJob = null;
        this.invalidatePreflight();
        this.openComposer();
      } catch (error) {
        this.setError(error);
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
    async previewCurrentHandoff(implementationIntent?: string) {
      if (!this.details) return;
      this.busy = true;
      this.clearError();
      try {
        const intent = implementationIntent ?? this.handoffIntent;
        this.handoffPreview = await captureServiceClient.previewHandoff({
          bundleId: this.details.bundle.bundleId,
          snapshotId: this.details.activeSnapshot.snapshotId,
          ...(intent.trim() ? { implementationIntent: intent.trim() } : {}),
          acknowledgedRiskKinds: [],
        });
        const allowed = new Set(
          this.handoffPreview.risks.map((risk) => risk.kind),
        );
        this.acknowledgedRiskKinds = this.acknowledgedRiskKinds.filter((kind) =>
          allowed.has(kind),
        );
      } catch (error) {
        this.setError(error);
      } finally {
        this.busy = false;
      }
    },
    toggleRisk(kind: RiskKind, accepted: boolean) {
      this.acknowledgedRiskKinds = accepted
        ? [...new Set([...this.acknowledgedRiskKinds, kind])]
        : this.acknowledgedRiskKinds.filter((item) => item !== kind);
    },
    openHandoffSheet() {
      this.handoff = null;
      this.handoffPreview = null;
      this.agentPrompt = null;
      this.deliveryArtifact = null;
      this.acknowledgedRiskKinds = [];
      this.handoffIntent = "";
      this.deliverStep = 2;
      this.composerOpen = true;
      this.handoffSheetOpen = false;
      void this.previewCurrentHandoff().then(() => {
        this.acknowledgedRiskKinds =
          this.handoffPreview?.risks.map((risk) => risk.kind) ?? [];
      });
    },
    closeHandoffSheet() {
      this.handoffSheetOpen = false;
    },
    async createCurrentHandoff(implementationIntent?: string) {
      if (!this.details || !this.risksAccepted) return;
      this.busy = true;
      this.clearError();
      try {
        const bundleId = this.details.bundle.bundleId;
        const snapshotId = this.details.activeSnapshot.snapshotId;
        const intent = implementationIntent ?? this.handoffIntent;
        this.handoff = await captureServiceClient.createHandoff({
          bundleId,
          snapshotId,
          ...(intent.trim() ? { implementationIntent: intent.trim() } : {}),
          acknowledgedRiskKinds: this.acknowledgedRiskKinds,
        });
        await this.loadSnapshot(bundleId, snapshotId);
        this.agentPrompt = buildAgentPrompt({
          handoffId: this.handoff.handoffId,
          workspaceId: this.details.bundle.workspaceId,
          bundleId,
          snapshotId,
          targetRoot: this.deliverTargetRoot,
          ...(intent.trim() ? { implementationIntent: intent.trim() } : {}),
          risks: this.handoff.risks,
        });
        const delivery = await captureServiceClient.createDelivery({
          handoffId: this.handoff.handoffId,
          targetRoot: this.deliverTargetRoot,
          ...(intent.trim() ? { implementationIntent: intent.trim() } : {}),
          runId: this.details.activeSnapshot.sourceRunId,
          acceptedWarningIds: this.acceptedWarningIds,
          acknowledgedRiskKinds: this.acknowledgedRiskKinds,
        });
        this.deliveryArtifact = {
          deliveryId: delivery.deliveryId,
          agentPromptPath: delivery.agentPromptPath,
          receiptPath: delivery.receiptPath,
        };
        this.deliverStep = 3;
        this.composerOpen = true;
      } catch (error) {
        this.setError(error);
      } finally {
        this.busy = false;
      }
    },
  },
});
