<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const prototypeId = computed(() => String(route.params.prototypeId));
const screenSlug = computed(() => String(route.params.screenSlug));
const themeQuery = computed(() => route.query.theme);
const variantQuery = computed(() => route.query.variant);

const runtimeTheme = computed(() =>
  themeQuery.value === "dark" ? "pbworkDark" : "pbworkLight",
);
const isKnownRuntime = computed(() => {
  if (
    !["light", "dark", undefined].includes(
      themeQuery.value as string | undefined,
    )
  )
    return false;
  return (
    prototypeId.value === "project" &&
    ["task-list", "task-detail"].includes(screenSlug.value)
  );
});
const title = computed(
  () => `${prototypeId.value}/${screenSlug.value} 原型运行时`,
);
</script>

<template>
  <v-app :theme="runtimeTheme" data-testid="runtime-root">
    <v-main class="runtime-main">
      <section v-if="isKnownRuntime" class="runtime-page" :aria-label="title">
        <p class="runtime-kicker">PBWork Runtime</p>
        <h1>{{ screenSlug === "task-list" ? "任务列表" : "任务详情" }}</h1>
        <p>
          Variant：{{
            typeof variantQuery === "string" ? variantQuery : "default"
          }}
        </p>
      </section>
      <section v-else class="runtime-error" role="alert" aria-live="assertive">
        <p class="runtime-kicker">PBWork Runtime</p>
        <h1>无法打开原型</h1>
        <p>UNKNOWN_SCREEN：{{ prototypeId }}/{{ screenSlug }}</p>
      </section>
    </v-main>
  </v-app>
</template>

<style scoped>
.runtime-main {
  min-height: 100vh;
}
.runtime-page,
.runtime-error {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 32px 24px;
}
.runtime-kicker {
  margin: 0 0 8px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
h1 {
  margin: 0 0 12px;
  font-size: 1.5rem;
}
</style>
