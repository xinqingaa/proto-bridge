<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import SelectField from "@/design-system/components/input/Menu.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import Textarea from "@/design-system/components/input/Textarea.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import DialogPanel from "@/design-system/components/feedback/ConfirmDialog.vue";
import SnackbarToast from "@/design-system/components/feedback/Toast.vue";
import ColdChainShell from "../ColdChainShell.vue";
import { dutySupervisors, resolutionActions, resolutionCauses } from "../mock";
import { replaceColdChainVariant } from "../nav";

const route = useRoute();
const router = useRouter();
const cause = ref("");
const action = ref("");
const outcome = ref("");
const checkedDriver = ref(false);
const checkedCooling = ref(false);
const checkedCargo = ref(false);
const continueMonitoring = ref(true);
const notes = ref("");
const supervisor = ref("");
const validationMessage = ref("");
const dialogOpen = ref(false);
const toastOpen = ref(false);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const shipmentId = computed(() =>
  typeof route.query.shipment === "string" ? route.query.shipment : "SH-2048",
);

function resetForm() {
  cause.value = "";
  action.value = "";
  outcome.value = "";
  checkedDriver.value = false;
  checkedCooling.value = false;
  checkedCargo.value = false;
  continueMonitoring.value = true;
  notes.value = "";
  supervisor.value = "";
  validationMessage.value = "";
}

function fillReadyState(includeSupervisor = true) {
  cause.value = "制冷机组异常";
  action.value = "切换备用制冷";
  outcome.value = "温度开始回落";
  checkedDriver.value = true;
  checkedCooling.value = true;
  checkedCargo.value = true;
  continueMonitoring.value = true;
  notes.value = "司机已切换备用制冷，预计 15 分钟内回到 8°C 以下。";
  supervisor.value = includeSupervisor ? "华东值班经理 · 林岚" : "";
  validationMessage.value = "";
}

watch(
  variant,
  (value) => {
    dialogOpen.value = value === "confirm-dialog-open";
    toastOpen.value = value === "submitted";
    if (
      ["ready-to-submit", "confirm-dialog-open", "submitted"].includes(value)
    ) {
      fillReadyState();
    } else if (
      ["approval-required", "approval-validation-error"].includes(value)
    ) {
      fillReadyState(false);
      if (value === "approval-validation-error") {
        validationMessage.value =
          "超温已持续 47 分钟，必须指定值班主管后才能提交。";
      }
    } else {
      resetForm();
      if (value === "validation-error") {
        validationMessage.value = "请补全异常原因、处置动作和三项现场确认。";
      }
    }
  },
  { immediate: true },
);

const operationalFieldsComplete = computed(
  () =>
    Boolean(cause.value && action.value && outcome.value) &&
    checkedDriver.value &&
    checkedCooling.value &&
    checkedCargo.value,
);
const complete = computed(
  () => operationalFieldsComplete.value && Boolean(supervisor.value),
);

function submit() {
  if (!complete.value) {
    if (operationalFieldsComplete.value && !supervisor.value) {
      validationMessage.value =
        "超温已持续 47 分钟，必须指定值班主管后才能提交。";
      void replaceColdChainVariant(router, route, "approval-validation-error");
      return;
    }
    validationMessage.value = "请补全异常原因、处置动作和三项现场确认。";
    void replaceColdChainVariant(router, route, "validation-error");
    return;
  }
  dialogOpen.value = true;
  void replaceColdChainVariant(router, route, "confirm-dialog-open");
}

function confirm() {
  dialogOpen.value = false;
  toastOpen.value = true;
  void replaceColdChainVariant(router, route, "submitted");
}
</script>

<template>
  <ColdChainShell
    title="提交处置"
    screen-id="cold-chain-ops.resolution-form"
    back-to="shipment-detail"
  >
    <div
      class="resolution-page"
      data-pb-id="cold-chain-ops.resolution-form.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
      data-pb-token-spacing="spacing.md"
    >
      <form class="resolution-form" @submit.prevent="submit">
        <section
          class="case-summary"
          data-pb-id="cold-chain-ops.resolution-form.case-summary"
          data-pb-role="summary"
          data-pb-token-background="color.error-soft"
          data-pb-token-color="color.on-surface"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.md"
        >
          <Icon name="shield-check" size="lg" />
          <div>
            <strong
              data-pb-id="cold-chain-ops.resolution-form.case-summary.title"
              data-pb-role="text"
              data-pb-token-typography="typography.subtitle"
              data-pb-token-color="color.on-surface"
              >{{ shipmentId }} · 严重超温</strong
            >
            <span
              data-pb-id="cold-chain-ops.resolution-form.case-summary.detail"
              data-pb-role="text"
              data-pb-token-typography="typography.caption"
              data-pb-token-color="color.on-surface-muted"
              >当前 10.8°C · 上限 8°C · 已持续 47 分钟</span
            >
          </div>
        </section>

        <section
          v-if="validationMessage"
          class="validation-error"
          role="alert"
          data-pb-id="cold-chain-ops.resolution-form.validation-error"
          data-pb-role="error-state"
          data-pb-token-background="color.error-soft"
          data-pb-token-color="color.error"
          data-pb-token-radius="radius.md"
          data-pb-token-spacing="spacing.sm-plus"
        >
          <Icon name="alert-circle" size="md" />
          <span>{{ validationMessage }}</span>
        </section>

        <section
          class="resolution-section"
          data-pb-id="cold-chain-ops.resolution-form.response-form"
          data-pb-role="form"
          data-pb-token-background="color.surface"
          data-pb-token-border="color.border"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.sm-plus"
        >
          <header class="resolution-section-header">
            <div>
              <h2
                data-pb-id="cold-chain-ops.resolution-form.section-title"
                data-pb-key="response-form"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.subtitle"
              >
                处置判断
                <em
                  data-pb-id="cold-chain-ops.resolution-form.required-mark"
                  data-pb-key="response-form"
                  data-pb-role="text"
                  data-pb-token-color="color.error"
                  data-pb-token-typography="typography.caption"
                  >必填</em
                >
              </h2>
              <p
                data-pb-id="cold-chain-ops.resolution-form.section-description"
                data-pb-key="response-form"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
              >
                根据司机反馈与设备状态记录本次异常原因。
              </p>
            </div>
          </header>
          <div class="resolution-section-content">
            <SelectField
              v-model="cause"
              label="异常原因"
              placeholder="选择已确认的原因"
              :options="resolutionCauses"
              :error="validationMessage && !cause ? '请选择异常原因' : ''"
              inspect-id="cold-chain-ops.resolution-form.cause"
            />
            <SelectField
              v-model="action"
              label="处置动作"
              placeholder="选择已执行的动作"
              :options="resolutionActions"
              :error="validationMessage && !action ? '请选择处置动作' : ''"
              inspect-id="cold-chain-ops.resolution-form.action"
            />
            <RadioGroup
              v-model="outcome"
              label="当前结果"
              :options="['温度开始回落', '温度仍在上升', '暂时无法确认']"
              inspect-id="cold-chain-ops.resolution-form.outcome"
            />
          </div>
        </section>

        <section
          class="resolution-section"
          data-pb-id="cold-chain-ops.resolution-form.checklist"
          data-pb-role="section"
          data-pb-token-background="color.surface"
          data-pb-token-border="color.border"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.sm-plus"
        >
          <header class="resolution-section-header">
            <div>
              <h2
                data-pb-id="cold-chain-ops.resolution-form.section-title"
                data-pb-key="checklist"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.subtitle"
              >
                现场确认
                <em
                  data-pb-id="cold-chain-ops.resolution-form.required-mark"
                  data-pb-key="checklist"
                  data-pb-role="text"
                  data-pb-token-color="color.error"
                  data-pb-token-typography="typography.caption"
                  >必填</em
                >
              </h2>
              <p
                data-pb-id="cold-chain-ops.resolution-form.section-description"
                data-pb-key="checklist"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
              >
                以下检查项会进入交付记录。
              </p>
            </div>
          </header>
          <div class="resolution-section-content">
            <Checkbox
              v-model="checkedDriver"
              label="已联系司机并确认车辆安全"
              inspect-id="cold-chain-ops.resolution-form.check-driver"
            />
            <Checkbox
              v-model="checkedCooling"
              label="已检查主制冷与备用制冷状态"
              inspect-id="cold-chain-ops.resolution-form.check-cooling"
            />
            <Checkbox
              v-model="checkedCargo"
              label="货箱未开封且无可见损伤"
              inspect-id="cold-chain-ops.resolution-form.check-cargo"
            />
          </div>
        </section>

        <section
          class="resolution-section"
          data-pb-id="cold-chain-ops.resolution-form.follow-up"
          data-pb-role="section"
          data-pb-token-background="color.surface"
          data-pb-token-border="color.border"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.sm-plus"
        >
          <header class="resolution-section-header">
            <div>
              <h2
                data-pb-id="cold-chain-ops.resolution-form.section-title"
                data-pb-key="follow-up"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.subtitle"
              >
                后续安排
              </h2>
              <p
                data-pb-id="cold-chain-ops.resolution-form.section-description"
                data-pb-key="follow-up"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
              >
                提交后调度中心将按此安排继续跟踪。
              </p>
            </div>
          </header>
          <div class="resolution-section-content">
            <SwitchControl
              v-model="continueMonitoring"
              label="保持每 2 分钟温度监控"
              inspect-id="cold-chain-ops.resolution-form.continue-monitoring"
            />
            <Textarea
              v-model="notes"
              label="处置说明"
              inspect-id="cold-chain-ops.resolution-form.notes"
            />
          </div>
        </section>

        <section
          class="resolution-section"
          data-pb-id="cold-chain-ops.resolution-form.supervisor-approval"
          data-pb-role="form"
          data-pb-token-background="color.surface"
          data-pb-token-border="color.border"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.sm-plus"
        >
          <header class="resolution-section-header">
            <div>
              <h2
                data-pb-id="cold-chain-ops.resolution-form.section-title"
                data-pb-key="supervisor-approval"
                data-pb-role="text"
                data-pb-token-color="color.on-surface"
                data-pb-token-typography="typography.subtitle"
              >
                主管审批
                <em
                  data-pb-id="cold-chain-ops.resolution-form.required-mark"
                  data-pb-key="supervisor-approval"
                  data-pb-role="text"
                  data-pb-token-color="color.error"
                  data-pb-token-typography="typography.caption"
                  >必填</em
                >
              </h2>
              <p
                data-pb-id="cold-chain-ops.resolution-form.section-description"
                data-pb-key="supervisor-approval"
                data-pb-role="text"
                data-pb-token-color="color.on-surface-muted"
                data-pb-token-typography="typography.caption"
              >
                持续超温超过 45 分钟时，提交前必须由值班主管复核。
              </p>
            </div>
          </header>
          <div class="resolution-section-content">
            <SelectField
              v-model="supervisor"
              label="值班主管"
              placeholder="选择本次处置的复核人"
              :options="dutySupervisors"
              :error="
                variant === 'approval-validation-error' && !supervisor
                  ? '请选择值班主管'
                  : ''
              "
              inspect-id="cold-chain-ops.resolution-form.supervisor"
            />
            <p
              class="approval-policy"
              data-pb-id="cold-chain-ops.resolution-form.approval-policy"
              data-pb-role="text"
              data-pb-token-typography="typography.caption"
              data-pb-token-color="color.on-surface-muted"
            >
              当前异常持续 47 分钟，已触发主管审批阈值。
            </p>
          </div>
        </section>

        <div class="submit-area">
          <div class="submission-note">
            <Icon name="clipboard-check" size="md" />
            <span>提交后会保留当前传感器读数与操作时间。</span>
          </div>
          <Button
            label="审核并提交"
            type="submit"
            block
            inspect-id="cold-chain-ops.resolution-form.submit"
            data-pb-action="submit-resolution"
          />
        </div>
      </form>

      <DialogPanel
        v-model="dialogOpen"
        title="确认提交处置记录？"
        message="提交后异常将转为持续监控，当前记录不可直接覆盖。"
        confirm-label="确认提交"
        inspect-id="cold-chain-ops.resolution-form.confirm-dialog"
        @confirm="confirm"
      />

      <SnackbarToast
        v-model="toastOpen"
        message="处置记录已提交，异常转为持续监控"
        inspect-id="cold-chain-ops.resolution-form.success-toast"
      />
    </div>
  </ColdChainShell>
</template>

<style scoped>
.resolution-page {
  height: var(--pb-layout-fill);
  min-height: var(--pb-spacing-none);
  overflow: auto;
}
.resolution-form {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  padding-bottom: var(--pb-spacing-2xl);
}
.case-summary,
.validation-error {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
}
.case-summary div {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  min-width: var(--pb-spacing-none);
}
.case-summary strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.case-summary span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.validation-error {
  border-radius: var(--pb-radius-md);
  font: var(--pb-typography-content);
}
.submit-area {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  padding-top: var(--pb-spacing-sm);
}
.submission-note {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.approval-policy {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.resolution-section {
  padding: var(--pb-spacing-md);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
}
.resolution-section-header h2 {
  margin: var(--pb-spacing-none);
  font: var(--pb-typography-subtitle);
}
.resolution-section-header p {
  margin: var(--pb-spacing-xxs) var(--pb-spacing-none) var(--pb-spacing-none);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.resolution-section-header em {
  margin-left: var(--pb-spacing-xs);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
  font-style: normal;
}
.resolution-section-content {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  margin-top: var(--pb-spacing-sm-plus);
}
</style>
