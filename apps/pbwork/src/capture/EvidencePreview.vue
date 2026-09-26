<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Image, Maximize2 } from "lucide-vue-next";
import type { EvidenceCaseReadModel } from "@proto-bridge/core/v2/evidence-read-model";
import ScreenshotThumb from "@/capture/ScreenshotThumb.vue";
import type { ScreenMark } from "@/capture/screen-marks";
import { loadScreenshot } from "@/capture/screenshot-cache";

const props = defineProps<{
  bundleId: string;
  evidence: EvidenceCaseReadModel;
  title: string;
  marks?: ScreenMark[];
  activeMarkId?: string;
}>();

const emit = defineEmits<{
  measured: [size: { width: number; height: number }];
  selectMark: [id: string];
}>();

const selectedBlobId = ref("");
const selectedUrl = ref("");
const stageEl = ref<HTMLElement | null>(null);
const imageEl = ref<HTMLImageElement | null>(null);
const frame = ref({ left: 0, top: 0, width: 0, height: 0 });
const blobIds = computed(() => props.evidence.screenshotBlobIds);
let frameObserver: ResizeObserver | null = null;

watch(
  blobIds,
  (ids) => {
    if (!ids.includes(selectedBlobId.value)) {
      selectedBlobId.value = ids[0] ?? "";
    }
  },
  { immediate: true },
);

watch(
  () => [props.bundleId, selectedBlobId.value] as const,
  async ([bundleId, blobId]) => {
    selectedUrl.value = "";
    if (!blobId) return;
    try {
      const url = await loadScreenshot(bundleId, blobId);
      if (selectedBlobId.value === blobId && props.bundleId === bundleId) {
        selectedUrl.value = url;
      }
    } catch {
      selectedUrl.value = "";
    }
  },
  { immediate: true },
);

function openOriginal() {
  if (selectedUrl.value) {
    window.open(selectedUrl.value, "_blank", "noopener,noreferrer");
  }
}

function syncFrame() {
  const image = imageEl.value;
  const stage = stageEl.value;
  if (!image || !stage || !image.naturalWidth) return;
  const painted = image.getBoundingClientRect();
  const host = stage.getBoundingClientRect();
  frame.value = {
    left: painted.left - host.left,
    top: painted.top - host.top,
    width: painted.width,
    height: painted.height,
  };
  emit("measured", { width: image.naturalWidth, height: image.naturalHeight });
}

function markStyle(mark: ScreenMark) {
  return {
    left: `${frame.value.left + (mark.left / 100) * frame.value.width}px`,
    top: `${frame.value.top + (mark.top / 100) * frame.value.height}px`,
    width: `${(mark.width / 100) * frame.value.width}px`,
    height: `${(mark.height / 100) * frame.value.height}px`,
  };
}

watch(stageEl, (stage) => {
  frameObserver?.disconnect();
  frameObserver = null;
  if (!stage || typeof ResizeObserver === "undefined") return;
  frameObserver = new ResizeObserver(() => syncFrame());
  frameObserver.observe(stage);
});

onBeforeUnmount(() => frameObserver?.disconnect());
</script>

<template>
  <section class="evidence-preview">
    <header>
      <div class="preview-title">
        <span>采集画面</span>
        <h2>{{ title }}</h2>
      </div>
      <div class="header-actions">
        <slot name="actions" />
        <button
          v-if="selectedUrl"
          type="button"
          class="icon-action"
          aria-label="查看原图"
          @click="openOriginal"
        >
          <Maximize2 :size="16" />
        </button>
      </div>
    </header>

    <div ref="stageEl" class="preview-stage">
      <template v-if="selectedUrl">
        <img
          ref="imageEl"
          :src="selectedUrl"
          :alt="`${title} 截图`"
          @load="syncFrame"
        />
        <button
          v-for="mark in marks"
          :key="mark.id"
          type="button"
          class="screen-mark"
          :class="{ active: mark.id === activeMarkId }"
          :style="markStyle(mark)"
          :aria-label="mark.label"
          :aria-pressed="mark.id === activeMarkId"
          @click="emit('selectMark', mark.id)"
        />
      </template>
      <div v-else-if="blobIds.length" class="preview-empty">
        <Image :size="28" />
        <strong>正在读取画面…</strong>
      </div>
      <div v-else class="preview-empty">
        <Image :size="28" />
        <strong>没有可显示的截图</strong>
      </div>
    </div>

    <div v-if="blobIds.length > 1" class="shot-strip" aria-label="截图列表">
      <button
        v-for="(blobId, index) in blobIds"
        :key="blobId"
        type="button"
        :class="{ active: blobId === selectedBlobId }"
        @click="selectedBlobId = blobId"
      >
        <ScreenshotThumb
          :bundle-id="bundleId"
          :blob-id="blobId"
          :alt="`截图 ${index + 1}`"
          :width="116"
        />
        <span>{{ index + 1 }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.evidence-preview {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
}
header {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
header span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.72rem;
}
h2 {
  margin: 0;
  overflow: hidden;
  font-size: 0.92rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-title {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 8px;
}
.header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}
.icon-action {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.preview-stage {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
  background:
    linear-gradient(
        45deg,
        rgba(var(--v-theme-on-surface), 0.025) 25%,
        transparent 25%
      )
      0 0 / 20px 20px,
    linear-gradient(
        -45deg,
        rgba(var(--v-theme-on-surface), 0.025) 25%,
        transparent 25%
      )
      0 10px / 20px 20px;
}
.preview-stage > img {
  display: block;
  width: auto;
  height: auto;
  max-width: min(100%, 430px);
  max-height: 100%;
  border-radius: 10px;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.14);
}
.screen-mark {
  position: absolute;
  border: 1.5px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.12);
  cursor: pointer;
}
.screen-mark.active {
  z-index: 3;
  background: rgba(var(--v-theme-primary), 0.28);
}
.preview-empty {
  display: grid;
  margin: auto;
  justify-items: center;
  gap: 10px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.shot-strip {
  display: flex;
  min-height: 78px;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 14px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
.shot-strip button {
  position: relative;
  width: 58px;
  flex: 0 0 58px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  cursor: pointer;
}
.shot-strip button.active {
  border-color: rgb(var(--v-theme-primary));
}
.shot-strip :deep(.shot-thumb) {
  height: 54px;
}
.shot-strip span {
  position: absolute;
  right: 3px;
  bottom: 2px;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  font-size: 0.65rem;
}
</style>
