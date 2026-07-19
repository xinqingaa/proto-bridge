import { defineStore } from "pinia";
import type {
  ElementSummary,
  RuntimeCapability,
  BridgePayloads,
} from "@/runtime/bridge";

export type SelectionMode = "idle" | "inspect";

export type SelectedPayload = BridgePayloads["select"];

export const useSelectionStore = defineStore("selection", {
  state: () => ({
    mode: "idle" as SelectionMode,
    runtimeId: null as string | null,
    runtimeReady: false,
    handshakeTimedOut: false,
    capabilities: [] as RuntimeCapability[],
    hover: null as ElementSummary | null,
    selected: null as SelectedPayload | null,
    lastError: null as string | null,
  }),
  getters: {
    canInspect(): boolean {
      return this.capabilities.includes("inspect");
    },
    inspecting(): boolean {
      return this.mode === "inspect";
    },
  },
  actions: {
    setInspectMode(enabled: boolean) {
      this.mode = enabled ? "inspect" : "idle";
      if (!enabled) {
        this.hover = null;
      }
    },
    toggleInspect() {
      this.setInspectMode(this.mode !== "inspect");
    },
    onRuntimeLoading(runtimeId: string) {
      this.runtimeId = runtimeId;
      this.runtimeReady = false;
      this.handshakeTimedOut = false;
      this.capabilities = [];
      this.hover = null;
      this.selected = null;
      this.lastError = null;
    },
    onReady(capabilities: RuntimeCapability[]) {
      this.runtimeReady = true;
      this.handshakeTimedOut = false;
      this.capabilities = [...new Set(capabilities)];
      if (!this.canInspect && this.mode === "inspect") {
        this.mode = "idle";
      }
    },
    onHandshakeTimeout() {
      if (!this.runtimeReady) {
        this.handshakeTimedOut = true;
      }
    },
    setHover(element?: ElementSummary) {
      this.hover = element ?? null;
    },
    setSelected(payload: SelectedPayload | null) {
      this.selected = payload;
      if (payload) this.hover = null;
    },
    clearSelection() {
      this.selected = null;
      this.hover = null;
    },
    resetForNavigation() {
      this.clearSelection();
      this.runtimeReady = false;
      this.capabilities = [];
    },
    setError(message: string | null) {
      this.lastError = message;
    },
  },
});
