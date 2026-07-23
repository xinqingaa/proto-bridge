<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import { coupons } from "../mock";
import { pushStack } from "../nav";

const route = useRoute();
const router = useRouter();
const tab = ref("unused");
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

const tabItems = [
  { value: "unused", label: "未使用" },
  { value: "used", label: "已使用" },
  { value: "expired", label: "已过期" },
];

watch(
  variant,
  (value) => {
    if (value === "expired-tab") tab.value = "expired";
  },
  { immediate: true },
);

function rowsFor(status: string) {
  if (variant.value === "empty") return [];
  return coupons.filter((item) => item.status === status);
}

function open(id: string, status: string) {
  void pushStack(router, route, "权益", "coupon-detail", {
    variant: status === "used" ? "used" : "default",
    query: { coupon: id },
  });
}
</script>

<template>
  <LedgerPlanetShell title="券包" active="权益" back-to="benefits-home">
    <div class="page" data-pb-id="ledger-planet.coupon-wallet">
      <Tabs
        v-model="tab"
        :items="tabItems"
        selection-style="underline"
        grow
        inspect-id="ledger-planet.coupon-wallet.tabs"
      >
        <template #unused>
          <div class="panel">
            <EmptyState
              v-if="rowsFor('unused').length === 0"
              title="这里还没有券"
              description="去做任务领取奖励吧。"
            />
            <DataList
              v-if="rowsFor('unused').length"
              surface="none"
              rounded="none"
              :divided="false"
            >
              <button
                v-for="item in rowsFor('unused')"
                :key="item.id"
                type="button"
                class="row"
                @click="open(item.id, item.status)"
              >
                <div>
                  <strong>{{ item.title }}</strong
                  ><span>{{ item.subtitle }}</span>
                </div>
                <Chip label="去使用" tone="primary" />
              </button>
            </DataList>
          </div>
        </template>
        <template #used>
          <div class="panel">
            <EmptyState
              v-if="rowsFor('used').length === 0"
              title="暂无已使用的券"
              description="核销后会出现在这里。"
            />
            <DataList
              v-if="rowsFor('used').length"
              surface="none"
              rounded="none"
              :divided="false"
            >
              <button
                v-for="item in rowsFor('used')"
                :key="item.id"
                type="button"
                class="row"
                @click="open(item.id, item.status)"
              >
                <div>
                  <strong>{{ item.title }}</strong
                  ><span>{{ item.subtitle }}</span>
                </div>
                <Chip label="已使用" tone="secondary" />
              </button>
            </DataList>
          </div>
        </template>
        <template #expired>
          <div class="panel">
            <EmptyState
              v-if="rowsFor('expired').length === 0"
              title="暂无过期券"
              description="过期券会出现在这里。"
            />
            <DataList
              v-if="rowsFor('expired').length"
              surface="none"
              rounded="none"
              :divided="false"
            >
              <button
                v-for="item in rowsFor('expired')"
                :key="item.id"
                type="button"
                class="row"
                @click="open(item.id, item.status)"
              >
                <div>
                  <strong>{{ item.title }}</strong
                  ><span>{{ item.subtitle }}</span>
                </div>
                <Chip label="已过期" tone="secondary" />
              </button>
            </DataList>
          </div>
        </template>
      </Tabs>
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 10px;
  padding: 16px;
  align-content: start;
  min-height: 100%;
}
.panel {
  display: grid;
  gap: 10px;
  padding-top: 4px;
}
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 12px 14px;
  border: 0;
  border-radius: var(--pb-radius-md);
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 18%, var(--pb-color-border));
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 5%,
    var(--pb-color-surface)
  );
  box-shadow: 0 8px 20px
    color-mix(in srgb, var(--pb-color-on-background) 6%, transparent);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.row strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
.row span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
