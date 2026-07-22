<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useCanvasStore } from "@/app/stores/canvas";
import { getDevicePreset } from "@/workbench/canvas/devices";
import DeviceFrame from "@/workbench/canvas/DeviceFrame.vue";

defineProps<{
  src: string;
  iframeTitle: string;
  isDark: boolean;
}>();

const emit = defineEmits<{
  iframeLoad: [contentWindow: Window | null];
}>();

const canvas = useCanvasStore();
const stageRef = ref<HTMLElement | null>(null);

const device = computed(() => getDevicePreset(canvas.deviceId));
const pointerEvents = computed(() =>
  canvas.toolMode === "pan" ? "none" : "auto",
);

const stageTransform = computed(
  () =>
    `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
);

const reduceMotion = ref(false);
let panDragging = false;
let lastX = 0;
let lastY = 0;

function onPanPointerDown(event: PointerEvent) {
  if (canvas.toolMode !== "pan") return;
  if (event.button !== 0) return;
  panDragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  stageRef.value?.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!panDragging) return;
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  canvas.nudgePan(dx, dy);
}

function endPointer(event: PointerEvent) {
  if (!panDragging) return;
  panDragging = false;
  try {
    stageRef.value?.releasePointerCapture(event.pointerId);
  } catch {
    /* already released */
  }
}

function onIframeLoad() {
  const frame = stageRef.value?.querySelector(
    "iframe",
  ) as HTMLIFrameElement | null;
  emit("iframeLoad", frame?.contentWindow ?? null);
}

function onWheel(event: WheelEvent) {
  if (!(event.metaKey || event.ctrlKey)) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.08 : 0.08;
  canvas.setZoom(canvas.zoom + delta);
}

onMounted(() => {
  reduceMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
});

onBeforeUnmount(() => {
  panDragging = false;
});
</script>

<template>
  <div
    ref="stageRef"
    class="phone-stage"
    :class="{
      'is-dark': isDark,
      'is-panning': canvas.toolMode === 'pan',
      'reduce-motion': reduceMotion,
    }"
    data-testid="phone-stage"
    @pointerdown="onPanPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endPointer"
    @pointercancel="endPointer"
    @wheel="onWheel"
  >
    <div class="stage-world" :style="{ transform: stageTransform }">
      <DeviceFrame
        :device="device"
        :src="src"
        :title="iframeTitle"
        :is-dark="isDark"
        :pointer-events="pointerEvents"
        @load="onIframeLoad"
      />
    </div>
  </div>
</template>

<style scoped>
.phone-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #e5e7ea;
  cursor: default;
  touch-action: none;
  user-select: none;
  padding-bottom: 72px;
}

.phone-stage.is-dark {
  background: #101113;
}

.phone-stage.is-panning {
  cursor: grab;
}

.phone-stage.is-panning:active {
  cursor: grabbing;
}

.stage-world {
  transform-origin: center center;
  will-change: transform;
  transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.phone-stage.reduce-motion .stage-world {
  transition: none;
}
</style>
