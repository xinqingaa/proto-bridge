<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import ContinueDirection from "./variants/ContinueDirection.vue";
import QueueDirection from "./variants/QueueDirection.vue";
import ConfidenceDirection from "./variants/ConfidenceDirection.vue";
import GalleryDirection from "./variants/GalleryDirection.vue";
import "./workbench-overview-draft.css";

type DirectionId = "continue" | "queue" | "confidence" | "gallery";

const route = useRoute();
const router = useRouter();

const directions: Array<{
  id: DirectionId;
  label: string;
  job: string;
  thesis: string;
}> = [
  {
    id: "continue",
    label: "续作台",
    job: "恢复上次工作",
    thesis: "打开 PBWork，作品仍停在离开时的位置。",
  },
  {
    id: "queue",
    label: "今日队列",
    job: "决定先做什么",
    thesis: "概览不是汇报，而是一张有取舍的今日工作单。",
  },
  {
    id: "confidence",
    label: "交付雷达",
    job: "判断能否交付",
    thesis: "先看证据缺口，再决定继续设计还是进入交付。",
  },
  {
    id: "gallery",
    label: "原型画廊",
    job: "理解作品全貌",
    thesis: "让真实页面成为索引，数据只做安静的注脚。",
  },
];

const direction = computed<DirectionId>(() => {
  const value = String(route.query.direction ?? "continue");
  return directions.some((item) => item.id === value)
    ? (value as DirectionId)
    : "continue";
});

const active = computed(
  () =>
    directions.find((item) => item.id === direction.value) ?? directions[0]!,
);

const activeComponent = computed(() => {
  if (direction.value === "queue") return QueueDirection;
  if (direction.value === "confidence") return ConfidenceDirection;
  if (direction.value === "gallery") return GalleryDirection;
  return ContinueDirection;
});

function selectDirection(next: DirectionId) {
  void router.replace({ query: { ...route.query, direction: next } });
}
</script>

<template>
  <main class="wbo-lab">
    <header class="wbo-lab-head">
      <div>
        <span>PBWork 概览 · 方向探索</span>
        <strong>{{ active.job }}</strong>
        <p>{{ active.thesis }}</p>
      </div>
      <nav class="wbo-switch" aria-label="视觉方向">
        <button
          v-for="item in directions"
          :key="item.id"
          type="button"
          :class="{ 'is-active': direction === item.id }"
          :aria-pressed="direction === item.id"
          @click="selectDirection(item.id)"
        >
          <strong>{{ item.label }}</strong>
          <small>{{ item.job }}</small>
        </button>
      </nav>
    </header>

    <section class="wbo-preview">
      <component :is="activeComponent" :key="direction" />
    </section>

    <p class="wbo-note">
      独立视觉探索，不进入 Registry、Capture 或 Handoff。Runtime
      预览使用真实页面；覆盖与活动数据为确定性示例。
    </p>
  </main>
</template>
