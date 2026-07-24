<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Landmark,
  Repeat2,
  Store,
  Tags,
  Utensils,
  Train,
  ShoppingBag,
  House,
  Gamepad2,
  Banknote,
  Shapes,
} from "lucide-vue-next";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Textarea from "@/design-system/components/basic/Textarea.vue";
import SelectField from "@/design-system/components/basic/SelectField.vue";
import SwitchControl from "@/design-system/components/basic/SwitchControl.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import {
  accountOptions,
  categoryOptions,
  ledgerRecords,
  projectOptions,
  tagOptions,
} from "../mock";
import { finishToHome } from "../nav";

const route = useRoute();
const router = useRouter();
const type = ref<"expense" | "income">("expense");
const amount = ref("");
const category = ref("餐饮");
const account = ref("微信");
const date = ref("今天");
const time = ref("12:30");
const merchant = ref("");
const project = ref("日常生活");
const note = ref("");
const selectedTags = ref<string[]>([]);
const reimbursable = ref(false);
const recurring = ref(false);
const attachmentAdded = ref(false);
const toast = ref(false);
const error = ref("");
const activeSheet = ref<"category" | "account" | "date" | "tags" | null>(null);

const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const isEdit = computed(() => variant.value === "edit");
const activeCategories = computed(() =>
  type.value === "income"
    ? categoryOptions.filter((item) => ["工资", "其他"].includes(item))
    : categoryOptions.filter((item) => item !== "工资"),
);

const categoryIcons = {
  餐饮: Utensils,
  交通: Train,
  购物: ShoppingBag,
  住房: House,
  娱乐: Gamepad2,
  工资: Banknote,
  其他: Shapes,
};

watch(type, (value) => {
  if (!activeCategories.value.includes(category.value)) {
    category.value = value === "income" ? "工资" : "餐饮";
  }
});

watch(
  variant,
  (value) => {
    toast.value = value === "toast-open";
    error.value = value === "validation-error" ? "请输入有效金额" : "";
    if (value === "category-sheet") activeSheet.value = "category";
    if (value === "account-sheet") activeSheet.value = "account";
    if (value === "date-sheet") activeSheet.value = "date";
    if (value === "edit") {
      const record = ledgerRecords[0]!;
      type.value = record.type;
      amount.value = String(record.amount);
      category.value = record.category;
      account.value = record.account;
      merchant.value = record.merchant ?? "";
      selectedTags.value = [...(record.tags ?? [])];
      project.value = record.project ?? "日常生活";
      reimbursable.value = Boolean(record.reimbursable);
      recurring.value = Boolean(record.recurring);
      note.value = record.note;
    }
  },
  { immediate: true },
);

function inputKey(key: string) {
  error.value = "";
  if (key === "backspace") {
    amount.value = amount.value.slice(0, -1);
    return;
  }
  if (key === ".") {
    if (!amount.value.includes(".")) amount.value = `${amount.value || "0"}.`;
    return;
  }
  const decimal = amount.value.split(".")[1];
  if (decimal?.length === 2) return;
  amount.value = `${amount.value}${key}`.replace(/^0+(?=\d)/, "");
}

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((item) => item !== tag)
    : [...selectedTags.value, tag];
}

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
    merchant.value = "";
    note.value = "";
    selectedTags.value = [];
    return;
  }
  window.setTimeout(() => {
    void finishToHome(router, route, "ledger-home");
  }, 550);
}
</script>

<template>
  <LedgerPlanetShell
    :title="isEdit ? '编辑流水' : '记一笔'"
    active="记账"
    back-to="ledger-home"
  >
    <div class="page" data-pb-id="ledger-planet.record-edit">
      <div class="type-segment" data-no-swipe>
        <button
          v-for="item in [
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
          ]"
          :key="item.value"
          type="button"
          :class="{ active: type === item.value }"
          @click="type = item.value as 'expense' | 'income'"
        >
          {{ item.label }}
        </button>
      </div>

      <section class="amount-editor" :class="type">
        <span>{{ type === "expense" ? "支出金额" : "收入金额" }}</span>
        <div><small>¥</small><strong>{{ amount || "0.00" }}</strong></div>
        <p v-if="error">{{ error }}</p>
      </section>

      <div class="keypad" data-no-swipe>
        <button v-for="key in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0']" :key="key" type="button" @click="inputKey(key)">
          {{ key }}
        </button>
        <button type="button" aria-label="删除一位金额" @click="inputKey('backspace')">⌫</button>
      </div>

      <section class="category-section">
        <header><span>分类</span><button type="button" @click="activeSheet = 'category'">全部分类 <ChevronRight :size="16" /></button></header>
        <div class="category-grid">
          <button
            v-for="name in activeCategories.slice(0, 6)"
            :key="name"
            type="button"
            :class="{ active: category === name }"
            @click="category = name"
          >
            <span><component :is="categoryIcons[name as keyof typeof categoryIcons]" :size="20" /></span>
            {{ name }}
            <Check v-if="category === name" class="selected-check" :size="13" />
          </button>
        </div>
      </section>

      <section class="detail-list">
        <button type="button" @click="activeSheet = 'account'">
          <Landmark :size="19" /><span><small>账户</small><strong>{{ account }}</strong></span><ChevronRight :size="17" />
        </button>
        <button type="button" @click="activeSheet = 'date'">
          <CalendarDays :size="19" /><span><small>日期与时间</small><strong>{{ date }} {{ time }}</strong></span><ChevronRight :size="17" />
        </button>
        <button type="button" @click="activeSheet = 'tags'">
          <Tags :size="19" /><span><small>标签</small><strong>{{ selectedTags.length ? selectedTags.join("、") : "添加标签" }}</strong></span><ChevronRight :size="17" />
        </button>
      </section>

      <section class="more-fields">
        <TextField v-model="merchant" :label="type === 'expense' ? '商户 / 收款方' : '来源 / 付款方'" />
        <SelectField v-model="project" label="归属项目" :options="projectOptions" />
        <Textarea v-model="note" label="备注" />
        <div class="switch-row">
          <SwitchControl v-model="reimbursable" label="标记为待报销" />
          <SwitchControl v-model="recurring" label="设为周期记账" />
        </div>
        <button type="button" class="attachment" @click="attachmentAdded = !attachmentAdded">
          <Camera :size="19" />
          <span><strong>{{ attachmentAdded ? "已添加 1 张票据" : "添加票据或截图" }}</strong><small>{{ attachmentAdded ? "点击移除" : "用于后续查账与报销" }}</small></span>
          <Check v-if="attachmentAdded" :size="18" />
          <ChevronRight v-else :size="17" />
        </button>
      </section>

      <div v-if="isEdit" class="audit">
        <span>创建于 7月22日 12:31 · 手动记账</span>
        <span>最后更新 2 分钟前</span>
      </div>

      <div class="save-actions">
        <Button :label="isEdit ? '保存修改' : '保存'" block @click="save(false)" />
        <Button v-if="!isEdit" label="保存并再记一笔" variant="outlined" block @click="save(true)" />
      </div>
    </div>

    <BottomSheet
      :model-value="activeSheet === 'category'"
      title="选择分类"
      inspect-id="ledger-planet.record-edit.category-sheet"
      @update:model-value="activeSheet = $event ? 'category' : null"
    >
      <div class="sheet-category-grid">
        <button
          v-for="name in activeCategories"
          :key="name"
          type="button"
          :class="{ active: category === name }"
          @click="category = name; activeSheet = null"
        >
          <component :is="categoryIcons[name as keyof typeof categoryIcons]" :size="21" />
          <span>{{ name }}</span>
          <Check v-if="category === name" :size="16" />
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :model-value="activeSheet === 'account'"
      title="选择账户"
      inspect-id="ledger-planet.record-edit.account-sheet"
      @update:model-value="activeSheet = $event ? 'account' : null"
    >
      <div class="account-list">
        <button v-for="name in accountOptions" :key="name" type="button" @click="account = name; activeSheet = null">
          <span><Landmark :size="19" /><strong>{{ name }}</strong></span>
          <small>{{ name === "银行卡" ? "余额 ¥8,460.20" : name === "现金" ? "余额 ¥620" : "常用账户" }}</small>
          <Check v-if="account === name" :size="18" />
        </button>
      </div>
    </BottomSheet>

    <BottomSheet
      :model-value="activeSheet === 'date'"
      title="日期与时间"
      inspect-id="ledger-planet.record-edit.date-sheet"
      @update:model-value="activeSheet = $event ? 'date' : null"
    >
      <div class="date-sheet">
        <div class="date-presets">
          <button v-for="item in ['今天', '昨天', '7月21日']" :key="item" type="button" :class="{ active: date === item }" @click="date = item">{{ item }}</button>
        </div>
        <label><CalendarDays :size="18" /><span>自定义日期</span><input type="date" value="2026-07-23" /></label>
        <label><Clock3 :size="18" /><span>记账时间</span><input v-model="time" type="time" /></label>
        <Button label="确定" block @click="activeSheet = null" />
      </div>
    </BottomSheet>

    <BottomSheet
      :model-value="activeSheet === 'tags'"
      title="标签与辅助信息"
      inspect-id="ledger-planet.record-edit.tags-sheet"
      @update:model-value="activeSheet = $event ? 'tags' : null"
    >
      <div class="tag-sheet">
        <div class="tag-options">
          <button v-for="tag in tagOptions" :key="tag" type="button" @click="toggleTag(tag)">
            <Chip :label="tag" :tone="selectedTags.includes(tag) ? 'primary' : 'secondary'" />
          </button>
        </div>
        <div class="sheet-note">
          <Repeat2 :size="18" /><span>标签可用于流水筛选和消费分析。</span>
        </div>
        <Button label="完成" block @click="activeSheet = null" />
      </div>
    </BottomSheet>

    <SnackbarToast
      v-model="toast"
      :message="isEdit ? '修改已保存' : '流水已保存'"
      tone="success"
      inspect-id="ledger-planet.record-edit.toast"
    />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: var(--pb-spacing-md);
  padding: var(--pb-spacing-md) var(--pb-spacing-md)
    calc(var(--pb-spacing-lg) + var(--pb-spacing-sm));
}
.type-segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pb-spacing-xxs);
  padding: var(--pb-spacing-xxs);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-variant);
}
.type-segment button {
  min-height: var(--pb-sizing-control-md);
  border: 0;
  border-radius: var(--pb-radius-sm);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-label);
  cursor: pointer;
}
.type-segment button.active {
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-card);
}
.amount-editor {
  display: grid;
  justify-items: center;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-sm) 0;
}
.amount-editor > span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.amount-editor div {
  display: flex;
  align-items: baseline;
  gap: var(--pb-spacing-xs);
}
.amount-editor small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-title);
}
.amount-editor strong {
  min-height: var(--pb-sizing-control-lg);
  color: var(--pb-color-error);
  font: var(--pb-typography-title-lg);
  line-height: 1.2;
  letter-spacing: -.04em;
}
.amount-editor.income strong {
  color: var(--pb-color-success);
}
.amount-editor p {
  margin: 0;
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
.keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--pb-spacing-xs);
}
.keypad button {
  min-height: var(--pb-sizing-control-lg);
  border: 0;
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-variant);
  color: inherit;
  font: var(--pb-typography-title);
  cursor: pointer;
}
.keypad button:active {
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
.category-section {
  display: grid;
  gap: var(--pb-spacing-sm);
}
.category-section header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.category-section header > span {
  font: var(--pb-typography-subtitle);
}
.category-section header button {
  display: inline-flex;
  align-items: center;
  border: 0;
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--pb-spacing-xs);
}
.category-grid button {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--pb-spacing-xs);
  min-width: 0;
  padding: var(--pb-spacing-xs) 0;
  border: 0;
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.category-grid button > span {
  display: grid;
  place-items: center;
  width: var(--pb-sizing-control-md);
  height: var(--pb-sizing-control-md);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-variant);
}
.category-grid button.active {
  color: var(--pb-color-primary);
}
.category-grid button.active > span {
  background: var(--pb-color-primary-soft);
}
.selected-check {
  position: absolute;
  top: var(--pb-spacing-xxs);
  right: var(--pb-spacing-xs);
  padding: var(--pb-spacing-xxs);
  border-radius: 50%;
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
}
.detail-list {
  display: grid;
  border-block: 1px solid var(--pb-color-border);
}
.detail-list button,
.attachment {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-height: var(--pb-sizing-menu-item);
  padding: var(--pb-spacing-sm) 0;
  border: 0;
  border-bottom: 1px solid var(--pb-color-border);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.detail-list button:last-child {
  border-bottom: 0;
}
.detail-list svg:first-child,
.attachment > svg:first-child {
  color: var(--pb-color-primary);
}
.detail-list span small,
.detail-list span strong,
.attachment span small,
.attachment span strong {
  display: block;
}
.detail-list small,
.attachment small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.detail-list strong,
.attachment strong {
  font: var(--pb-typography-content);
}
.more-fields {
  display: grid;
  gap: var(--pb-spacing-sm);
}
.switch-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pb-spacing-sm);
}
.attachment {
  border: 1px dashed var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  padding: var(--pb-spacing-sm-plus);
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
.save-actions {
  display: grid;
  gap: var(--pb-spacing-sm);
  position: sticky;
  bottom: 0;
  padding-top: var(--pb-spacing-sm);
  background: linear-gradient(to bottom, transparent, var(--pb-color-background) 24%);
}
.sheet-category-grid,
.account-list,
.date-sheet,
.tag-sheet {
  display: grid;
  gap: var(--pb-spacing-sm);
}
.sheet-category-grid {
  grid-template-columns: 1fr 1fr;
}
.sheet-category-grid button,
.account-list button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-height: var(--pb-sizing-menu-item);
  padding: var(--pb-spacing-sm);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.sheet-category-grid button.active {
  border-color: var(--pb-color-primary);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
.account-list button {
  grid-template-columns: 1fr auto auto;
}
.account-list button > span {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.account-list small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.date-presets,
.tag-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-sm);
}
.date-presets button {
  flex: 1;
  min-height: var(--pb-sizing-control-md);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  cursor: pointer;
}
.date-presets button.active {
  border-color: var(--pb-color-primary);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
.date-sheet label {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-height: var(--pb-sizing-menu-item);
}
.date-sheet label svg {
  color: var(--pb-color-primary);
}
.date-sheet input {
  min-height: var(--pb-sizing-control-md);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  padding: 0 var(--pb-spacing-sm);
}
.tag-options button {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.sheet-note {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
@media (max-width: 420px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
