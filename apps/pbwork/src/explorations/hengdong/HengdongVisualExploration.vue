<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Moon, RotateCcw, Sun } from "lucide-vue-next";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import BreathRingDirection from "./variants/BreathRingDirection.vue";
import MovementSequenceDirection from "./variants/MovementSequenceDirection.vue";
import MovementStageDirection from "./variants/MovementStageDirection.vue";
import "./hengdong-exploration.css";

type DirectionId = "ring" | "sequence" | "stage";
type ViewId = "today" | "workout";

const route = useRoute();
const router = useRouter();
const paused = ref(false);
const exerciseIndex = ref(1);
const completed = ref(false);

const directions: Array<{
  id: DirectionId;
  label: string;
  axis: string;
}> = [
  { id: "ring", label: "呼吸环", axis: "目标感" },
  { id: "sequence", label: "动作序列", axis: "过程感" },
  { id: "stage", label: "动作舞台", axis: "沉浸感" },
];

const direction = computed<DirectionId>(() => {
  const value = String(route.query.direction ?? "ring");
  return directions.some((item) => item.id === value)
    ? (value as DirectionId)
    : "ring";
});
const view = computed<ViewId>(() =>
  route.query.view === "workout" ? "workout" : "today",
);
const theme = computed(() => (route.query.theme === "dark" ? "dark" : "light"));
const focusMode = computed(() => route.query.focus === "1");
const themeStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens(theme.value)),
);
const activeComponent = computed(() => {
  if (direction.value === "sequence") return MovementSequenceDirection;
  if (direction.value === "stage") return MovementStageDirection;
  return BreathRingDirection;
});

function updateQuery(next: Partial<{ direction: DirectionId; view: ViewId; theme: string }>) {
  void router.replace({
    query: {
      ...route.query,
      direction: next.direction ?? direction.value,
      view: next.view ?? view.value,
      theme: next.theme ?? theme.value,
    },
  });
}

function setView(next: ViewId) {
  paused.value = false;
  updateQuery({ view: next });
}

function completeExercise() {
  paused.value = false;
  if (exerciseIndex.value >= 3) {
    completed.value = true;
    exerciseIndex.value = 1;
    setView("today");
    return;
  }
  exerciseIndex.value += 1;
}

function resetExploration() {
  paused.value = false;
  exerciseIndex.value = 1;
  completed.value = false;
  void router.replace({
    query: { direction: "ring", view: "today", theme: "light" },
  });
}
</script>

<template>
  <main class="hdx-lab" :class="{ 'is-focus-mode': focusMode }" :style="themeStyle">
    <header class="hdx-lab-header">
      <div class="hdx-lab-title">
        <span>恒动 / 视觉实验</span>
        <strong>同一产品，三种视觉组织</strong>
      </div>

      <div class="hdx-lab-actions">
        <button
          class="hdx-toolbar-button"
          type="button"
          :aria-label="theme === 'light' ? '切换深色主题' : '切换浅色主题'"
          @click="updateQuery({ theme: theme === 'light' ? 'dark' : 'light' })"
        >
          <Moon v-if="theme === 'light'" aria-hidden="true" />
          <Sun v-else aria-hidden="true" />
        </button>
        <button
          class="hdx-toolbar-button"
          type="button"
          aria-label="重置探索状态"
          @click="resetExploration"
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </header>

    <nav class="hdx-direction-switch" aria-label="视觉方向">
      <button
        v-for="item in directions"
        :key="item.id"
        type="button"
        :class="{ 'is-active': direction === item.id }"
        :aria-pressed="direction === item.id"
        @click="updateQuery({ direction: item.id })"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.axis }}</span>
      </button>
    </nav>

    <section class="hdx-preview-area">
      <div class="hdx-view-switch" aria-label="页面场景">
        <button
          type="button"
          :class="{ 'is-active': view === 'today' }"
          :aria-pressed="view === 'today'"
          @click="setView('today')"
        >
          今天页
        </button>
        <button
          type="button"
          :class="{ 'is-active': view === 'workout' }"
          :aria-pressed="view === 'workout'"
          @click="setView('workout')"
        >
          训练页
        </button>
      </div>

      <div class="hdx-device" :data-direction="direction">
        <component
          :is="activeComponent"
          :view="view"
          :paused="paused"
          :exercise-index="exerciseIndex"
          :completed="completed"
          @start="setView('workout')"
          @back="setView('today')"
          @toggle-pause="paused = !paused"
          @complete="completeExercise"
        />
      </div>
    </section>
  </main>
</template>
