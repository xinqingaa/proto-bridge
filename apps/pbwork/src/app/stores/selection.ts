import { defineStore } from "pinia";
import type {
  ElementSummary,
  RuntimeCapability,
  BridgePayloads,
} from "@/runtime/bridge";

export type SelectionMode = "idle" | "inspect" | "comment";
export type HighlightStatus = "idle" | "locating" | "located" | "missing" | "error";

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
    commentTarget: null as BridgePayloads["comment-target"] | null,
    highlightRequest: null as ElementSummary["ref"] | null,
    highlightNonce: 0,
    highlightStatus: "idle" as HighlightStatus,
    lastError: null as string | null,
  }),
  getters: {
    canInspect(): boolean {
      return this.capabilities.includes("inspect");
    },
    inspecting(): boolean {
      return this.mode === "inspect";
    },
    commenting(): boolean {
      return this.mode === "comment";
    },
    canComment(): boolean {
      return this.capabilities.includes("comment-target");
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
    setCommentMode(enabled: boolean) {
      this.mode = enabled ? "comment" : "idle";
      this.hover = null;
      if (!enabled) this.commentTarget = null;
    },
    toggleComment() {
      this.setCommentMode(this.mode !== "comment");
    },
    onRuntimeLoading(runtimeId: string) {
      this.runtimeId = runtimeId;
      this.runtimeReady = false;
      this.handshakeTimedOut = false;
      this.capabilities = [];
      this.hover = null;
      this.selected = null;
      this.commentTarget = null;
      this.highlightRequest = null;
      this.highlightStatus = "idle";
      this.lastError = null;
    },
    onReady(capabilities: RuntimeCapability[]) {
      this.runtimeReady = true;
      this.handshakeTimedOut = false;
      this.capabilities = [...new Set(capabilities)];
      if (!this.canInspect && this.mode === "inspect") {
        this.mode = "idle";
      }
      if (!this.canComment && this.mode === "comment") this.mode = "idle";
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
      if (payload) {
        this.hover = null;
        if (this.highlightStatus === "locating") this.highlightStatus = "located";
      }
    },
    clearSelection() {
      this.selected = null;
      this.hover = null;
    },
    setCommentTarget(payload: BridgePayloads["comment-target"] | null) {
      this.commentTarget = payload;
    },
    requestHighlight(ref: ElementSummary["ref"] | null) {
      if (ref) this.mode = "inspect";
      this.highlightRequest = ref
        ? {
            ...(ref.pbId ? { pbId: ref.pbId } : {}),
            ...(ref.handle ? { handle: ref.handle } : {}),
          }
        : null;
      this.highlightStatus = ref ? "locating" : "idle";
      this.lastError = null;
      this.highlightNonce += 1;
    },
    clearHighlightStatus() {
      this.highlightStatus = "idle";
      this.highlightRequest = null;
    },
    resetForNavigation() {
      this.clearSelection();
      this.runtimeReady = false;
      this.capabilities = [];
      this.highlightRequest = null;
      this.highlightStatus = "idle";
    },
    setError(message: string | null) {
      this.lastError = message;
      if (this.highlightStatus === "locating") {
        this.highlightStatus = message?.startsWith("ELEMENT_NOT_FOUND")
          ? "missing"
          : "error";
      }
    },
  },
});
