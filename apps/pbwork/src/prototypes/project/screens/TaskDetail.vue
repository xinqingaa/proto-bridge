<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppBar from "@/design-system/components/complex/AppBar.vue";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import Button from "@/design-system/components/basic/Button.vue";

const route = useRoute();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "overview",
);

const tab = ref("overview");
const sheetOpen = ref(false);

watch(
  variant,
  (value) => {
    if (value === "activity") tab.value = "activity";
    else if (value === "overview" || value === "error" || value === "sheet-open")
      tab.value = "overview";
    sheetOpen.value = value === "sheet-open";
  },
  { immediate: true },
);
</script>

<template>
  <div class="screen" data-pb-id="task-detail.root">
    <AppBar title="任务详情" />
    <p class="variant-hint">Variant：{{ variant }}</p>

    <Tabs
      v-model="tab"
      :items="[
        { value: 'overview', label: '概览' },
        { value: 'activity', label: '活动' },
      ]"
    />

    <section v-if="variant === 'error'" class="panel error" role="alert">
      无法加载任务详情
    </section>
    <section v-else-if="tab === 'activity'" class="panel">
      <p>张三 更新了状态</p>
      <p>李四 添加了评论</p>
    </section>
    <section v-else class="panel section" data-pb-role="section">
      <h2>整理需求</h2>
      <p>对齐交互状态与验收标准，输出可演示原型。</p>
      <Button class="mt-3" label="打开操作" @click="sheetOpen = true" />
    </section>

    <BottomSheet v-model="sheetOpen" title="任务操作">
      <p>可在此进行指派、延期或完成。</p>
    </BottomSheet>
  </div>
</template>

<style scoped>
.screen {
  position: relative;
  min-height: 100vh;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.variant-hint {
  margin: 0;
  padding: 8px 16px;
  color: color-mix(in srgb, var(--pb-color-on-surface, #1f2937) 60%, transparent);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.panel {
  padding: 16px;
}
.panel h2 {
  margin: 0 0 8px;
  font: var(--pb-typography-subtitle, 600 16px/1.4 Inter, system-ui, sans-serif);
}
.panel p {
  margin: 0 0 8px;
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
.error {
  color: var(--pb-color-error, #b42318);
}
.mt-3 {
  margin-top: 12px;
}
</style>
