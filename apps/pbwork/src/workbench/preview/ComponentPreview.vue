<script setup lang="ts">
import { previewExtensions } from "./extensions/registry";
import ExtensionSample from "./extensions/ExtensionSample.vue";
import { computed } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import PreviewComparison from "./PreviewComparison.vue";
import ComponentDeviceSample from "./ComponentDeviceSample.vue";
import ComponentSample from "./ComponentSample.vue";
import { componentRecords } from "@/design-system/components/registry";
import { loadComponentContract } from "@/design-system/loaders";
const props = defineProps<{ componentId: string }>();
const requested = computed(() =>
  previewExtensions.find((entry) => entry.id === props.componentId),
);
const record = computed(() =>
  componentRecords.find((c) => c.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
);
const tokenIds = computed(
  () =>
    requested.value?.tokenIds ?? [
      ...new Set(Object.values(contract.value?.tokenBindings ?? {})),
    ],
);
function extensionFor(device: import("./model").PreviewDeviceSession) {
  return (
    previewExtensions.find((entry) => entry.id === device.demo.extensionId) ??
    requested.value
  );
}
</script>
<template>
  <ResourcePageShell
    :title="requested?.label ?? record!.label"
    :description="requested?.description ?? record!.description"
    :eyebrow="
      requested ? `${requested.ownerPrototypeId} · 自有组件` : 'DS 基础组件'
    "
  >
    <PreviewComparison
      :key="componentId"
      :resource-id="componentId"
      :token-ids="tokenIds"
      :initial-context="
        requested ? `prototype:${requested.ownerPrototypeId}` : undefined
      "
    >
      <template #default="sample"
        ><ExtensionSample
          v-if="extensionFor(sample.device)"
          :extension="extensionFor(sample.device)!"
          :device="sample.device"
          :attach="sample.attach"
          :table="sample.table" /><ComponentSample
          v-else-if="['button', 'bottom-sheet'].includes(componentId)"
          :component-id="componentId"
          :attach="sample.attach"
          :device="sample.device" /><ComponentDeviceSample
          v-else
          :component-id="componentId"
          :attach="sample.attach"
          :device="sample.device"
      /></template>
    </PreviewComparison>
    <details v-if="contract" class="component-reference">
      <summary>用途、Contract 与 Token 绑定</summary>
      <p>{{ contract.summary }}</p>
      <ul>
        <li v-for="rule in contract.behavior" :key="rule">{{ rule }}</li>
      </ul>
      <dl>
        <div v-for="(token, slot) in contract.tokenBindings" :key="slot">
          <dt>{{ slot }}</dt>
          <dd>{{ token }}</dd>
        </div>
      </dl>
    </details>
  </ResourcePageShell>
</template>
<style scoped>
.component-reference {
  font-size: 12px;
}
.component-reference summary {
  cursor: pointer;
}
.component-reference dl > div {
  display: flex;
  gap: 16px;
  padding-block: 4px;
}
.component-reference dd {
  margin: 0;
}
</style>
