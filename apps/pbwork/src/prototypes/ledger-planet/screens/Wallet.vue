<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Eye, EyeOff } from "lucide-vue-next";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Card from "@/design-system/components/basic/Card.vue";
import Button from "@/design-system/components/basic/Button.vue";
import DialogPanel from "@/design-system/components/complex/DialogPanel.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import { formatMoney, walletEntries } from "../mock";

const route = useRoute();
const hidden = ref(false);
const dialog = ref(false);
const toast = ref(false);
const balance = ref(3200);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

watch(
  variant,
  (value) => {
    hidden.value = value === "hidden-balance";
  },
  { immediate: true },
);

function confirmTopUp() {
  dialog.value = false;
  balance.value += 100;
  toast.value = true;
}
</script>

<template>
  <LedgerPlanetShell title="钱包" active="我的" back-to="me-home">
    <div class="page" data-pb-id="ledger-planet.wallet">
      <Card title="余额" subtitle="与账本账户合计（mock）">
        <div class="balance">
          <strong>
            {{ hidden ? "****" : `¥ ${formatMoney(balance)}` }}
          </strong>
          <button
            type="button"
            class="eye"
            :aria-label="hidden ? '显示金额' : '隐藏金额'"
            @click="hidden = !hidden"
          >
            <EyeOff v-if="hidden" :size="18" />
            <Eye v-else :size="18" />
          </button>
        </div>
      </Card>
      <h2>余额明细</h2>
      <EmptyState
        v-if="variant === 'empty'"
        title="暂无明细"
        description="充值或记账后会出现在这里。"
      />
      <template v-else>
        <button
          v-for="item in walletEntries"
          :key="item.id"
          type="button"
          class="row"
        >
          <div>
            <strong>{{ item.title }}</strong>
            <span>{{ item.subtitle }}</span>
          </div>
          <em :class="item.amount < 0 ? 'out' : 'in'">
            {{ item.amount < 0 ? "" : "+" }}{{ formatMoney(item.amount) }}
          </em>
        </button>
      </template>
      <Button label="模拟充值" block @click="dialog = true" />
    </div>
    <DialogPanel
      v-model="dialog"
      title="模拟充值 100 元？"
      message="仅用于原型演示，不会产生真实资金变动。"
      confirm-label="确认"
      @confirm="confirmTopUp"
    />
    <SnackbarToast v-model="toast" message="充值成功（mock）" tone="success" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 12px;
  padding: 16px;
  align-content: start;
}
.balance {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.balance strong {
  font: var(--pb-typography-title-lg);
}
.eye {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--pb-radius-full);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  cursor: pointer;
}
h2 {
  margin: 8px 0 0;
  font: var(--pb-typography-subtitle);
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 10px 12px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
}
.row strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
.row span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.row em {
  font: var(--pb-typography-subtitle);
  font-style: normal;
}
.row em.out {
  color: var(--pb-color-error);
}
.row em.in {
  color: var(--pb-color-success);
}
</style>
