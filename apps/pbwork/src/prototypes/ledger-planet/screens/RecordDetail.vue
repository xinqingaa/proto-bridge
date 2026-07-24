<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import DialogPanel from "@/design-system/components/complex/DialogPanel.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import { formatMoney, ledgerRecords } from "../mock";
import { finishToHome, pushStack } from "../nav";

const route = useRoute();
const router = useRouter();
const dialog = ref(false);
const toast = ref(false);
const toastMessage = ref("已删除");
const record = computed(
  () =>
    ledgerRecords.find((item) => item.id === route.query.record) ??
    ledgerRecords[0]!,
);

const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

watch(
  variant,
  (value) => {
    dialog.value = value === "dialog-delete";
  },
  { immediate: true },
);

function edit() {
  void pushStack(router, route, "记账", "record-edit", { variant: "edit" });
}

function confirmDelete() {
  dialog.value = false;
  toastMessage.value = "已删除";
  toast.value = true;
  window.setTimeout(() => {
    void finishToHome(router, route, "ledger-home", { preferBack: false });
  }, 400);
}

function duplicate() {
  toastMessage.value = "已复制为新流水";
  toast.value = true;
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
        <div>
          <dt>商户</dt>
          <dd>{{ record.merchant || "未填写" }}</dd>
        </div>
        <div>
          <dt>账户</dt>
          <dd>{{ record.account }}</dd>
        </div>
        <div>
          <dt>时间</dt>
          <dd>{{ record.date }}</dd>
        </div>
        <div>
          <dt>项目</dt>
          <dd>{{ record.project || "日常生活" }}</dd>
        </div>
        <div>
          <dt>标签</dt>
          <dd>{{ record.tags?.join("、") || "无" }}</dd>
        </div>
        <div>
          <dt>备注</dt>
          <dd>{{ record.note || "无" }}</dd>
        </div>
      </dl>
      <div class="record-flags">
        <Chip :label="record.source || '手动记账'" tone="secondary" />
        <Chip v-if="record.reimbursable" label="待报销" tone="warning" />
        <Chip v-if="record.recurring" label="周期记账" tone="primary" />
      </div>
      <div class="audit">
        <span>创建于 2026-07-22 12:31</span>
        <span>最后更新于 2026-07-22 12:34</span>
      </div>
      <div class="actions">
        <Button label="编辑" variant="outlined" @click="edit" />
        <Button label="复制一笔" variant="outlined" @click="duplicate" />
        <Button
          label="删除"
          tone="error"
          variant="outlined"
          @click="dialog = true"
        />
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
    <SnackbarToast v-model="toast" :message="toastMessage" tone="success" />
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
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.record-flags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
}
.audit {
  display: grid;
  gap: var(--pb-spacing-xxs);
  padding: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-variant);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
