<script setup lang="ts">
import { computed } from "vue";
import {
  Copy,
  Expand,
  Hand,
  MessageSquarePlus,
  Minus,
  MousePointer2,
  Plus,
  RefreshCw,
} from "lucide-vue-next";
import { useCanvasStore } from "@/app/stores/canvas";
import {
  DEVICE_PRESETS,
  ZOOM_PRESETS,
} from "@/workbench/canvas/devices";
import type { PrototypeVariant, ThemeRecord } from "@/design-system/types";

defineProps<{
  variants: PrototypeVariant[];
  themes: ThemeRecord[];
  variantId: string;
  themeId: string;
  copyFeedback?: string | null;
}>();

const emit = defineEmits<{
  "update:variantId": [string];
  "update:themeId": [string];
  refresh: [];
  fullscreen: [];
  copy: [];
}>();

const canvas = useCanvasStore();

const zoomItems = computed(() =>
  ZOOM_PRESETS.map((value) => ({
    title: `${Math.round(value * 100)}%`,
    value,
  })),
);

function onZoomSelect(value: unknown) {
  if (typeof value === "number") canvas.setZoom(value);
}
</script>

<template>
  <div class="canvas-toolbar" role="toolbar" aria-label="画布工具栏">
    <div class="toolbar-cluster" role="group" aria-label="工具">
      <v-tooltip text="选择元素（M4）" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn is-disabled"
            disabled
            aria-label="选择元素（即将在 M4 提供）"
          >
            <MousePointer2 :size="15" aria-hidden="true" />
          </button>
        </template>
      </v-tooltip>
      <v-tooltip text="添加评论（M5）" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn is-disabled"
            disabled
            aria-label="添加评论（即将在 M5 提供）"
          >
            <MessageSquarePlus :size="15" aria-hidden="true" />
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
            @click="canvas.togglePanMode()"
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

    <div class="toolbar-cluster select-cluster">
      <label class="field">
        <span class="field-label">设备</span>
        <select
          class="field-control"
          :value="canvas.deviceId"
          aria-label="设备尺寸"
          @change="
            canvas.setDeviceId(($event.target as HTMLSelectElement).value)
          "
        >
          <option
            v-for="item in DEVICE_PRESETS"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">主题</span>
        <select
          class="field-control"
          :value="themeId"
          aria-label="原型主题"
          @change="
            emit('update:themeId', ($event.target as HTMLSelectElement).value)
          "
        >
          <option v-for="item in themes" :key="item.id" :value="item.id">
            {{ item.label }}
          </option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">Variant</span>
        <select
          class="field-control"
          :value="variantId"
          aria-label="Variant"
          @change="
            emit(
              'update:variantId',
              ($event.target as HTMLSelectElement).value,
            )
          "
        >
          <option v-for="item in variants" :key="item.id" :value="item.id">
            {{ item.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="toolbar-spacer" />

    <div class="toolbar-cluster" role="group" aria-label="链接">
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
      <v-tooltip text="全屏预览（新标签打开 Runtime）" location="bottom">
        <template #activator="{ props: tip }">
          <button
            v-bind="tip"
            type="button"
            class="tool-btn"
            aria-label="全屏预览"
            @click="emit('fullscreen')"
          >
            <Expand :size="15" aria-hidden="true" />
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
            <span>复制链接</span>
          </button>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<style scoped>
.canvas-toolbar {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.92) 0%,
      rgba(248, 250, 252, 0.96) 100%
    );
  backdrop-filter: blur(10px);
  overflow-x: auto;
}

:global(.v-theme--pbworkDark) .canvas-toolbar {
  border-bottom-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(
    180deg,
    rgba(30, 41, 55, 0.96) 0%,
    rgba(22, 30, 40, 0.98) 100%
  );
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

:global(.v-theme--pbworkDark) .toolbar-cluster {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.cluster-sep {
  width: 1px;
  height: 18px;
  margin: 0 3px;
  background: rgba(15, 23, 42, 0.12);
}

:global(.v-theme--pbworkDark) .cluster-sep {
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
  font: 600 12px/1 Inter, system-ui, sans-serif;
}

:global(.v-theme--pbworkDark) .tool-btn {
  color: rgba(226, 232, 240, 0.88);
}

.tool-btn:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.06);
}

:global(.v-theme--pbworkDark) .tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.tool-btn.is-active {
  background: rgba(37, 99, 235, 0.14);
  color: #1d4ed8;
}

:global(.v-theme--pbworkDark) .tool-btn.is-active {
  background: rgba(122, 167, 255, 0.2);
  color: #a9c7ff;
}

.tool-btn.is-disabled,
.tool-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.tool-primary span {
  white-space: nowrap;
}

.tool-primary {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

:global(.v-theme--pbworkDark) .tool-primary {
  background: rgba(122, 167, 255, 0.16);
  color: #a9c7ff;
}

.zoom-label {
  min-width: 48px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: 600 12px/30px ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;
}

.zoom-label:hover {
  background: rgba(15, 23, 42, 0.06);
}

.zoom-slider {
  width: 96px;
  height: 30px;
  margin: 0 2px;
  accent-color: #2563eb;
  cursor: pointer;
  vertical-align: middle;
}

:global(.v-theme--pbworkDark) .zoom-slider {
  accent-color: #7aa7ff;
}

.zoom-slider:focus-visible {
  outline: 2px solid rgba(37, 99, 235, 0.45);
  outline-offset: 2px;
  border-radius: 4px;
}

.select-cluster {
  gap: 6px;
  padding: 3px 6px;
}

.field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 4px 0 8px;
  border-radius: 7px;
}

.field-label {
  color: rgba(15, 23, 42, 0.45);
  font: 600 10px/1 Inter, system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

:global(.v-theme--pbworkDark) .field-label {
  color: rgba(226, 232, 240, 0.45);
}

.field-control {
  height: 26px;
  max-width: 128px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  padding: 0 6px;
  font: 500 12px/26px Inter, system-ui, sans-serif;
  outline: none;
}

:global(.v-theme--pbworkDark) .field-control {
  background: rgba(0, 0, 0, 0.25);
}

.field-control:focus-visible {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.35);
}

.toolbar-spacer {
  flex: 1;
  min-width: 8px;
}

.zoom-menu {
  min-width: 96px;
}
</style>
