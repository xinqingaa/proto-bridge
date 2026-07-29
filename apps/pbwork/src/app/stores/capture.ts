import { defineStore } from "pinia";
import type {
  AgentHandoff,
  CaptureJob,
  FragmentRef,
  RiskKind,
  StalenessReport,
} from "@proto-bridge/core/v2";
import type {
  ScenarioSelection,
  SelectionDraft,
  VariantSelection,
} from "@proto-bridge/core/v2/capture";
import type {
  BundleEvidenceDetails,
  CaptureConsoleState,
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
      preflight: null as StoredPreflight | null,
      acceptedWarningIds: [] as string[],
      activeJob: null as CaptureJob | null,
      details: null as BundleEvidenceDetails | null,
      stalenessReport: null as StalenessReport | null,
      handoffPreview: null as HandoffPreview | null,
      handoff: null as AgentHandoff | null,
      acknowledgedRiskKinds: [] as RiskKind[],
      recaptureBundleId: null as string | null,
      screenshotUrls: {} as Record<string, string>,
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
    jobFinished(state): boolean {
      return Boolean(
        state.activeJob &&
        ["completed", "cancelled", "interrupted", "failed"].includes(
          state.activeJob.status,
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
        this.details = null;
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
        this.activeJob = await captureServiceClient.getJob(
          this.activeJob.jobId,
        );
        if (
          ["completed", "cancelled", "interrupted", "failed"].includes(
            this.activeJob.status,
          )
        ) {
          await this.loadBundle(this.activeJob.bundleId);
        }
      } catch (error) {
        this.setError(error);
      }
    },
    async resumeJob(job: CaptureJob) {
      this.activeJob = job;
      this.details = null;
      if (
        ["completed", "cancelled", "interrupted", "failed"].includes(job.status)
      ) {
        await this.loadBundle(job.bundleId);
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
      this.revokeScreenshotUrls();
      try {
        this.details = await captureServiceClient.bundleDetails(bundleId);
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
      } catch (error) {
        this.setError(error);
      }
    },
    async retryActiveJob() {
      if (!this.activeJob) return;
      try {
        this.draft = await captureServiceClient.retryDraft(
          this.activeJob.jobId,
        );
        this.entryKind = "custom";
        this.recaptureBundleId = this.activeJob.bundleId;
        this.invalidatePreflight();
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
      try {
        this.handoffPreview = await captureServiceClient.previewHandoff({
          bundleId: this.details.bundle.bundleId,
          snapshotId: this.details.activeSnapshot.snapshotId,
          ...(implementationIntent ? { implementationIntent } : {}),
          acknowledgedRiskKinds: [],
        });
        this.acknowledgedRiskKinds = [];
      } catch (error) {
        this.setError(error);
      }
    },
    toggleRisk(kind: RiskKind, accepted: boolean) {
      this.acknowledgedRiskKinds = accepted
        ? [...new Set([...this.acknowledgedRiskKinds, kind])]
        : this.acknowledgedRiskKinds.filter((item) => item !== kind);
    },
    async createCurrentHandoff(implementationIntent?: string) {
      if (!this.details) return;
      try {
        this.handoff = await captureServiceClient.createHandoff({
          bundleId: this.details.bundle.bundleId,
          snapshotId: this.details.activeSnapshot.snapshotId,
          ...(implementationIntent ? { implementationIntent } : {}),
          acknowledgedRiskKinds: this.acknowledgedRiskKinds,
        });
        await this.loadBundle(this.details.bundle.bundleId);
      } catch (error) {
        this.setError(error);
      }
    },
  },
});
