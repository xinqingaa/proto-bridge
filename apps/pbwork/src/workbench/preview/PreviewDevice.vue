<script setup lang="ts">
import { computed } from "vue";
import { DEFAULT_DEVICE_ID, getDevicePreset } from "@/workbench/canvas/devices";
import PreviewSurface from "./PreviewSurface.vue";
import {
  runtimeThemeSources,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import {
  resolvePreviewDevice,
  type PreviewContext,
  type PreviewDeviceSession,
} from "./model";
const props = defineProps<{
  device: PreviewDeviceSession;
  contexts: PreviewContext[];
  comparing?: boolean;
  scale: number;
}>();
const emit = defineEmits<{ resize: [scale: number] }>();
let drag: { x: number; y: number; scale: number } | undefined;
function startResize(event: PointerEvent) {
  if (event.button !== 0) return;
  drag = { x: event.clientX, y: event.clientY, scale: props.scale };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  event.preventDefault();
}
function moveResize(event: PointerEvent) {
  if (!drag) return;
  const dx = event.clientX - drag.x,
    dy = event.clientY - drag.y;
  emit(
    "resize",
    drag.scale +
      (dx * preset.width + dy * preset.height) /
        (preset.width ** 2 + preset.height ** 2),
  );
}
function resizeKey(event: KeyboardEvent) {
  const direction = ["ArrowRight", "ArrowDown"].includes(event.key)
    ? 1
    : ["ArrowLeft", "ArrowUp"].includes(event.key)
      ? -1
      : 0;
  if (!direction) return;
  emit("resize", props.scale + direction * 0.05);
  event.preventDefault();
}
const preset = getDevicePreset(DEFAULT_DEVICE_ID);
const context = computed(() =>
  props.contexts.find((c) => c.id === props.device.selection.contextId),
);
const manifest = computed(
  () => runtimeThemeSources.packs.get(context.value?.packId ?? "")?.manifest,
);
const status = computed(() =>
  resolvePreviewDevice(
    props.device,
    props.contexts,
    runtimeThemeSources.packs,
    resolveRuntimeTheme,
  ),
);
</script>
<template>
  <article
    class="preview-device"
    :data-preview-device="device.id"
    :data-preview-pack="status.table?.identity.packId"
    :data-preview-theme="status.table?.identity.theme"
    :data-preview-mode="device.selection.mode"
    :style="{ width: `${preset.width * scale + 24}px` }"
  >
    <header class="device-caption">
      <span v-if="comparing" class="device-marker">{{ device.id }}</span>
      <strong>{{ context?.label ?? "未知来源" }}</strong>
      <small
        >{{
          manifest?.themes.find((t) => t.id === device.selection.theme)?.label
        }}
        · {{ device.selection.mode === "dark" ? "深色" : "浅色" }}</small
      >
    </header>
    <div v-if="status.error" class="preview-error" role="alert">
      {{ status.error }}
    </div>
    <div class="device-container">
      <PreviewSurface
        v-if="status.table && context"
        :identity="status.table.identity"
        :scale="scale"
      >
        <template #default="surface"
          ><slot v-bind="surface" :device="device"
        /></template>
      </PreviewSurface>
      <button
        v-if="status.table"
        class="device-resizer"
        :aria-label="`调整手机 ${device.id} 显示尺寸`"
        @pointerdown="startResize"
        @pointermove="moveResize"
        @pointerup="drag = undefined"
        @pointercancel="drag = undefined"
        @lostpointercapture="drag = undefined"
        @keydown="resizeKey"
        title="拖动等比调整手机大小，方向键每次调整 5%"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 13L13 5M10 13L13 10"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </article>
</template>
<style scoped>
.device-container {
  position: relative;
}
.device-resizer {
  position: absolute;
  bottom: -7px;
  right: -7px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: nwse-resize;
  touch-action: none;
  color: rgba(var(--v-theme-on-surface), 0.32);
  background: transparent;
  border-radius: 50%;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}
.device-container:hover .device-resizer,
.device-resizer:focus-visible,
.device-resizer:active {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}
.device-resizer:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
}
.preview-device {
  flex: none;
  min-width: 0;
}
.device-caption {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 0 12px 10px;
  font-size: 12px;
}
.device-caption strong {
  font-weight: 600;
}
.device-caption small {
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.device-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(var(--v-theme-primary), 0.09);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 700;
}
.preview-error {
  padding: 16px;
  color: rgb(var(--v-theme-error));
}
</style>
