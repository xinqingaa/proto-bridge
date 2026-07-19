import { defineStore } from "pinia";
import {
  DEFAULT_DEVICE_ID,
  DEVICE_PRESETS,
  ZOOM_PRESETS,
} from "@/workbench/canvas/devices";

const canvasKey = "pbwork.workbench.canvas.v1";

export type CanvasToolMode = "idle" | "pan";

type CanvasPrefs = {
  deviceId?: string;
  zoom?: number;
  panX?: number;
  panY?: number;
  toolMode?: CanvasToolMode;
};

function clampZoom(zoom: number): number {
  return Math.min(2, Math.max(0.35, Math.round(zoom * 100) / 100));
}

function readPrefs(): Required<
  Pick<CanvasPrefs, "deviceId" | "zoom" | "panX" | "panY" | "toolMode">
> {
  const fallback = {
    deviceId: DEFAULT_DEVICE_ID,
    zoom: 1,
    panX: 0,
    panY: 0,
    toolMode: "idle" as CanvasToolMode,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(canvasKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as CanvasPrefs;
    const deviceId = DEVICE_PRESETS.some((item) => item.id === parsed.deviceId)
      ? (parsed.deviceId as string)
      : fallback.deviceId;
    const toolMode =
      parsed.toolMode === "pan" || parsed.toolMode === "idle"
        ? parsed.toolMode
        : fallback.toolMode;
    return {
      deviceId,
      zoom: clampZoom(
        typeof parsed.zoom === "number" ? parsed.zoom : fallback.zoom,
      ),
      panX: typeof parsed.panX === "number" ? parsed.panX : fallback.panX,
      panY: typeof parsed.panY === "number" ? parsed.panY : fallback.panY,
      toolMode,
    };
  } catch {
    return fallback;
  }
}

export const useCanvasStore = defineStore("canvas", {
  state: () => {
    const prefs = readPrefs();
    return {
      deviceId: prefs.deviceId,
      zoom: prefs.zoom,
      panX: prefs.panX,
      panY: prefs.panY,
      toolMode: prefs.toolMode as CanvasToolMode,
    };
  },
  getters: {
    zoomPercent(): number {
      return Math.round(this.zoom * 100);
    },
    zoomLabel(): string {
      return `${this.zoomPercent}%`;
    },
  },
  actions: {
    persist() {
      if (typeof window === "undefined") return;
      const payload: Required<CanvasPrefs> = {
        deviceId: this.deviceId,
        zoom: this.zoom,
        panX: this.panX,
        panY: this.panY,
        toolMode: this.toolMode,
      };
      window.localStorage.setItem(canvasKey, JSON.stringify(payload));
    },
    setDeviceId(deviceId: string) {
      if (!DEVICE_PRESETS.some((item) => item.id === deviceId)) return;
      this.deviceId = deviceId;
      this.persist();
    },
    setZoom(zoom: number) {
      this.zoom = clampZoom(zoom);
      this.persist();
    },
    zoomIn() {
      const next =
        ZOOM_PRESETS.find((item) => item > this.zoom + 0.001) ??
        Math.min(2, this.zoom + 0.25);
      this.setZoom(next);
    },
    zoomOut() {
      const presets = [...ZOOM_PRESETS].reverse();
      const next =
        presets.find((item) => item < this.zoom - 0.001) ??
        Math.max(0.35, this.zoom - 0.25);
      this.setZoom(next);
    },
    setPan(x: number, y: number) {
      this.panX = x;
      this.panY = y;
      this.persist();
    },
    nudgePan(dx: number, dy: number) {
      this.panX += dx;
      this.panY += dy;
      this.persist();
    },
    resetPan() {
      this.panX = 0;
      this.panY = 0;
      this.persist();
    },
    setToolMode(mode: CanvasToolMode) {
      this.toolMode = mode;
      this.persist();
    },
    togglePanMode() {
      this.toolMode = this.toolMode === "pan" ? "idle" : "pan";
      this.persist();
    },
  },
});
