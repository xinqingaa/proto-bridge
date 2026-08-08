<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, Copy, FileText, RefreshCw } from "lucide-vue-next";
import type {
  DeliveryDetail,
  DeliveryListItem,
} from "@proto-bridge/core/v2/service-contract";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";

const props = defineProps<{
  bundleId: string;
  snapshotId: string;
}>();

const capture = useCaptureStore();
const deliveries = ref<DeliveryListItem[]>([]);
const selectedDeliveryId = ref("");
const detail = ref<DeliveryDetail | null>(null);
const loading = ref(false);
const copied = ref(false);

const snapshotDeliveries = computed(() =>
  deliveries.value.filter((item) => item.snapshotId === props.snapshotId),
);

async function loadDelivery(deliveryId: string) {
  if (!deliveryId) {
    detail.value = null;
    return;
  }
  loading.value = true;
  try {
    detail.value = await captureServiceClient.deliveryDetails(deliveryId);
  } catch (error) {
    capture.setError(error);
    detail.value = null;
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  loading.value = true;
  try {
    const result = await captureServiceClient.listDeliveries(props.bundleId);
    deliveries.value = result.deliveries;
    const next =
      snapshotDeliveries.value.find(
        (item) => item.deliveryId === selectedDeliveryId.value,
      ) ?? snapshotDeliveries.value[0];
    selectedDeliveryId.value = next?.deliveryId ?? "";
    if (next) {
      detail.value = await captureServiceClient.deliveryDetails(
        next.deliveryId,
      );
    } else {
      detail.value = null;
    }
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

async function createDelivery() {
  if (capture.currentSnapshotHandoffs.length) {
    await capture.regenerateCurrentPrompt();
    await refresh();
    return;
  }
  capture.openHandoffSheet();
}

watch(
  () => [props.bundleId, props.snapshotId],
  () => void refresh(),
  { immediate: true },
);
watch(selectedDeliveryId, (deliveryId) => void loadDelivery(deliveryId));
watch(
  () => capture.deliveryArtifact?.deliveryId,
  () => void refresh(),
);
</script>

<template>
  <section class="delivery-panel" data-testid="evidence-delivery-panel">
    <div v-if="snapshotDeliveries.length" class="delivery-toolbar">
      <select v-model="selectedDeliveryId" aria-label="选择 Agent 提示词版本">
        <option
          v-for="item in snapshotDeliveries"
          :key="item.deliveryId"
          :value="item.deliveryId"
        >
          {{ new Date(item.createdAt).toLocaleString("zh-CN") }}
          {{ item.freshnessStatus === "stale" ? " · 已过期" : "" }}
        </option>
      </select>
      <WorkbenchButton size="small" tone="neutral" @click="copyPrompt">
        <Check v-if="copied" :size="14" />
        <Copy v-else :size="14" />
        {{ copied ? "已复制" : "复制" }}
      </WorkbenchButton>
    </div>

    <div v-if="loading && !detail" class="delivery-empty">
      <RefreshCw :size="18" class="spin" />正在读取提示词…
    </div>
    <pre
      v-else-if="detail"
      class="prompt-body"
      data-testid="saved-agent-prompt"
      >{{ detail.agentPrompt }}</pre>
    <div v-else class="delivery-empty">
      <FileText :size="24" />
      <strong>这份采集结果还没有 Agent 提示词</strong>
      <p>证据已经保存，不需要重新采集。</p>
      <WorkbenchButton
        tone="primary"
        :loading="capture.busy"
        @click="createDelivery"
      >
        生成 Agent 提示词
      </WorkbenchButton>
    </div>

    <details v-if="detail" class="delivery-more">
      <summary>交付信息</summary>
      <dl>
        <dt>交付 ID</dt>
        <dd>{{ detail.deliveryId }}</dd>
        <dt>提示词路径</dt>
        <dd>{{ detail.agentPromptPath }}</dd>
        <dt>证据版本</dt>
        <dd>{{ detail.snapshotId }}</dd>
      </dl>
      <WorkbenchButton
        size="small"
        tone="neutral"
        :loading="capture.busy"
        @click="createDelivery"
      >
        新建交付版本
      </WorkbenchButton>
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
  gap: 8px;
}
select {
  min-width: 0;
  flex: 1;
  padding: 7px 9px;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
}
.prompt-body {
  min-height: 260px;
  max-height: 55vh;
  margin: 0;
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  font:
    0.75rem/1.65 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
.delivery-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 32px 12px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.delivery-empty p {
  margin: 0;
  font-size: 0.78rem;
}
.delivery-more {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  padding-top: 10px;
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
