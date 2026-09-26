<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Image, Maximize2 } from "lucide-vue-next";
import type { EvidenceCaseReadModel } from "@proto-bridge/core/v2/evidence-read-model";
import ScreenshotThumb from "@/capture/ScreenshotThumb.vue";
import { loadScreenshot } from "@/capture/screenshot-cache";

const props = defineProps<{
  bundleId: string;
  evidence: EvidenceCaseReadModel;
  title: string;
}>();

const selectedBlobId = ref("");
const selectedUrl = ref("");
const blobIds = computed(() => props.evidence.screenshotBlobIds);

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
</script>

<template>
  <section class="evidence-preview">
    <header>
      <div>
        <span>采集画面</span>
        <h2>{{ title }}</h2>
      </div>
      <button
        v-if="selectedUrl"
        type="button"
        class="icon-action"
        aria-label="查看原图"
        @click="openOriginal"
      >
        <Maximize2 :size="16" />
      </button>
    </header>

    <div class="preview-stage">
      <img v-if="selectedUrl" :src="selectedUrl" :alt="`${title} 截图`" />
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
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
header span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.72rem;
}
h2 {
  margin: 3px 0 0;
  font-size: 1rem;
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
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
  overflow: hidden;
  padding: 12px;
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
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  object-position: center;
  border-radius: 10px;
  box-shadow: 0 16px 44px rgba(0, 0, 0, 0.14);
}
.preview-empty {
  display: grid;
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
