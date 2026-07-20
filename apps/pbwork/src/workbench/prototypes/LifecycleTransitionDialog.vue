<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowRight, RotateCcw } from "lucide-vue-next";
import type { PrototypeLifecycle, PrototypeRecord } from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { lifecycleTransitions, usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";

const props = defineProps<{ modelValue: boolean; prototype: PrototypeRecord }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; changed: [] }>();
const lifecycle = usePrototypeLifecycleStore();
const selected = ref<PrototypeLifecycle | null>(null);
const note = ref("");
const current = computed(() => lifecycle.effectiveLifecycle(props.prototype));
const options = computed(() => lifecycleTransitions[current.value]);

watch(() => props.modelValue, (open) => {
  if (!open) return;
  selected.value = options.value[0] ?? null;
  note.value = "";
}, { immediate: true });

function submit() {
  if (!selected.value) return;
  lifecycle.transition(props.prototype, selected.value, note.value);
  emit("changed");
  emit("update:modelValue", false);
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" @update:model-value="emit('update:modelValue', $event)">
    <section class="lifecycle-dialog" role="document">
      <header>
        <p>本地工作台状态</p>
        <h2>流转「{{ prototype.label }}」</h2>
        <span>状态流转立即作用于列表、筛选、原型树和概览。</span>
      </header>
      <div class="transition-current">
        <strong>{{ LIFECYCLE_LABELS[current] }}</strong><ArrowRight :size="17" />
        <span>选择目标状态</span>
      </div>
      <div class="transition-options" role="radiogroup" aria-label="目标状态">
        <button v-for="option in options" :key="option" type="button" role="radio" :aria-checked="selected === option" :class="{ active: selected === option }" @click="selected = option">
          <strong>{{ LIFECYCLE_LABELS[option] }}</strong>
          <small>{{ option === 'active' ? '继续编辑与完善' : option === 'review' ? '进入团队确认' : option === 'final' ? '确认设计定稿' : '停止日常展示' }}</small>
        </button>
      </div>
      <label class="transition-note">流转备注（可选）<textarea v-model="note" maxlength="300" rows="3" placeholder="记录本次状态变化的原因" /></label>
      <footer>
        <WorkbenchButton tone="ghost" @click="emit('update:modelValue', false)">取消</WorkbenchButton>
        <WorkbenchButton tone="primary" :disabled="!selected" @click="submit"><RotateCcw :size="14" />确认流转</WorkbenchButton>
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped>
.lifecycle-dialog { padding: 22px; border-radius: 16px; background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-on-surface)); box-shadow: 0 24px 70px rgba(15,23,42,.26); }
header p { margin: 0 0 4px; color: rgb(var(--v-theme-primary)); font-size: .7rem; font-weight: 800; letter-spacing: .05em; }
header h2 { margin: 0 0 6px; font-size: 1.25rem; }
header span { color: rgba(var(--v-theme-on-surface),.58); font-size: .78rem; }
.transition-current { display:flex; align-items:center; gap:8px; margin:18px 0 10px; padding:10px 12px; border-radius:10px; background:rgba(var(--v-theme-on-surface),.05); font-size:.78rem; }
.transition-current span { color:rgba(var(--v-theme-on-surface),.55); }
.transition-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.transition-options button { display:grid; gap:3px; padding:11px; text-align:left; border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:10px; background:transparent; color:inherit; cursor:pointer; }
.transition-options button.active { border-color:rgb(var(--v-theme-primary)); background:color-mix(in srgb,rgb(var(--v-theme-primary)) 10%,transparent); color:rgb(var(--v-theme-primary)); }
.transition-options small { color:rgba(var(--v-theme-on-surface),.55); }
.transition-note { display:grid; gap:6px; margin-top:14px; font-size:.72rem; font-weight:700; }
.transition-note textarea { resize:vertical; padding:9px 10px; border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:9px; outline:none; background:rgba(var(--v-theme-on-surface),.025); color:inherit; font:inherit; font-weight:400; }
.transition-note textarea:focus { border-color:rgb(var(--v-theme-primary)); }
footer { display:flex; justify-content:flex-end; gap:8px; margin-top:18px; }
</style>
