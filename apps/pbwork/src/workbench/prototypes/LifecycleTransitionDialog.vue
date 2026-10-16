<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  LoaderCircle,
  RotateCcw,
} from "lucide-vue-next";
import type { PrototypeRecord } from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";

/** Every lifecycle action a caller can request; finalize has its own sheet. */
export type LifecycleIntent =
  | "advance"
  | "return-active"
  | "finalize"
  | "rollback"
  | "archive";

/** Intents this dialog renders; finalization lives in LifecycleFinalizationSheet. */
export type LifecycleTransitionIntent = Exclude<LifecycleIntent, "finalize">;

const props = defineProps<{
  modelValue: boolean;
  prototype: PrototypeRecord;
  intent: LifecycleTransitionIntent;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  changed: [];
}>();

const lifecycle = usePrototypeLifecycleStore();
const note = ref("");
const consequenceAccepted = ref(false);
const submitting = ref(false);
const polling = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const record = computed(() => lifecycle.recordFor(props.prototype.id));
const current = computed(() => record.value?.stage ?? "active");
const operation = computed(() => record.value?.operation ?? { kind: "idle" as const });
const target = computed(() => {
  if (props.intent === "advance") return "review";
  if (props.intent === "return-active") return "active";
  if (props.intent === "rollback") return "review";
  return "archived";
});
const title = computed(() => {
  if (props.intent === "advance") return "送交待确定";
  if (props.intent === "return-active") return "退回进行中";
  if (props.intent === "rollback") return "回退到待确定";
  return "归档原型";
});

function close() {
  emit("update:modelValue", false);
}

function initialize() {
  note.value = "";
  consequenceAccepted.value = false;
}

async function poll() {
  if (polling.value || operation.value.kind !== "rolling-back") return;
  polling.value = true;
  try {
    await lifecycle.pollFinalization(props.prototype);
  } finally {
    polling.value = false;
  }
}

async function submitSimple() {
  submitting.value = true;
  try {
    if (props.intent === "advance") {
      await lifecycle.transition(props.prototype, "review", note.value);
    } else if (props.intent === "return-active") {
      await lifecycle.transition(props.prototype, "active", note.value);
    } else if (props.intent === "archive") {
      await lifecycle.transition(props.prototype, "archived", note.value);
    } else if (props.intent === "rollback") {
      const completed = await lifecycle.rollbackToReview(
        props.prototype,
        note.value,
      );
      if (!completed) return;
    }
    emit("changed");
    close();
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (pollTimer) clearInterval(pollTimer);
    if (!open) return;
    initialize();
    pollTimer = setInterval(() => void poll(), 1000);
  },
  { immediate: true },
);

watch([current, () => operation.value.kind], ([stage, kind]) => {
  if (
    props.modelValue &&
    props.intent === "rollback" &&
    stage === "review" &&
    kind === "idle"
  ) {
    emit("changed");
    close();
  }
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="lifecycle-dialog" role="document">
      <header>
        <p>原型生命周期</p>
        <h2>{{ title }}</h2>
        <span>{{ prototype.label }}</span>
      </header>

      <div class="transition-route">
        <strong>{{ LIFECYCLE_LABELS[current] }}</strong>
        <ArrowRight :size="17" />
        <strong>{{ LIFECYCLE_LABELS[target] }}</strong>
      </div>

      <div
        v-if="intent === 'rollback' && operation.kind === 'rolling-back'"
        class="operation-status"
        aria-live="polite"
      >
        <LoaderCircle :size="17" class="spin" />
        <span>Local Service 正在清理定稿 Evidence…</span>
      </div>
      <div
        v-else-if="intent === 'rollback' && operation.kind === 'failed' && operation.action === 'rollback'"
        class="operation-status failed"
        role="alert"
      >
        <AlertTriangle :size="17" />
        <span>{{ operation.message }}</span>
      </div>
      <section class="consequence-block">
        <strong v-if="intent === 'advance'">进入方案确认阶段</strong>
        <strong v-else-if="intent === 'return-active'">继续制作原型</strong>
        <strong v-else-if="intent === 'rollback'">定稿产物将失效</strong>
        <strong v-else>归档后永久只读</strong>
        <p v-if="intent === 'advance'">不会提前采集 Evidence；候选方案可在待确定阶段并存。</p>
        <p v-else-if="intent === 'return-active'">不会产生或清理正式 Evidence。</p>
        <p v-else-if="intent === 'rollback'">先把本次定稿 Bundle 移入 Store trash，再回到待确定。</p>
        <p v-else>归档后不能回退、修改、重新采集或删除。</p>
      </section>
      <WorkbenchCheckbox
        v-if="intent === 'rollback' || intent === 'archive'"
        v-model="consequenceAccepted"
        :label="
          intent === 'rollback'
            ? '我确认定稿 Evidence 和提示词将不再可用'
            : '我确认归档是不可逆的终态'
        "
      />
      <label class="transition-note">
        流转备注（可选）
        <v-textarea
          v-model="note"
          maxlength="300"
          rows="2"
          auto-grow
          hide-details
          density="compact"
          variant="outlined"
          placeholder="记录本次状态变化的原因"
        />
      </label>

      <footer>
        <WorkbenchButton tone="ghost" @click="close">关闭</WorkbenchButton>
        <WorkbenchButton
          :tone="intent === 'rollback' || intent === 'archive' ? 'danger' : 'primary'"
          :loading="submitting"
          :disabled="
            (intent === 'rollback' || intent === 'archive') &&
              (!consequenceAccepted || operation.kind === 'rolling-back')
          "
          @click="submitSimple"
        >
          <Archive v-if="intent === 'archive'" :size="14" />
          <RotateCcw v-else-if="intent === 'rollback'" :size="14" />
          {{
            intent === 'rollback' && operation.kind === 'failed' && operation.action === 'rollback'
              ? '重试回退'
              : `确认${title}`
          }}
        </WorkbenchButton>
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped>
.lifecycle-dialog {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 24px 70px rgba(6, 10, 18, 0.34);
}
header p {
  margin: 0 0 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
header h2 {
  margin: 0 0 5px;
  font-size: 1.3rem;
}
header span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.78rem;
}
.transition-route {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  font-size: 0.78rem;
}
.transition-route svg {
  color: rgb(var(--v-theme-primary));
}
.operation-status {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 700;
}
.operation-status.failed {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 10%, transparent);
  color: rgb(var(--v-theme-error));
}
.consequence-block {
  display: grid;
  gap: 8px;
  padding: 13px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 4px 10px 10px 4px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  font-size: 0.78rem;
}
.consequence-block p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.65);
  line-height: 1.55;
}
.transition-note {
  display: grid;
  gap: 7px;
  font-size: 0.72rem;
  font-weight: 700;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.spin {
  animation: spin 0.85s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 620px) {
  .lifecycle-dialog {
    padding: 18px;
  }
}
</style>
