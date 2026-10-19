<script setup lang="ts">
import { computed, provide, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Timer, CircleCheck, ChartNoAxesColumn } from "lucide-vue-next";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import { themeConstantNumber } from "@/design-system/theme/constants";
import { isForcedRuntimeNavigation } from "@/runtime/forced-navigation";
import { YikeSessionKey, focusVariant } from "../session";
import { useYikeRuntime } from "../runtime";
import { yikeNavigation } from "../navigation";
import Focus from "./focus/Focus.vue";
import CheckIn from "./checkin/CheckIn.vue";
import Review from "./review/Review.vue";

const route = useRoute();
const router = useRouter();
const { store, session } = useYikeRuntime();
provide(YikeSessionKey, session);
watch(
  () => focusVariant(store),
  () => {
    if (
      route.params.screenSlug === "focus" &&
      !isForcedRuntimeNavigation() &&
      !store.presentation.preparing
    )
      void yikeNavigation(router, route, store).variant();
  },
  { flush: "sync" },
);
// Restored sessions open their actual recovery boundary before an entry check.
// Do not canonicalize authored fixture aliases (for example cross-day).
if (store.recoveryNeeded.value && route.params.screenSlug === "focus")
  void yikeNavigation(router, route, store).variant();
const active = computed(() => String(route.params.screenSlug));
const items = [
  { value: "focus", label: "专注", icon: Timer },
  { value: "checkin", label: "打卡", icon: CircleCheck },
  { value: "review", label: "回顾", icon: ChartNoAxesColumn },
];
const duration = themeConstantNumber("motion.duration-instant");
function tab(slug: string) {
  void yikeNavigation(router, route, store).tab(
    slug as "focus" | "checkin" | "review",
  );
}
</script>

<template>
  <PrototypeShell title="一刻" :screen-id="`yike.${active}`">
    <template #app-bar><span /></template>
    <TabViewport
      :key="store.presentation.revision"
      :model-value="active"
      :items="items"
      :swipe="false"
      :mouse-swipe="false"
      :keep-mounted="true"
      :transition-duration="duration"
      inspect-id="yike.root.viewport"
    >
      <template #item="{ value }">
        <Focus v-if="value === 'focus'" />
        <CheckIn v-else-if="value === 'checkin'" />
        <Review v-else-if="value === 'review'" />
      </template>
    </TabViewport>
    <template #navigation>
      <Tabbar
        :model-value="active"
        :items="items"
        :inspect-id="`yike.${active}.navigation`"
        @update:model-value="tab"
      />
    </template>
  </PrototypeShell>
</template>
