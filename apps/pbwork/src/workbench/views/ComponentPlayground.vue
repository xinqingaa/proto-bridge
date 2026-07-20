<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import {
  componentViewModules,
  loadComponentContract,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import { usePlaygroundStore } from "@/app/stores/playground";
import type { PlaygroundControl } from "@/design-system/types";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import { resolveLiveTokenBindings } from "@/design-system/resolveLiveTokenBindings";

const props = defineProps<{ componentId: string }>();
const playground = usePlaygroundStore();
const selectedStateId = ref("default");

const record = computed(() =>
  componentRecords.find((item) => item.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
);
const controls = computed(
  () => (record.value?.controls ?? []) as PlaygroundControl[],
);
const states = computed(() => contract.value?.states ?? []);
const tokenBindings = computed(() =>
  Object.entries(
    resolveLiveTokenBindings(
      contract.value?.tokenBindings ?? {},
      playground.props,
    ),
  ),
);
const lightPreviewStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens("light")),
);
const darkPreviewStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens("dark")),
);
const tallPreview = computed(() =>
  ["bottom-sheet", "data-list", "app-bar", "tabs", "dialog"].includes(props.componentId),
);

const previewComponent = computed(() => {
  if (!record.value) return null;
  const match = Object.entries(componentViewModules).find(([path]) =>
    path.endsWith(`/${record.value!.view}`),
  );
  if (!match) return null;
  return defineAsyncComponent(
    match[1] as () => Promise<{ default: Component }>,
  );
});

watch(
  () => props.componentId,
  (id) => {
    playground.open(id);
    selectedStateId.value = "default";
  },
  { immediate: true },
);

onMounted(() => playground.open(props.componentId));

function onPreviewUpdate(value: unknown) {
  setControlValue("modelValue", value);
}

function controlValue(key: string): unknown {
  return playground.props[key];
}

function setControlValue(key: string, value: unknown) {
  playground.setProp(key, value);
}

function resetCurrent() {
  selectState(selectedStateId.value);
}

function selectState(id: string) {
  selectedStateId.value = id;
  playground.open(props.componentId);
  const state = states.value.find((item) => item.id === id);
  for (const [key, value] of Object.entries(state?.props ?? {})) {
    playground.setProp(key, value);
  }
}
</script>

<template>
  <ResourcePageShell
    v-if="record && contract"
    :eyebrow="record.category === 'basic' ? '基础组件' : '复杂组件'"
    :title="record.label"
    description="在浅色与深色中同时体验组件；选择一个正式状态后，可用易懂的控件调整内容、外观与行为。"
  >
    <template #stats>
      <v-chip size="small" variant="tonal">{{ controls.length }} 个可调项</v-chip>
      <v-chip size="small" variant="tonal">{{ states.length }} 个预设状态</v-chip>
      <v-chip size="small" variant="tonal"
        >{{ tokenBindings.length }} Bindings</v-chip
      >
    </template>

    <template #toolbar>
      <v-btn-toggle
        v-if="states.length"
        :model-value="selectedStateId"
        density="compact"
        color="primary"
        variant="outlined"
        divided
        mandatory
      >
        <v-btn value="default" size="small" @click="selectState('default')">默认</v-btn>
        <v-btn
          v-for="state in states"
          :key="state.id"
          :value="state.id"
          size="small"
          @click="selectState(state.id)"
        >{{ state.label }}</v-btn>
      </v-btn-toggle>
      <span class="toolbar-hint">浅色在左、深色在右 · 与工作台壳主题无关</span>
    </template>

    <div class="playground-grid">
      <div class="preview-wrap">
        <div class="dual-preview">
          <article class="preview-pane" :style="lightPreviewStyle">
            <header><strong>浅色</strong><code>theme.light</code></header>
            <div class="preview" :class="{ 'is-tall': tallPreview }">
              <component
                :is="previewComponent"
                v-bind="playground.props"
                @update:model-value="onPreviewUpdate"
              >
                <template v-if="record.id === 'bottom-sheet'">点遮罩或「关闭」可收起。</template>
                <template v-else-if="record.id === 'card'">Card 表面、圆角和阴影来自设计令牌。</template>
              </component>
            </div>
          </article>
          <article class="preview-pane" :style="darkPreviewStyle">
            <header><strong>深色</strong><code>theme.dark</code></header>
            <div class="preview" :class="{ 'is-tall': tallPreview }">
              <component
                :is="previewComponent"
                v-bind="playground.props"
                @update:model-value="onPreviewUpdate"
              >
                <template v-if="record.id === 'bottom-sheet'">点遮罩或「关闭」可收起。</template>
                <template v-else-if="record.id === 'card'">Card 表面、圆角和阴影来自设计令牌。</template>
              </component>
            </div>
          </article>
        </div>

      </div>

      <v-form class="controls" @submit.prevent>
        <div class="controls-header">
          <div>
            <strong>调整组件</strong>
            <span>修改后立即更新两侧预览</span>
          </div>
          <v-btn size="small" variant="text" @click="resetCurrent">重置</v-btn>
        </div>

        <p class="controls-explainer">无需理解 Props：下面的设置分别控制组件内容、外观和交互状态。</p>

        <fieldset class="controls-fields">
          <template v-for="control in controls" :key="control.key">
            <div class="control-label">
              <span>{{ control.label }}</span>
              <code>{{ control.key }}</code>
            </div>
            <v-switch
              v-if="control.control === 'boolean'"
              :model-value="Boolean(controlValue(control.key))"
              :label="control.label"
              color="primary"
              hide-details
              class="mb-3"
              @update:model-value="setControlValue(control.key, $event)"
            />
            <v-select
              v-else-if="control.control === 'select'"
              :model-value="controlValue(control.key)"
              :items="control.options ?? []"
              item-title="label"
              item-value="value"
              :label="`${control.label} · ${control.key}`"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-3"
              @update:model-value="setControlValue(control.key, $event)"
            />
            <v-text-field
              v-else
              :model-value="String(controlValue(control.key) ?? '')"
              :label="`${control.label} · ${control.key}`"
              :type="control.control === 'number' ? 'number' : 'text'"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-3"
              @update:model-value="
                setControlValue(
                  control.key,
                  control.control === 'number' ? Number($event) : $event,
                )
              "
            />
          </template>
        </fieldset>

        <section class="token-bindings">
          <strong>Token 绑定</strong>
          <ul v-if="tokenBindings.length" class="binding-list">
            <li v-for="[slot, tokenId] in tokenBindings" :key="slot">
              <span>{{ slot }}</span>
              <code>{{ tokenId }}</code>
            </li>
          </ul>
          <p v-else class="empty">无 Token 绑定。</p>
        </section>

        <v-alert type="info" variant="tonal" density="comfortable">
          高级写回（更新组件示例）将在 M6 启用。
        </v-alert>
      </v-form>
    </div>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal"
    >未知组件：{{ componentId }}</v-alert
  >
</template>

<style scoped>
.toolbar-hint {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.playground-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 20px;
  align-items: start;
}
.preview-wrap,
.controls {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.dual-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.preview-pane {
  min-width: 0;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.preview-pane + .preview-pane {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.preview-pane > header {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  font-size: 0.75rem;
}
.preview-pane > header code {
  color: var(--pb-color-on-surface-muted, #64748b);
}
.preview {
  position: relative;
  overflow: hidden;
  min-height: 120px;
  padding: 20px;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.preview.is-tall {
  min-height: 260px;
}
.controls {
  padding: 16px;
}
.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.controls-header > div {
  display: grid;
  gap: 2px;
}
.controls-header span,
.controls-explainer {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.controls-explainer {
  margin: 0 0 16px;
  line-height: 1.5;
}
.control-label {
  display: flex;
  justify-content: space-between;
  margin: 2px 0 5px;
  font-size: 0.75rem;
}
.control-label code {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.6875rem;
}
.controls-fields {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.token-bindings {
  margin: 8px 0 16px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.token-bindings strong {
  display: block;
  margin-bottom: 8px;
  font-size: 0.8125rem;
}
.binding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.binding-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
}
.binding-list code {
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.empty {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
@media (max-width: 1279px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .dual-preview {
    grid-template-columns: 1fr;
  }
  .preview-pane + .preview-pane {
    border-left: 0;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
