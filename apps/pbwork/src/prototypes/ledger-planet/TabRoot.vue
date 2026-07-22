<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell, {
  type LedgerTab,
} from "./LedgerPlanetShell.vue";
import LedgerPanel from "./panels/LedgerPanel.vue";
import BenefitsPanel from "./panels/BenefitsPanel.vue";
import MePanel from "./panels/MePanel.vue";

const props = defineProps<{ tab: LedgerTab }>();

const route = useRoute();
const router = useRouter();
const active = ref<LedgerTab>(props.tab);

watch(
  () => props.tab,
  (value) => {
    active.value = value;
  },
);

const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);

const title = computed(() => active.value);
const showAnalytics = computed(() => active.value === "记账");
const showAdd = computed(() => active.value === "记账");
const showSettings = computed(() => active.value === "我的");

function go(slug: string) {
  void router.push(
    `/prototype/ledger-planet/${slug}?variant=default&theme=${theme.value}`,
  );
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
