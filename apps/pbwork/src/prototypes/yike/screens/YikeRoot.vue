<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Timer, CircleCheck, ChartNoAxesColumn } from "lucide-vue-next";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import { themeConstantNumber } from "@/design-system/theme/constants";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import Focus from "./focus/Focus.vue";
import CheckIn from "./checkin/CheckIn.vue";
import Review from "./review/Review.vue";

const route = useRoute();
const router = useRouter();
const active = computed(() => String(route.params.screenSlug));
const items = [
  { value: "focus", label: "专注", icon: Timer },
  { value: "checkin", label: "打卡", icon: CircleCheck },
  { value: "review", label: "回顾", icon: ChartNoAxesColumn },
];
const duration = themeConstantNumber("motion.duration-instant");
function tab(slug: string) { void prototypeNavigation(router, route, "yike").tab(slug); }
</script>

<template>
  <PrototypeShell title="一刻" :screen-id="`yike.${active}`">
    <template #app-bar><span /></template>
    <TabViewport :model-value="active" :items="items" :swipe="false" :mouse-swipe="false" :keep-mounted="true" :transition-duration="duration" inspect-id="yike.root.viewport">
      <template #item="{ value }">
        <Focus v-if="value === 'focus'" />
        <CheckIn v-else-if="value === 'checkin'" />
        <Review v-else-if="value === 'review'" />
      </template>
    </TabViewport>
    <template #navigation>
      <Tabbar :model-value="active" :items="items" :inspect-id="`yike.${active}.navigation`" @update:model-value="tab" />
    </template>
  </PrototypeShell>
</template>
