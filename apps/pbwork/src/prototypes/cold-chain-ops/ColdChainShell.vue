<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
const props = defineProps<{
  title: string;
  screenId: string;
  backTo?: "exception-queue" | "shipment-detail";
}>();
const route = useRoute();
const router = useRouter();
function goBack() {
  void prototypeNavigation(router, route, "cold-chain-ops").back({
    slug: props.backTo ?? "exception-queue",
    query: { shipment: route.query.shipment ?? "SH-2048" },
  });
}
</script>
<template>
  <PrototypeShell
    :title="title"
    :screen-id="screenId"
    :show-back="Boolean(backTo)"
    @back="goBack"
    ><slot
  /></PrototypeShell>
</template>
