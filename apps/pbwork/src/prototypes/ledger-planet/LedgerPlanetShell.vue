<script setup lang="ts">
import { computed, useSlots } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BookOpen, Gift, User, BarChart3 } from "lucide-vue-next";
import AppBar from "@/design-system/components/complex/AppBar.vue";
import BottomNavigation from "@/design-system/components/complex/BottomNavigation.vue";
import IconButton from "@/design-system/components/basic/IconButton.vue";

export type LedgerTab = "记账" | "权益" | "我的";

const props = defineProps<{
  title: string;
  active?: LedgerTab;
  backTo?: string;
  showAnalytics?: boolean;
  showAdd?: boolean;
  showSettings?: boolean;
}>();

const emit = defineEmits<{
  analytics: [];
  add: [];
  settings: [];
  "update:active": [LedgerTab];
}>();

const route = useRoute();
const router = useRouter();
const slots = useSlots();
const isStack = computed(() => Boolean(props.backTo));
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const inspectBaseId = computed(
  () => `ledger-planet.${String(route.params.screenSlug ?? "screen")}`,
);

const navItems = [
  { value: "记账", label: "记账", icon: BookOpen },
  { value: "权益", label: "权益", icon: Gift },
  { value: "我的", label: "我的", icon: User },
];

const activeTab = computed({
  get: () => props.active ?? "记账",
  set: (value: string) => {
    emit("update:active", value as LedgerTab);
  },
});

const hasTabSlots = computed(
  () => Boolean(slots["记账"] || slots["权益"] || slots["我的"]),
);

function runtimePath(slug: string, variant = "default") {
  const currentVariant =
    typeof route.query.variant === "string" ? route.query.variant : variant;
  return `/prototype/ledger-planet/${slug}?variant=${currentVariant}&theme=${theme.value}`;
}

function goBack() {
  const position = Number(window.history.state?.position ?? 0);
  if (position > 0) {
    router.back();
    return;
  }
  void router.replace(runtimePath(props.backTo ?? "ledger-home"));
}
</script>

<template>
  <div
    class="ledger-planet-shell"
    :class="{ 'is-stack': isStack, 'is-tabs': !isStack && hasTabSlots }"
    :data-pb-id="`${inspectBaseId}.shell`"
  >
    <AppBar
      :title="title"
      :show-back="isStack"
      :inspect-id="`${inspectBaseId}.app-bar`"
      @back="goBack"
    >
      <template v-if="showAnalytics || showAdd || showSettings" #append>
        <button
          v-if="showAnalytics"
          type="button"
          class="shell-icon-action"
          aria-label="图表分析"
          :data-pb-id="`${inspectBaseId}.analytics`"
          @click="emit('analytics')"
        >
          <BarChart3 :size="20" aria-hidden="true" />
        </button>
        <IconButton
          v-if="showAdd"
          ariaLabel="记一笔"
          icon="plus"
          variant="text"
          :inspect-id="`${inspectBaseId}.add`"
          @click="emit('add')"
        />
        <IconButton
          v-if="showSettings"
          ariaLabel="设置"
          icon="settings"
          variant="text"
          :inspect-id="`${inspectBaseId}.settings`"
          @click="emit('settings')"
        />
      </template>
    </AppBar>

    <BottomNavigation
      v-if="!isStack && hasTabSlots"
      class="shell-bottom-nav"
      :items="navItems"
      v-model="activeTab"
      show-view
      :mouse-swipe="true"
      :inspect-id="`${inspectBaseId}.bottom-navigation`"
    >
      <template #记账>
        <div class="tab-panel-scroll">
          <slot name="记账" />
        </div>
      </template>
      <template #权益>
        <div class="tab-panel-scroll">
          <slot name="权益" />
        </div>
      </template>
      <template #我的>
        <div class="tab-panel-scroll">
          <slot name="我的" />
        </div>
      </template>
    </BottomNavigation>

    <main v-else class="stack-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.ledger-planet-shell {
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.ledger-planet-shell::-webkit-scrollbar,
.ledger-planet-shell :deep(*::-webkit-scrollbar) {
  display: none;
  width: 0;
  height: 0;
}
.ledger-planet-shell :deep(*) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

:global(html.pbwork-runtime-embedded) .ledger-planet-shell {
  min-height: 100%;
  max-height: 100%;
}

.shell-bottom-nav {
  min-height: 0;
  height: 100%;
  display: grid !important;
  grid-template-rows: minmax(0, 1fr) auto;
  flex: unset !important;
}
.shell-bottom-nav :deep(.pb-bottom-nav-view) {
  min-height: 0;
  height: 100%;
  overflow: hidden;
}
.shell-bottom-nav :deep(.pb-bottom-nav-panel) {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}
.shell-bottom-nav :deep(.v-window),
.shell-bottom-nav :deep(.v-window__container),
.shell-bottom-nav :deep(.v-window-item) {
  height: 100%;
  min-height: 0;
}

.tab-panel-scroll {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tab-panel-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.stack-main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.stack-main::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.shell-icon-action {
  display: inline-grid;
  place-items: center;
  width: var(--pb-sizing-touch, 44px);
  height: var(--pb-sizing-touch, 44px);
  border: 0;
  border-radius: var(--pb-radius-full);
  background: transparent;
  color: var(--pb-color-on-surface);
  cursor: pointer;
}
</style>
