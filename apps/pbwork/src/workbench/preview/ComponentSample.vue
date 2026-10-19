<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import PbButton from "@/design-system/components/action/Button.vue";
import {
  BUTTON_KINDS,
  type ButtonKind,
} from "@/design-system/components/_shared/colorTokens";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import { componentScenarios } from "@/design-system/components/scenarios";
import { loadComponentContract } from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import type { PreviewDeviceSession } from "./model";
const props = defineProps<{
  componentId: string;
  attach: string;
  device: PreviewDeviceSession;
}>();
const record = computed(() =>
  componentRecords.find((c) => c.id === props.componentId)!,
);
const contract = computed(() => loadComponentContract(record.value.contract)!);
const scenarios = computed(() => componentScenarios(props.componentId));
const selectedScenario = computed(
  () =>
    scenarios.value.find((s) => s.id === props.device.demo.scenarioId) ??
    scenarios.value[0]!,
);
const title = computed(() =>
  String(
    selectedScenario.value.props?.title ??
      contract.value.defaultProps.title ??
      "Bottom Sheet",
  ),
);
const demo = computed(() => props.device.demo);
const prefix = computed(
  () => `preview.${props.device.id}.${props.componentId}`,
);
const buttonSizes = computed(() => {
  const control = record.value.controls.find((c) => c.key === "size");
  return control && "options" in control ? (control.options ?? []) : [];
});
const buttonKindLabels: Record<ButtonKind, string> = {
  primary: "主要",
  secondary: "次要",
  outlined: "描边",
  accent: "开始记录",
  danger: "删除",
  quiet: "跳过",
};
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => demo.value.busy,
  (busy) => {
    clearTimeout(timer);
    if (busy)
      timer = setTimeout(() => {
        demo.value.busy = false;
        demo.value.completed = true;
      }, 800);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
function submit() {
  demo.value.completed = false;
  demo.value.busy = true;
}
function openScenario(id: string) {
  demo.value.scenarioId = id;
  const scenario = scenarios.value.find((s) => s.id === id);
  const detent = scenario?.props?.detent;
  demo.value.detent =
    detent === "medium" || detent === "expanded" ? detent : "content";
  demo.value.material =
    scenario?.props?.material === "glass" ? "glass" : "solid";
  demo.value.open = true;
}
</script>
<template>
  <div class="component-sample">
    <h2>{{ componentId === "button" ? "操作与状态" : "面板与档位" }}</h2>
    <p>{{ record.description }}</p>
    <template v-if="componentId === 'button'">
      <section data-primary-preview>
        <h3>交互</h3>
        <PbButton
          :label="String(scenarios[0]!.props?.label ?? '提交')"
          :loading="demo.busy"
          block
          :inspect-id="`${prefix}.primary`"
          @click="submit"
        />
        <p v-if="demo.completed" role="status">
          已完成；按钮已恢复可继续操作。
        </p>
      </section>
      <section>
        <h3>类型</h3>
        <div
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="sample-row"
          :data-exhibit="`type.${scenario.id}`"
        >
          <span>{{ scenario.label }}</span>
          <PbButton
            :label="String(scenario.props?.label ?? '确认')"
            :kind="scenario.props?.kind as ButtonKind"
            :inspect-id="`${prefix}.type.${scenario.id}`"
            @click="submit"
          />
        </div>
      </section>
      <section>
        <h3>尺寸</h3>
        <div
          v-for="size in buttonSizes"
          :key="String(size.value)"
          class="sample-row"
        >
          <span>{{ size.label }}</span>
          <PbButton
            label="确认"
            :size="size.value as 'sm' | 'md' | 'lg'"
            :inspect-id="`${prefix}.size.${size.value}`"
            @click="submit"
          />
        </div>
      </section>
      <section>
        <h3>玻璃材质</h3>
        <p>同一玻璃材质适配全部公开操作类型。</p>
        <div class="glass-button-scene">
          <span class="glass-scene-copy" aria-hidden="true"
            >今日记录 · 下一步安排</span
          >
          <div class="glass-button-actions">
            <PbButton
              v-for="kind in BUTTON_KINDS"
              :key="kind"
              :label="buttonKindLabels[kind]"
              :kind="kind"
              material="glass"
              :loading="demo.busy"
              :inspect-id="`${prefix}.glass.${kind}`"
              @click="submit"
            />
          </div>
        </div>
      </section>
      <section>
        <h3>状态</h3>
        <div
          v-for="state in contract.states"
          :key="state.id"
          class="sample-row"
          :data-exhibit="`state.${state.id}`"
          :data-preview-state="state.id"
          :class="{ 'is-glass-sample': state.props?.material === 'glass' }"
        >
          <span>{{ state.label }}</span>
          <PbButton
            label="提交工单"
            v-bind="state.props"
            :inspect-id="`${prefix}.state.${state.id}`"
          />
        </div>
      </section>
    </template>
    <template v-else>
      <section>
        <h3>触发与档位</h3>
        <div
          v-for="(scenario, index) in scenarios"
          :key="scenario.id"
          class="sample-row"
        >
          <span>{{ scenario.description }}</span>
          <PbButton
            :label="index === 0 ? '打开Bottom Sheet' : `显示${scenario.label}`"
            :inspect-id="`${prefix}.trigger.${scenario.id}`"
            @click="openScenario(scenario.id)"
          />
        </div>
      </section>
      <section>
        <h3>Contract 状态</h3>
        <PbButton
          v-for="state in contract.states"
          :key="state.id"
          :label="`演示${state.label}`"
          :inspect-id="`${prefix}.contract.${state.id}`"
          :data-preview-state="state.id"
          @click="
            demo.open = Boolean(state.props?.modelValue);
            demo.material =
              state.props?.material === 'glass' ? 'glass' : 'solid';
            demo.detent =
              state.props?.detent === 'medium'
                ? 'medium'
                : state.props?.detent === 'expanded'
                  ? 'expanded'
                  : 'content';
          "
        />
      </section>
      <BottomSheet
        v-model="demo.open"
        :material="demo.material === 'glass' ? 'glass' : 'solid'"
        v-model:detent="demo.detent"
        :title="title"
        :attach="attach"
        :detents="['content', 'medium', 'expanded']"
        :inspect-id="`${prefix}.sheet`"
      >
        <p>{{ selectedScenario.description }}</p>
        <p>面板、遮罩和滚动均属于这台手机。</p>
        <template #actions
          ><PbButton
            label="完成"
            block
            :inspect-id="`${prefix}.finish`"
            @click="
              demo.open = false;
              demo.completed = true;
            "
        /></template>
      </BottomSheet>
      <p v-if="demo.completed" role="status">已完成面板操作。</p>
    </template>
  </div>
</template>
<style scoped>
.component-sample {
  padding: var(--pb-spacing-md);
  color: var(--pb-color-on-background);
  font: var(--pb-typography-content);
}
.component-sample h2 {
  margin: 0 0 var(--pb-spacing-sm);
  font: var(--pb-typography-title);
}
.component-sample > p {
  color: var(--pb-color-on-surface-muted);
}
.component-sample section {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  padding-block: var(--pb-spacing-md);
  border-bottom: var(--pb-border-hairline);
}
.component-sample h3 {
  font: var(--pb-typography-label);
  margin: 0;
}
.sample-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--pb-spacing-xs);
}
.sample-row > span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>

<style scoped>
.glass-button-scene {
  position: relative;
  padding: var(--pb-spacing-lg);
  border-radius: var(--pb-radius-surface);
  background: linear-gradient(
    120deg,
    var(--pb-color-primary-soft),
    var(--pb-color-surface-recessed),
    var(--pb-color-action-soft)
  );
}
.glass-scene-copy {
  display: block;
  margin-bottom: var(--pb-spacing-md);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-subtitle);
}
.glass-button-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-sm);
}
.sample-row.is-glass-sample {
  padding: var(--pb-spacing-sm-plus);
  border-radius: var(--pb-radius-surface);
  background: linear-gradient(
    120deg,
    var(--pb-color-primary-soft),
    var(--pb-color-surface-recessed),
    var(--pb-color-action-soft)
  );
}
</style>
