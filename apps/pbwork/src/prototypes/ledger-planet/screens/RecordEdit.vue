<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Textarea from "@/design-system/components/basic/Textarea.vue";
import SelectField from "@/design-system/components/basic/SelectField.vue";
import FormSection from "@/design-system/components/complex/FormSection.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import {
  accountOptions,
  categoryOptions,
  ledgerRecords,
} from "../mock";
import { finishToHome } from "../nav";

const route = useRoute();
const router = useRouter();
const type = ref("expense");
const amount = ref("");
const category = ref("餐饮");
const account = ref("微信");
const date = ref("今天");
const note = ref("");
const toast = ref(false);
const error = ref("");

const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const isEdit = computed(() => variant.value === "edit");

const typeTabs = [
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
];

const expenseCategories = categoryOptions.filter((item) => item !== "工资");
const incomeCategories = ["工资", "其他"];

const activeCategories = computed(() =>
  type.value === "income" ? incomeCategories : expenseCategories,
);

watch(type, (value) => {
  if (value === "income" && !incomeCategories.includes(category.value)) {
    category.value = "工资";
  }
  if (value === "expense" && !expenseCategories.includes(category.value)) {
    category.value = "餐饮";
  }
});

watch(
  variant,
  (value) => {
    toast.value = value === "toast-open";
    error.value = value === "validation-error" ? "请输入有效金额" : "";
    if (value === "edit") {
      const record = ledgerRecords[0]!;
      type.value = record.type;
      amount.value = String(record.amount);
      category.value = record.category;
      account.value = record.account;
      note.value = record.note;
    }
  },
  { immediate: true },
);

function save(again = false) {
  if (!amount.value || Number(amount.value) <= 0) {
    error.value = "请输入有效金额";
    void router.replace({
      query: { ...route.query, variant: "validation-error" },
    });
    return;
  }
  toast.value = true;
  if (again) {
    amount.value = "";
    note.value = "";
    return;
  }
  window.setTimeout(() => {
    void finishToHome(router, route, "ledger-home");
  }, 500);
}
</script>

<template>
  <LedgerPlanetShell
    :title="isEdit ? '编辑流水' : '记一笔'"
    active="记账"
    back-to="ledger-home"
  >
    <div class="page" data-pb-id="ledger-planet.record-edit">
      <Tabs
        v-model="type"
        :items="typeTabs"
        selection-style="pill"
        grow
        inspect-id="ledger-planet.record-edit.type"
      >
        <template #expense>
          <div class="form-panel">
            <div class="amount-block">
              <span>¥</span>
              <strong>{{ amount || "0.00" }}</strong>
            </div>
            <TextField
              v-model="amount"
              label="金额"
              inspect-id="ledger-planet.record-edit.amount"
            />
            <p v-if="error" class="field-error">{{ error }}</p>
            <FormSection title="分类">
              <div class="chips">
                <button
                  v-for="name in activeCategories"
                  :key="name"
                  type="button"
                  class="chip-hit"
                  @click="category = name"
                >
                  <Chip
                    :label="name"
                    :tone="category === name ? 'primary' : 'secondary'"
                  />
                </button>
              </div>
            </FormSection>
            <SelectField
              v-model="account"
              label="账户"
              :options="accountOptions"
            />
            <SelectField
              v-model="date"
              label="日期"
              :options="['今天', '昨天', '自定义']"
            />
            <Textarea v-model="note" label="备注" />
            <Button label="保存" block @click="save(false)" />
            <Button
              v-if="!isEdit"
              label="再记一笔"
              variant="outlined"
              block
              @click="save(true)"
            />
          </div>
        </template>
        <template #income>
          <div class="form-panel">
            <div class="amount-block">
              <span>¥</span>
              <strong>{{ amount || "0.00" }}</strong>
            </div>
            <TextField v-model="amount" label="金额" />
            <p v-if="error" class="field-error">{{ error }}</p>
            <FormSection title="分类">
              <div class="chips">
                <button
                  v-for="name in activeCategories"
                  :key="name"
                  type="button"
                  class="chip-hit"
                  @click="category = name"
                >
                  <Chip
                    :label="name"
                    :tone="category === name ? 'primary' : 'secondary'"
                  />
                </button>
              </div>
            </FormSection>
            <SelectField
              v-model="account"
              label="账户"
              :options="accountOptions"
            />
            <SelectField
              v-model="date"
              label="日期"
              :options="['今天', '昨天', '自定义']"
            />
            <Textarea v-model="note" label="备注" />
            <Button label="保存" block @click="save(false)" />
            <Button
              v-if="!isEdit"
              label="再记一笔"
              variant="outlined"
              block
              @click="save(true)"
            />
          </div>
        </template>
      </Tabs>
    </div>
    <SnackbarToast
      v-model="toast"
      message="已保存"
      tone="success"
      inspect-id="ledger-planet.record-edit.toast"
    />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.form-panel {
  display: grid;
  gap: 14px;
  padding-top: 4px;
}
.amount-block {
  display: flex;
  align-items: baseline;
  gap: 6px;
  justify-content: center;
  padding: 8px 0 4px;
}
.amount-block span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-title);
}
.amount-block strong {
  font: var(--pb-typography-title-lg);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-hit {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.field-error {
  margin: -8px 0 0;
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
</style>
