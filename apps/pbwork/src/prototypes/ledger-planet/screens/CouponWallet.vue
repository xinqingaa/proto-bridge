<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";
import { coupons } from "../mock";
import { pushStack } from "../nav";

type CouponStatus = "unused" | "used" | "expired";

const route = useRoute();
const router = useRouter();
const tab = ref("unused");
const refreshing = ref(false);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

const tabItems = [
  { value: "unused", label: "未使用" },
  { value: "used", label: "已使用" },
  { value: "expired", label: "已过期" },
];

const panels: Array<{
  value: CouponStatus;
  emptyTitle: string;
  emptyDescription: string;
  chipLabel: string;
}> = [
  {
    value: "unused",
    emptyTitle: "这里还没有券",
    emptyDescription: "去做任务领取奖励吧。",
    chipLabel: "去使用",
  },
  {
    value: "used",
    emptyTitle: "暂无已使用的券",
    emptyDescription: "核销后会出现在这里。",
    chipLabel: "已使用",
  },
  {
    value: "expired",
    emptyTitle: "暂无过期券",
    emptyDescription: "过期券会出现在这里。",
    chipLabel: "已过期",
  },
];

watch(
  variant,
  (value) => {
    if (value === "expired-tab") tab.value = "expired";
  },
  { immediate: true },
);

function rowsFor(status: CouponStatus) {
  if (variant.value === "empty") return [];
  return coupons.filter((item) => item.status === status);
}

function faceValue(title: string) {
  const yen = title.match(/¥\s*(\d+)/);
  if (yen) return { primary: `¥${yen[1]}`, hint: "优惠券" };
  const off = title.match(/减\s*(\d+)/);
  if (off) return { primary: `¥${off[1]}`, hint: "满减" };
  return { primary: "券", hint: "权益" };
}

function open(id: string, status: CouponStatus) {
  void pushStack(router, route, "权益", "coupon-detail", {
    variant: status === "used" ? "used" : "default",
    query: { coupon: id },
  });
}

function onRefresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  window.setTimeout(() => {
    refreshing.value = false;
  }, 650);
}
</script>

<template>
  <LedgerPlanetShell title="券包" active="权益" back-to="benefits-home">
    <ScrollableDataList
      :pull-refresh="{ enabled: true, mouse: true }"
      :load-more="false"
      :drag-scroll="{ enabled: true, mouse: true, momentum: true }"
      :refreshing="refreshing"
      inspect-id="ledger-planet.coupon-wallet.scroll-list"
      @refresh="onRefresh"
    >
      <div class="page" data-pb-id="ledger-planet.coupon-wallet">
        <Tabs
          class="coupon-tabs"
          v-model="tab"
          :items="tabItems"
          selection-style="pill"
          grow
          fill
          :swipe="true"
          :mouse-swipe="true"
          inspect-id="ledger-planet.coupon-wallet.tabs"
        >
          <template v-for="panel in panels" :key="panel.value" #[panel.value]>
            <div class="panel">
              <EmptyState
                v-if="rowsFor(panel.value).length === 0"
                :title="panel.emptyTitle"
                :description="panel.emptyDescription"
              />
              <DataList
                v-else
                class="ticket-list"
                surface="none"
                rounded="none"
                :divided="false"
              >
                <button
                  v-for="item in rowsFor(panel.value)"
                  :key="item.id"
                  type="button"
                  class="ticket"
                  :class="`is-${item.status}`"
                  @click="open(item.id, item.status)"
                >
                  <div class="ticket-face" aria-hidden="true">
                    <strong>{{ faceValue(item.title).primary }}</strong>
                    <span>{{ faceValue(item.title).hint }}</span>
                  </div>
                  <div class="ticket-body">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.subtitle }}</span>
                  </div>
                  <Chip
                    :label="panel.chipLabel"
                    :tone="item.status === 'unused' ? 'primary' : 'secondary'"
                  />
                </button>
              </DataList>
            </div>
          </template>
        </Tabs>
      </div>
    </ScrollableDataList>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm, 8px);
  padding: var(--pb-spacing-md, 16px);
  min-height: 100%;
  height: 100%;
  flex: 1;
  box-sizing: border-box;
}
.coupon-tabs {
  flex: 1;
  min-height: 0;
}
.panel {
  display: grid;
  gap: var(--pb-spacing-sm, 8px);
  padding-top: var(--pb-spacing-xs, 4px);
}
.ticket-list {
  display: grid;
  gap: var(--pb-spacing-sm-plus, 12px);
}
.ticket {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--pb-spacing-sm-plus, 12px);
  min-height: 88px;
  padding: 0;
  padding-inline-end: var(--pb-spacing-md, 16px);
  border: 0;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px var(--pb-color-border),
    0 10px 24px
      color-mix(in srgb, var(--pb-color-on-background) 6%, transparent);
}
.ticket-face {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--pb-spacing-xxs, 2px);
  align-self: stretch;
  min-width: 76px;
  padding: var(--pb-spacing-md, 16px) var(--pb-spacing-sm, 8px);
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 12%,
    var(--pb-color-surface)
  );
  color: var(--pb-color-primary);
  border-inline-end: 1px dashed
    color-mix(in srgb, var(--pb-color-primary) 28%, var(--pb-color-border));
}
.ticket-face strong {
  font: var(--pb-typography-title);
  letter-spacing: -0.02em;
  line-height: 1;
}
.ticket-face span {
  font: var(--pb-typography-caption);
  color: color-mix(
    in srgb,
    var(--pb-color-primary) 72%,
    var(--pb-color-on-surface-muted)
  );
}
.ticket-body {
  display: grid;
  gap: var(--pb-spacing-xxs, 2px);
  min-width: 0;
  padding-block: var(--pb-spacing-md, 16px);
}
.ticket-body strong {
  font: var(--pb-typography-subtitle);
  color: var(--pb-color-on-surface);
}
.ticket-body span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.ticket.is-used,
.ticket.is-expired {
  opacity: 0.78;
}
.ticket.is-used .ticket-face,
.ticket.is-expired .ticket-face {
  background: color-mix(
    in srgb,
    var(--pb-color-on-surface-muted) 10%,
    var(--pb-color-surface)
  );
  color: var(--pb-color-on-surface-muted);
  border-inline-end-color: var(--pb-color-border);
}
.ticket.is-used .ticket-face span,
.ticket.is-expired .ticket-face span {
  color: var(--pb-color-on-surface-muted);
}
.ticket:active {
  transform: scale(0.992);
}
</style>
