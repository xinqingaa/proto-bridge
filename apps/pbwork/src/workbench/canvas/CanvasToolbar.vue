<script setup lang="ts">
import { computed } from "vue";
import {
  Copy,
  Expand,
  ExternalLink,
  Hand,
  Minus,
  MousePointer2,
  Plus,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
} from "lucide-vue-next";
import { useCanvasStore } from "@/app/stores/canvas";
import { useSelectionStore } from "@/app/stores/selection";
import { DEVICE_PRESETS, ZOOM_PRESETS } from "@/workbench/canvas/devices";
import type { PrototypeVariant, ThemeRecord } from "@/design-system/types";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";

const props = defineProps<{
  variants: PrototypeVariant[];
  themes: ThemeRecord[];
  variantId: string;
  themeId: string;
  isDark: boolean;
  fullscreen: boolean;
  copyFeedback?: string | null;
  captureDisabled?: boolean;
  captureLabel?: string;
}>();

const emit = defineEmits<{
  "update:variantId": [string];
  "update:themeId": [string];
  "toggle-inspect": [];
  refresh: [];
  fullscreen: [];
  copy: [];
  "copy-and-open": [];
  capture: [];
}>();

const canvas = useCanvasStore();
const selection = useSelectionStore();

const zoomItems = computed(() =>
  ZOOM_PRESETS.map((value) => ({
    title: `${Math.round(value * 100)}%`,
    value,
  })),
);
const deviceItems = DEVICE_PRESETS.map((item) => ({
  label: item.label,
  value: item.id,
}));
const themeItems = computed(() =>
  props.themes.map((item) => ({ label: item.label, value: item.id })),
);
const variantItems = computed(() =>
  props.variants.map((item) => ({ label: item.label, value: item.id })),
);

function onZoomSelect(value: unknown) {
  if (typeof value === "number") canvas.setZoom(value);
}

function onTogglePan() {
  if (canvas.toolMode !== "pan" && selection.inspecting) {
    emit("toggle-inspect");
  }
  canvas.togglePanMode();
}
</script>

<template>
  <div
    class="canvas-toolbar"
    :class="{ 'is-dark': isDark }"
    role="toolbar"
    aria-label="画布工具栏"
  >
    <div class="toolbar-cluster" role="group" aria-label="工具">
      <v-tooltip
        :text="
          selection.canInspect || selection.inspecting
            ? selection.inspecting
              ? '退出选择与评审（⌥ 选父级 / ↑ 上溯）'
              : '选择与评审（⌥ 选父级 / ↑ 上溯）'
            : '选择与评审（等待 Runtime）'
        "
        location="bottom"
      >
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            :class="{ 'is-active': selection.inspecting }"
            :disabled="!selection.canInspect && !selection.inspecting"
            :aria-label="selection.inspecting ? '退出选择与评审' : '选择与评审'"
            :aria-pressed="selection.inspecting"
            @click="emit('toggle-inspect')"
          >
            <MousePointer2 :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <span class="cluster-sep" aria-hidden="true" />
      <v-tooltip
        :text="canvas.toolMode === 'pan' ? '退出拖动画布' : '拖动画布'"
        location="bottom"
      >
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            :class="{ 'is-active': canvas.toolMode === 'pan' }"
            :aria-label="
              canvas.toolMode === 'pan' ? '退出拖动画布' : '拖动画布'
            "
            :aria-pressed="canvas.toolMode === 'pan'"
            @click="onTogglePan"
          >
            <Hand :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
    </div>

    <div class="toolbar-cluster zoom-cluster" role="group" aria-label="缩放">
      <v-tooltip text="缩小" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            aria-label="缩小"
            @click="canvas.zoomOut()"
          >
            <Minus :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <input
        class="zoom-slider"
        type="range"
        min="35"
        max="200"
        step="1"
        :value="canvas.zoomPercent"
        aria-label="自定义缩放比例"
        :aria-valuetext="canvas.zoomLabel"
        @input="
          canvas.setZoom(
            Number(($event.target as HTMLInputElement).value) / 100,
          )
        "
      />
      <v-menu location="bottom">
        <template #activator="{ props: menu }">
          <button
            v-bind="menu"
            type="button"
            class="zoom-label"
            aria-label="缩放比例预设"
            :title="'点击选择常用比例'"
          >
            {{ canvas.zoomLabel }}
          </button>
        </template>
        <v-list density="compact" nav class="zoom-menu">
          <v-list-item
            v-for="item in zoomItems"
            :key="item.value"
            :title="item.title"
            :active="Math.abs(canvas.zoom - item.value) < 0.001"
            @click="onZoomSelect(item.value)"
          />
        </v-list>
      </v-menu>
      <v-tooltip text="放大" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            aria-label="放大"
            @click="canvas.zoomIn()"
          >
            <Plus :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
    </div>

    <v-menu location="top" :close-on-content-click="false">
      <template #activator="{ props: menu }">
        <v-tooltip text="预览设置" location="bottom">
          <template #activator="{ props: tip }">
            <button
              v-bind="{ ...menu, ...tip }"
              type="button"
              class="tool-btn"
              aria-label="预览设置"
            >
              <SlidersHorizontal :size="15" aria-hidden="true" />
            </button>
          </template>
        </v-tooltip>
      </template>
      <div class="settings-popover">
        <div class="settings-heading">
          <strong>预览设置</strong>
          <span>设备、主题与可复现状态</span>
        </div>
        <label class="settings-field">
          <span class="settings-label">设备</span>
          <WorkbenchSelect
            :model-value="canvas.deviceId"
            :items="deviceItems"
            aria-label="设备尺寸"
            @update:model-value="canvas.setDeviceId"
          />
        </label>
        <label class="settings-field">
          <span class="settings-label">主题</span>
          <WorkbenchSelect
            :model-value="themeId"
            :items="themeItems"
            aria-label="原型主题"
            @update:model-value="emit('update:themeId', $event)"
          />
        </label>
        <label class="settings-field">
          <span class="settings-label">状态</span>
          <WorkbenchSelect
            :model-value="variantId"
            :items="variantItems"
            aria-label="Variant"
            @update:model-value="emit('update:variantId', $event)"
          />
        </label>
      </div>
    </v-menu>

    <div class="toolbar-spacer" />

    <div class="toolbar-cluster" role="group" aria-label="链接">
      <v-tooltip :text="captureLabel ?? '采集当前页面'" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn tool-primary"
            :aria-label="captureLabel ?? '采集当前页面'"
            :disabled="captureDisabled"
            data-testid="capture-current-screen"
            @click="emit('capture')"
          >
            <ScanLine :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <span class="cluster-sep" aria-hidden="true" />
      <v-tooltip text="刷新" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            aria-label="刷新"
            @click="emit('refresh')"
          >
            <RefreshCw :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <v-tooltip
        :text="fullscreen ? '退出全屏画布' : '全屏画布'"
        location="bottom"
      >
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            :aria-label="fullscreen ? '退出全屏画布' : '全屏画布'"
            :class="{ 'is-active': fullscreen }"
            @click="emit('fullscreen')"
          >
            <Expand :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <v-tooltip text="复制并打开 Runtime" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            aria-label="复制并打开 Runtime"
            @click="emit('copy-and-open')"
          >
            <ExternalLink :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <v-tooltip :text="copyFeedback ?? '复制原型链接'" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn tool-primary"
            aria-label="复制原型链接"
            @click="emit('copy')"
          >
            <Copy :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<style scoped>
.canvas-toolbar {
  position: absolute;
  z-index: 12;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 24px);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 7px 8px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(248, 250, 252, 0.96) 100%
  );
  backdrop-filter: blur(10px);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
  overflow: visible;
}

.canvas-toolbar.is-dark {
  border-color: rgba(255, 255, 255, 0.1);
  background: linear-gradient(
    180deg,
    rgba(30, 41, 55, 0.96) 0%,
    rgba(22, 30, 40, 0.98) 100%
  );
}
.settings-popover {
  width: 228px;
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.2);
  color: rgb(var(--v-theme-on-surface));
}
.settings-heading {
  display: grid;
  gap: 2px;
}
.settings-heading strong {
  font-size: 0.8125rem;
}
.settings-heading span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.72rem;
}
.settings-field {
  display: grid;
  gap: 4px;
}
.settings-label {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font:
    600 11px/1 Inter,
    system-ui,
    sans-serif;
}
@container (max-width: 720px) {
  .canvas-toolbar {
    gap: 4px;
  }
  .toolbar-spacer {
    display: none;
  }
  .zoom-slider {
    width: 64px;
  }
  .toolbar-cluster {
    gap: 3px;
  }
}
@container (max-width: 500px) {
  .zoom-label {
    min-width: 42px;
  }
  .zoom-slider {
    width: 52px;
  }
  .cluster-sep {
    display: none;
  }
}

.toolbar-cluster {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.canvas-toolbar.is-dark .toolbar-cluster {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.cluster-sep {
  width: 1px;
  height: 18px;
  margin: 0 3px;
  background: rgba(15, 23, 42, 0.12);
}

.canvas-toolbar.is-dark .cluster-sep {
  background: rgba(255, 255, 255, 0.14);
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(15, 23, 42, 0.78);
  cursor: pointer;
  font:
    600 12px/1 Inter,
    system-ui,
    sans-serif;
}

.canvas-toolbar.is-dark .tool-btn {
  color: rgba(226, 232, 240, 0.88);
}

.tool-btn:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.06);
}

.canvas-toolbar.is-dark .tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.tool-btn.is-active {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
}

.canvas-toolbar.is-dark .tool-btn.is-active {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent);
  color: rgb(var(--v-theme-primary));
}

.tool-btn.is-disabled,
.tool-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.tool-primary {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 9%, transparent);
  color: rgb(var(--v-theme-primary));
}

.canvas-toolbar.is-dark .tool-primary {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
  color: rgb(var(--v-theme-primary));
}

.zoom-label {
  min-width: 48px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font:
    600 12px/30px ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  text-align: center;
}

.zoom-label:hover {
  background: rgba(15, 23, 42, 0.06);
}

.zoom-slider {
  width: 96px;
  height: 30px;
  margin: 0 2px;
  accent-color: rgb(var(--v-theme-primary));
  cursor: pointer;
  vertical-align: middle;
}

.canvas-toolbar.is-dark .zoom-slider {
  accent-color: rgb(var(--v-theme-primary));
}

.zoom-slider:focus-visible {
  outline: 2px solid
    color-mix(in srgb, rgb(var(--v-theme-primary)) 40%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}

.toolbar-spacer {
  flex: 1;
  min-width: 8px;
}

.zoom-menu {
  min-width: 96px;
}
</style>
