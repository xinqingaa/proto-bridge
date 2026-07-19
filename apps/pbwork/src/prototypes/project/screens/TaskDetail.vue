<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";

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
    <header class="app-bar" data-pb-role="app-bar" data-pb-id="task-detail.app-bar">
      <h1>任务详情</h1>
      <p>Variant：{{ variant }}</p>
    </header>

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
      <v-btn color="primary" class="mt-3" @click="sheetOpen = true"
        >打开操作</v-btn
      >
    </section>

    <BottomSheet v-model="sheetOpen" title="任务操作">
      <p>可在此进行指派、延期或完成。</p>
    </BottomSheet>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.app-bar {
  padding: 20px 16px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: var(--pb-color-surface, #fff);
}
.app-bar h1 {
  margin: 0 0 4px;
  font: var(--pb-typography-title, 650 20px/1.3 Inter, system-ui, sans-serif);
}
.app-bar p,
.panel p {
  margin: 0;
  opacity: 0.75;
}
.panel {
  padding: 16px;
}
.panel h2 {
  margin: 0 0 8px;
  font-size: 1.125rem;
}
.error {
  color: #b42318;
}
</style>
