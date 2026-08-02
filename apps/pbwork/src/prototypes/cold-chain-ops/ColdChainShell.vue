<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppBar from "@/design-system/components/complex/AppBar.vue";
import { coldChainPath } from "./nav";

const props = defineProps<{
  title: string;
  screenId: string;
  backTo?: "exception-queue" | "shipment-detail";
}>();

const route = useRoute();
const router = useRouter();
const isStack = computed(() => Boolean(props.backTo));

function goBack() {
  const position = Number(window.history.state?.position ?? 0);
  if (position > 0 && window.parent === window) {
    router.back();
    return;
  }
  void router.replace(coldChainPath(route, props.backTo ?? "exception-queue"));
}
</script>

<template>
  <div class="cold-chain-shell" :class="{ 'is-stack': isStack }">
    <AppBar
      :title="title"
      :show-back="isStack"
      :inspect-id="`${screenId}.app-bar`"
      @back="goBack"
    />
    <main><slot /></main>
  </div>
</template>

<style scoped>
.cold-chain-shell {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}
main {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
:global(html.pbwork-runtime-embedded) .cold-chain-shell {
  min-height: 100%;
  max-height: 100%;
}
</style>
