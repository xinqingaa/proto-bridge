<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import FieldServiceShell from "../FieldServiceShell.vue";
import Card from "@/design-system/components/basic/Card.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import DialogPanel from "@/design-system/components/complex/DialogPanel.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import Avatar from "@/design-system/components/basic/Avatar.vue";

const route = useRoute();
const router = useRouter();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const tab = ref("overview");
const sheet = ref(false);
const dialog = ref(false);
const toast = ref(false);

watch(
  variant,
  (value) => {
    sheet.value = value === "sheet-open";
    dialog.value = value === "dialog-open";
    toast.value = value === "toast-open" || value === "created";
  },
  { immediate: true },
);

function customer() {
  void router.push(
    `/prototype/field-service/customer-detail?variant=default&theme=${theme.value}`,
  );
}
</script>

<template>
  <FieldServiceShell title="工单详情" active="工单" back-to="work-orders">
    <div class="page" data-pb-id="field-service.work-order-detail">
      <div v-if="variant === 'error'" class="error">
        无法加载工单详情，请返回重试。
      </div>
      <template v-else>
        <div class="status-row">
          <Chip
            :label="variant === 'overdue' ? '已超时' : variant === 'high-priority' ? '紧急' : '处理中'"
            :tone="variant === 'overdue' || variant === 'high-priority' ? 'error' : 'primary'"
          />
          <code>#WO-1042</code>
        </div>
        <h1>{{ variant === "created" ? "冷却塔异常振动" : "中央空调异常检修" }}</h1>
        <p class="muted">远景科技园 A3 栋 · AHU-08</p>
        <Tabs
          v-model="tab"
          :items="[
            { value: 'overview', label: '总览' },
            { value: 'activity', label: '动态' },
          ]"
        >
          <template #overview>
            <Card title="客户与位置" subtitle="上海远景科技有限公司">
              <button class="customer" @click="customer">
                <Avatar name="王成" />
                <span><strong>王成</strong><small>设施主管 · 138****8821</small></span>
              </button>
            </Card>
            <Card title="故障描述" subtitle="客户报告">
              <p class="body">设备运行时出现异常噪声，送风温度持续高于设定值。</p>
            </Card>
            <Card title="服务信息" subtitle="计划今天 13:30">
              <div class="assignee">
                <Avatar name="李明" tone="secondary" />
                <span><strong>李明</strong><small>现场工程师</small></span>
              </div>
            </Card>
          </template>
          <template #activity>
            <Card title="处理动态" subtitle="最新记录">
              <p class="body">12:28 李明已到达现场</p>
              <p class="body">11:46 客户补充了设备照片</p>
            </Card>
          </template>
        </Tabs>
        <div class="actions">
          <Button label="更多操作" variant="outlined" @click="sheet = true" />
          <Button label="完成工单" @click="dialog = true" />
        </div>
      </template>
    </div>
    <BottomSheet v-model="sheet" title="工单操作">
      <div class="sheet-actions">
        <Button label="转派工程师" variant="text" />
        <Button label="调整预约时间" variant="text" />
        <Button label="标记无法完成" tone="error" variant="text" />
      </div>
    </BottomSheet>
    <DialogPanel
      v-model="dialog"
      title="确认完成工单？"
      message="完成后将通知客户，并记录本次处理结果。"
      confirm-label="确认完成"
      @confirm="dialog = false; toast = true"
    />
    <div class="toast-wrap">
      <SnackbarToast
        v-model="toast"
        :message="variant === 'created' ? '工单已创建，等待工程师接单' : '工单已完成，客户已收到通知'"
      />
    </div>
  </FieldServiceShell>
</template>

<style scoped>
.page { display: grid; gap: 12px; padding: 16px; }
.status-row { display: flex; justify-content: space-between; align-items: center; }
.status-row code, .muted, small { color: var(--pb-color-on-surface-muted); }
h1 { margin: 0; font: var(--pb-typography-title-lg); }
.muted { margin: -8px 0 2px; font: var(--pb-typography-caption); }
.customer, .assignee { display: flex; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; color: inherit; text-align: left; }
.customer span, .assignee span { display: grid; gap: 2px; }
.body { margin: 0; font: var(--pb-typography-content); }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sheet-actions { display: grid; gap: 6px; }
.toast-wrap { position: fixed; z-index: 50; left: 16px; right: 16px; bottom: calc(16px + var(--pb-safe-bottom, 0px)); }
.error { padding: 16px; border-radius: var(--pb-radius-lg); background: var(--pb-color-error-soft); color: var(--pb-color-error); }
</style>
