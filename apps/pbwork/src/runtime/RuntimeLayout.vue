<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  shallowRef,
  watch,
  type Component,
} from "vue";
import { useRoute } from "vue-router";
import { screenViewModules } from "@/design-system/loaders";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import { resolveRuntimeRoute } from "@/runtime/url";

const route = useRoute();
const screenComponent = shallowRef<Component | null>(null);
const loadError = shallowRef<string | null>(null);

const resolved = computed(() =>
  resolveRuntimeRoute({
    prototypeId: String(route.params.prototypeId),
    screenSlug: String(route.params.screenSlug),
    searchParams: new URLSearchParams(
      route.fullPath.includes("?")
        ? route.fullPath.slice(route.fullPath.indexOf("?") + 1)
        : "",
    ),
  }),
);

const themeStyle = computed(() => {
  if (!resolved.value.ok) return {};
  try {
    return tokensToCssVars(resolveThemeTokens(resolved.value.theme.id));
  } catch {
    return {};
  }
});

const runtimeTheme = computed(() =>
  resolved.value.ok && resolved.value.theme.dark ? "pbworkDark" : "pbworkLight",
);

async function loadScreen() {
  screenComponent.value = null;
  loadError.value = null;
  if (!resolved.value.ok) return;

  const view = resolved.value.screen.view;
  const match = Object.entries(screenViewModules).find(
    ([path]) =>
      path.endsWith(`/${view}`) || path.endsWith(`/${view.replace(/^\//, "")}`),
  );
  if (!match) {
    loadError.value = `RUNTIME_ADAPTER_MISSING：${view}`;
    return;
  }
  screenComponent.value = defineAsyncComponent(
    match[1] as () => Promise<{ default: Component }>,
  );
}

watch(
  () => route.fullPath,
  () => {
    void loadScreen();
  },
  { immediate: true },
);

onMounted(() => {
  void loadScreen();
});
</script>

<template>
  <v-app
    :theme="runtimeTheme"
    class="runtime-app"
    :style="themeStyle"
    data-testid="runtime-root"
  >
    <v-main class="runtime-main">
      <component
        :is="screenComponent"
        v-if="resolved.ok && screenComponent && !loadError"
      />
      <section
        v-else
        class="runtime-error"
        role="alert"
        aria-live="assertive"
      >
        <p class="runtime-kicker">PBWork Runtime</p>
        <h1>无法打开原型</h1>
        <p>
          {{
            loadError ??
            (!resolved.ok ? resolved.message : "UNKNOWN_SCREEN")
          }}
        </p>
      </section>
    </v-main>
  </v-app>
</template>

<style scoped>
.runtime-main {
  min-height: 100vh;
}
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
