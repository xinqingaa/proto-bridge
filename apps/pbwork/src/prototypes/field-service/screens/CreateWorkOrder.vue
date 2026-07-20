<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import FieldServiceShell from "../FieldServiceShell.vue";
import FormSection from "@/design-system/components/complex/FormSection.vue";
import SelectField from "@/design-system/components/basic/SelectField.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Textarea from "@/design-system/components/basic/Textarea.vue";
import RadioGroup from "@/design-system/components/basic/RadioGroup.vue";
import Checkbox from "@/design-system/components/basic/Checkbox.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";

const route = useRoute();
const router = useRouter();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const customer = ref("远景科技");
const service = ref("维修");
const description = ref("");
const priority = ref("普通");
const notify = ref(true);
const toast = ref(variant.value === "toast-open");
const submitted = ref(false);
const submitting = ref(false);
const invalid = computed(
  () =>
    variant.value === "validation-error" ||
    (submitted.value && !description.value.trim()),
);

async function submit() {
  submitted.value = true;
  if (!customer.value.trim() || !service.value || !description.value.trim()) return;
  submitting.value = true;
  toast.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  await router.push(
    `/prototype/field-service/work-order-detail?variant=created&theme=${theme.value}`,
  );
}
</script>

<template>
  <FieldServiceShell title="新建工单" active="工单" back-to="work-orders">
    <form class="page" data-pb-id="field-service.create-work-order" @submit.prevent="submit">
      <FormSection title="客户信息" description="选择客户与服务类型" required>
        <TextField v-model="customer" label="客户" />
        <SelectField v-model="service" label="服务类型" :options="['维修', '巡检', '安装']" />
      </FormSection>
      <FormSection title="问题与优先级" description="描述现场问题，便于工程师提前准备" required>
        <Textarea v-model="description" label="问题描述" :rows="4" />
        <p v-if="invalid" class="field-error">请填写问题描述</p>
        <RadioGroup v-model="priority" label="优先级" :options="['低', '普通', '紧急']" />
        <Checkbox v-model="notify" label="创建后通知客户" />
      </FormSection>
      <Button type="submit" :label="submitting ? '正在创建…' : '创建工单'" :disabled="submitting" />
    </form>
    <div class="toast-wrap">
      <SnackbarToast v-model="toast" message="工单已创建，正在打开详情" />
    </div>
  </FieldServiceShell>
</template>

<style scoped>
.page { display: grid; gap: 14px; padding: 14px; }
.field-error { margin: -8px 0 0; color: var(--pb-color-error); font: var(--pb-typography-caption); }
.toast-wrap { position: fixed; z-index: 50; left: 16px; right: 16px; bottom: calc(16px + var(--pb-safe-bottom, 0px)); }
</style>
