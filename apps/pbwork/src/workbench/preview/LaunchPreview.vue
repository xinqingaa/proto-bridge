<script setup lang="ts">
import { computed } from "vue";
import LaunchScreen from "@/design-system/components/navigation/LaunchScreen.vue";
import { loadComponentContract } from "@/design-system/loaders";
import type { PreviewDeviceSession } from "./model";
import brand from "./preview-brand.svg?url";
const props = defineProps<{ device: PreviewDeviceSession }>();
const states = loadComponentContract("contracts/launch-screen.json")!.states;
const state = computed(() => props.device.demo.scenarioId);
const values = computed(() => ({
  ...loadComponentContract("contracts/launch-screen.json")!.defaultProps,
  ...states.find((s) => s.id === state.value)?.props,
}));
</script>
<template>
  <div class="launch-preview">
    <nav aria-label="启动展示状态">
      <button
        type="button"
        :aria-pressed="!state"
        @click="device.demo.scenarioId = ''"
      >
        欢迎</button
      ><button
        v-for="item in states"
        :key="item.id"
        type="button"
        :data-preview-state="item.id"
        :aria-pressed="state === item.id"
        @click="device.demo.scenarioId = item.id"
      >
        {{ item.label }}
      </button>
    </nav>
    <LaunchScreen
      v-bind="values"
      :inspect-id="`preview.${device.id}.launch`"
      @start="device.demo.completed = true"
      ><template #brand
        ><div class="preview-brand">
          <img :src="brand" alt="PBWork 示例标识" /><strong>PBWork</strong
          ><small>中性品牌示例</small>
        </div></template
      ></LaunchScreen
    ><span v-if="device.demo.completed" class="launch-feedback" role="status"
      >已触发开始，路由由业务决定</span
    >
  </div>
</template>
<style scoped>
.launch-preview {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--pb-color-surface);
}
nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 16px;
  flex: none;
}
nav button {
  font: var(--pb-typography-caption);
  padding: 5px 8px;
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  color: var(--pb-color-on-surface-muted);
}
nav button[aria-pressed="true"] {
  background: var(--pb-color-surface-recessed);
  color: var(--pb-color-on-surface);
}
nav button:focus-visible {
  outline: var(--pb-border-focus);
}
.launch-preview :deep(.launch) {
  flex: 1;
  min-height: 0;
  padding-bottom: 48px;
}
.preview-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.preview-brand img {
  width: 80px;
  height: 80px;
}
.preview-brand strong {
  font: var(--pb-typography-title-lg);
}
.preview-brand small,
.launch-feedback {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.launch-feedback {
  padding: 16px;
  text-align: center;
}
</style>
