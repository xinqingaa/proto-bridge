<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { PreviewDeviceSession } from "../model";
import { extensionApplicable, type PreviewExtension } from "./model";
import { extensionPreviewModules } from "./registry";
const props = defineProps<{
  extension: PreviewExtension;
  ownerThemePackId?: string | undefined;
  device: PreviewDeviceSession;
  attach: string;
  table: ResolvedThemeTable;
}>();
const applicable = computed(() =>
  extensionApplicable(
    props.extension,
    props.table.identity.packId,
    props.ownerThemePackId,
  ),
);
const view = computed(() => {
  const loader = extensionPreviewModules.get(props.extension.preview);
  return loader
    ? defineAsyncComponent({
        loader: async () =>
          (await (loader as () => Promise<{ default: Component }>)()).default,
        onError(_error, _retry, fail) {
          fail();
        },
      })
    : undefined;
});
</script>
<template>
  <section class="extension-sample" :data-preview-extension="extension.id">
    <header>
      <h2>{{ extension.label }}</h2>
      <p>{{ extension.description }}</p>
      <small
        >{{ extension.ownerPrototypeId }} ·
        {{
          extension.kind === "variant"
            ? `基于 ${extension.baseComponentId}`
            : "原型自有组件"
        }}</small
      >
    </header>
    <p v-if="!applicable" role="status">不适用：请选择所属原型使用的主题包。</p>
    <component
      v-else-if="view"
      :is="view"
      :device="device"
      :attach="attach"
      :table="table"
      :states="extension.states"
    />
    <p v-else role="alert">预览实现不存在：{{ extension.preview }}</p>
  </section>
</template>
<style scoped>
.extension-sample {
  padding: var(--pb-spacing-md);
  font: var(--pb-typography-content);
  color: var(--pb-color-on-background);
}
h2 {
  font: var(--pb-typography-title);
}
small {
  color: var(--pb-color-on-surface-muted);
}
</style>
