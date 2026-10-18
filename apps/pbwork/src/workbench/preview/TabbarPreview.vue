<script setup lang="ts">
import { computed } from "vue";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import { resolvePbIcon } from "@/design-system/components/_shared/icons";
import type { PreviewDeviceSession } from "./model";
const props = defineProps<{ device: PreviewDeviceSession }>();
const items = [
  { value: "home", label: "首页", icon: resolvePbIcon("home") },
  { value: "tasks", label: "任务", icon: resolvePbIcon("list") },
  { value: "profile", label: "我的", icon: resolvePbIcon("user") },
];
const active = computed({
  get: () => {
    const value =
      props.device.demo.session?.destination ??
      (props.device.demo.scenarioId === "tasks-selected" ? "tasks" : "home");
    return items.some((item) => item.value === value) ? String(value) : "home";
  },
  set: (destination: string) => {
    props.device.demo.session = { ...props.device.demo.session, destination };
    props.device.demo.scenarioId =
      destination === "tasks" ? "tasks-selected" : "";
  },
});
</script>
<template>
  <div
    class="tabbar-preview"
    data-tab-layout="equal"
    :data-preview-state="active === 'tasks' ? 'tasks-selected' : undefined"
  >
    <TabViewport
      v-model="active"
      :items="items"
      :swipe="false"
      :mouse-swipe="false"
      :inspect-id="`preview.${device.id}.tabbar.content`"
    >
      <template #item="{ value }">
        <section
          class="destination"
          :data-destination="value"
          :aria-label="items.find((item) => item.value === value)?.label"
        >
          <header>
            <span>{{
              value === "home"
                ? "今天，安排有序"
                : value === "tasks"
                  ? "一步一步，完成计划"
                  : "每一次积累，都有记录"
            }}</span>
            <h2>{{ items.find((item) => item.value === value)?.label }}</h2>
          </header>
          <template v-if="value === 'home'">
            <article class="summary">
              <span>今日概览</span><strong>把时间留给重要的事</strong>
              <p>查看安排，继续尚未完成的计划。</p>
            </article>
            <h3>接下来的安排</h3>
            <article
              v-for="(title, index) in [
                '整理今天的计划',
                '专注完成一件事',
                '留一点时间休息',
                '回顾今天的进展',
                '准备明天的安排',
              ]"
              :key="title"
            >
              <small>{{
                ["09:00", "10:30", "12:00", "17:00", "20:00"][index]
              }}</small
              ><strong>{{ title }}</strong>
              <p>
                {{
                  index % 2 ? "按自己的节奏继续。" : "让每一步都有清晰的方向。"
                }}
              </p>
            </article>
          </template>
          <template v-else-if="value === 'tasks'">
            <article class="summary">
              <span>待完成</span><strong>3 项任务</strong>
              <p>从最重要的一项开始。</p>
            </article>
            <article
              v-for="title in [
                '完成今日复盘',
                '整理项目资料',
                '制定下一步计划',
              ]"
              :key="title"
            >
              <small>进行中</small><strong>{{ title }}</strong>
              <p>今天 · 个人计划</p>
            </article>
          </template>
          <template v-else>
            <article class="summary">
              <span>个人空间</span><strong>保持自己的节奏</strong>
              <p>计划、记录和偏好都在这里。</p>
            </article>
            <article
              v-for="title in ['我的记录', '收藏的内容', '个人偏好']"
              :key="title"
            >
              <strong>{{ title }}</strong>
              <p>属于你的日常积累</p>
            </article>
          </template>
        </section>
      </template>
    </TabViewport>
    <Tabbar
      v-model="active"
      :items="items"
      :inspect-id="`preview.${device.id}.tabbar.navigation`"
    />
  </div>
</template>
<style scoped>
.tabbar-preview {
  position: relative;
  height: 100%;
  min-height: 100%;
  overflow: clip;
  background: var(--pb-color-background);
}
.tabbar-preview > :deep(.pb-tabbar-shell) {
  position: absolute;
  inset: auto 0 0;
}
.destination {
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: var(--pb-spacing-lg);
  padding-bottom: calc(
    var(--pb-size-navigation-bar) + var(--pb-spacing-2xl) + var(--pb-spacing-lg)
  );
  color: var(--pb-color-on-background);
  background: linear-gradient(
    var(--pb-color-primary-soft),
    var(--pb-color-background)
  );
}
.destination header {
  margin-bottom: var(--pb-spacing-lg);
}
.destination header span,
.destination small,
.destination p {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.destination h2 {
  font: var(--pb-typography-headline);
  margin: var(--pb-spacing-xs) 0 0;
}
.destination h3 {
  font: var(--pb-typography-subtitle);
  margin-block: var(--pb-spacing-lg) var(--pb-spacing-sm);
}
.destination article {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-lg);
  border-radius: var(--pb-radius-surface);
  background: var(--pb-color-surface);
  margin-bottom: var(--pb-spacing-sm);
}
.destination article strong {
  font: var(--pb-typography-subtitle);
}
.destination article p {
  margin: 0;
}
.destination .summary {
  background: var(--pb-color-surface);
  padding-block: var(--pb-spacing-2xl);
}
</style>
