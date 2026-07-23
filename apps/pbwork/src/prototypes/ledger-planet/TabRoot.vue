<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell, {
  type LedgerTab,
} from "./LedgerPlanetShell.vue";
import LedgerPanel from "./panels/LedgerPanel.vue";
import BenefitsPanel from "./panels/BenefitsPanel.vue";
import MePanel from "./panels/MePanel.vue";
import { HOME_TAB, pushStack } from "./nav";
import { readTab, rememberTab } from "./tab-session";
import { ensureTheme } from "./theme-session";

const props = defineProps<{ tab: LedgerTab }>();

const route = useRoute();
const router = useRouter();

ensureTheme(
  typeof route.query.theme === "string" ? route.query.theme : undefined,
);

const active = ref<LedgerTab>(readTab(props.tab));

watch(
  () => props.tab,
  (value) => {
    const slug = String(route.params.screenSlug ?? "");
    // Deep-link / workbench open of a specific home: trust URL.
    if (HOME_TAB[slug] === value) {
      active.value = value;
      rememberTab(value);
    }
  },
);

watch(
  active,
  (value) => {
    rememberTab(value);
  },
  { immediate: true },
);

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
