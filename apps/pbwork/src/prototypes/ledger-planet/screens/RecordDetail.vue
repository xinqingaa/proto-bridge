<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import DialogPanel from "@/design-system/components/complex/DialogPanel.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import { formatMoney, ledgerRecords } from "../mock";

const route = useRoute();
const router = useRouter();
const dialog = ref(false);
const toast = ref(false);
const record = ledgerRecords[0]!;

const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);

watch(
  variant,
  (value) => {
    dialog.value = value === "dialog-delete";
  },
  { immediate: true },
);

function edit() {
  void router.push(
    `/prototype/ledger-planet/record-edit?variant=edit&theme=${theme.value}`,
  );
}

function confirmDelete() {
  dialog.value = false;
  toast.value = true;
  window.setTimeout(() => {
    void router.push(
      `/prototype/ledger-planet/ledger-home?variant=default&theme=${theme.value}`,
    );
  }, 400);
}
</script>

<template>
  <LedgerPlanetShell title="流水详情" active="记账" back-to="ledger-home">
    <div class="page" data-pb-id="ledger-planet.record-detail">
      <div class="hero">
        <strong :class="record.type">
          {{ record.type === "expense" ? "−" : "+" }} ¥
          {{ formatMoney(record.amount) }}
        </strong>
        <Chip
          :label="`${record.category} · ${record.type === 'expense' ? '支出' : '收入'}`"
          tone="secondary"
        />
      </div>
      <dl class="meta">
        <div><dt>账户</dt><dd>{{ record.account }}</dd></div>
        <div><dt>时间</dt><dd>{{ record.date }}</dd></div>
        <div><dt>备注</dt><dd>{{ record.note || "无" }}</dd></div>
      </dl>
      <div class="actions">
        <Button label="编辑" variant="outlined" @click="edit" />
        <Button label="删除" tone="error" variant="outlined" @click="dialog = true" />
      </div>
    </div>
    <DialogPanel
      v-model="dialog"
      title="删除这笔流水？"
      message="删除后无法恢复。"
      confirm-label="删除"
      inspect-id="ledger-planet.record-detail.dialog"
      @confirm="confirmDelete"
    />
    <SnackbarToast v-model="toast" message="已删除" tone="success" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
  padding: 16px;
}
.hero {
  display: grid;
  gap: 10px;
  justify-items: center;
  padding: 12px 0;
}
.hero strong {
  font: var(--pb-typography-title-lg);
}
.hero strong.expense {
  color: var(--pb-color-error);
}
.hero strong.income {
  color: var(--pb-color-success);
}
.meta {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 14px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
.meta div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.meta dt {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.meta dd {
  margin: 0;
  font: var(--pb-typography-content);
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
