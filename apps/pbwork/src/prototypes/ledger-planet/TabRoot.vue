<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell, { type LedgerTab } from "./LedgerPlanetShell.vue";
import LedgerPanel from "./panels/LedgerPanel.vue";
import BenefitsPanel from "./panels/BenefitsPanel.vue";
import MePanel from "./panels/MePanel.vue";
import { ensureRootEntry, HOME_TAB, pushStack, switchTab } from "./nav";
import { ensureTheme } from "./theme-session";

const route = useRoute();
const router = useRouter();

ensureTheme(
  typeof route.query.theme === "string" ? route.query.theme : undefined,
);

const routeTab = () =>
  HOME_TAB[String(route.params.screenSlug ?? "")] ?? "记账";
const active = ref<LedgerTab>(routeTab());
let tabSyncTimer: number | null = null;
let tabSyncVersion = 0;

watch(
  () => route.params.screenSlug,
  () => {
    const value = routeTab();
    active.value = value;
    void ensureRootEntry(router, route, value);
  },
  { immediate: true },
);

watch(active, (value, previous) => {
  if (value !== previous && value !== routeTab()) {
    if (tabSyncTimer) window.clearTimeout(tabSyncTimer);
    const version = ++tabSyncVersion;
    tabSyncTimer = window.setTimeout(() => {
      tabSyncTimer = null;
      if (version !== tabSyncVersion || active.value !== value) return;
      void switchTab(router, route, value);
    }, 180);
  }
});

onBeforeUnmount(() => {
  if (tabSyncTimer) window.clearTimeout(tabSyncTimer);
});

const title = computed(() => active.value);
const showAnalytics = computed(() => active.value === "记账");
const showAdd = computed(() => active.value === "记账");
const showSettings = computed(() => active.value === "我的");

function go(slug: string) {
  void pushStack(router, route, active.value, slug);
}
</script>

<template>
  <LedgerPlanetShell
    :title="title"
    v-model:active="active"
    :show-analytics="showAnalytics"
    :show-add="showAdd"
    :show-settings="showSettings"
    @analytics="go('analytics')"
    @add="go('record-edit')"
    @settings="go('settings')"
  >
    <template #记账>
      <LedgerPanel />
    </template>
    <template #权益>
      <BenefitsPanel />
    </template>
    <template #我的>
      <MePanel />
    </template>
  </LedgerPlanetShell>
</template>
