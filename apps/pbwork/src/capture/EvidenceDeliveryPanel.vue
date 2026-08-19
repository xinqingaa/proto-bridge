<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, Copy, FileWarning, LoaderCircle } from "lucide-vue-next";
import type { DeliveryDetail } from "@proto-bridge/core/v2/service-contract";
import { useCaptureStore } from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { captureServiceClient } from "@/capture/service-client";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";

const props = defineProps<{
  bundleId: string;
  snapshotId: string;
}>();

const capture = useCaptureStore();
const lifecycle = usePrototypeLifecycleStore();
const detail = ref<DeliveryDetail | null>(null);
const loading = ref(false);
const copied = ref(false);

const lifecycleRecord = computed(() =>
  lifecycle.finalizedRecords.find(
    (record) =>
      record.artifacts?.bundleId === props.bundleId &&
      record.artifacts.snapshotId === props.snapshotId,
  ),
);
const deliveryId = computed(
  () => lifecycleRecord.value?.artifacts?.deliveryId ?? "",
);

async function loadDelivery() {
  detail.value = null;
  if (!deliveryId.value) return;
  loading.value = true;
  try {
    detail.value = await captureServiceClient.deliveryDetails(deliveryId.value);
  } catch (error) {
    capture.setError(error);
  } finally {
    loading.value = false;
  }
}

async function copyPrompt() {
  if (!detail.value?.agentPrompt) return;
  await navigator.clipboard.writeText(detail.value.agentPrompt);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1400);
}

watch(
  () => [props.bundleId, props.snapshotId, deliveryId.value],
  () => void loadDelivery(),
  { immediate: true },
);
</script>

<template>
  <section class="delivery-panel" data-testid="evidence-delivery-panel">
    <div v-if="detail" class="delivery-toolbar">
      <div>
        <strong>定稿提示词</strong>
        <small>生命周期固定的唯一版本</small>
      </div>
      <WorkbenchButton size="small" tone="neutral" @click="copyPrompt">
        <Check v-if="copied" :size="14" />
        <Copy v-else :size="14" />
        {{ copied ? "已复制" : "复制提示词" }}
      </WorkbenchButton>
    </div>

    <div v-if="loading" class="delivery-empty">
      <LoaderCircle :size="20" class="spin" />正在读取定稿提示词…
    </div>
    <pre
      v-else-if="detail"
      class="prompt-body"
      data-testid="saved-agent-prompt"
      >{{ detail.agentPrompt }}</pre
    >
    <div v-else class="delivery-empty is-error">
      <FileWarning :size="24" />
      <strong>定稿提示词不可用</strong>
      <p>这不是可重新生成的状态。请回到生命周期页检查定稿产物。</p>
    </div>

    <details v-if="detail" class="delivery-more">
      <summary>固定引用</summary>
      <dl>
        <dt>交付 ID</dt>
        <dd>{{ detail.deliveryId }}</dd>
        <dt>Handoff ID</dt>
        <dd data-testid="handoff-id">{{ detail.handoffId }}</dd>
        <dt>提示词路径</dt>
        <dd>{{ detail.agentPromptPath }}</dd>
        <dt>证据版本</dt>
        <dd>{{ detail.snapshotId }}</dd>
      </dl>
    </details>
  </section>
</template>

<style scoped>
.delivery-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}
.delivery-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.delivery-toolbar > div {
  display: grid;
  gap: 2px;
}
.delivery-toolbar strong {
  font-size: 0.78rem;
}
.delivery-toolbar small {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.66rem;
}
.prompt-body {
  min-height: 260px;
  max-height: 55vh;
  margin: 0;
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  font: 0.75rem/1.65 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
.delivery-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 32px 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  text-align: center;
}
.delivery-empty.is-error {
  color: rgb(var(--v-theme-error));
}
.delivery-empty p {
  max-width: 42ch;
  margin: 0;
  font-size: 0.75rem;
}
.delivery-more {
  padding-top: 10px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  font-size: 0.75rem;
}
.delivery-more summary {
  cursor: pointer;
}
dl {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 6px;
}
dt {
  color: rgba(var(--v-theme-on-surface), 0.52);
}
dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
