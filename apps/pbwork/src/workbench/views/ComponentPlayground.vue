<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import { componentViewModules, loadComponentContract } from "@/design-system/loaders";
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
const designThemeId = ref("light");

const record = computed(() =>
  componentRecords.find((item) => item.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
);
const controls = computed(
  () => (record.value?.controls ?? []) as PlaygroundControl[],
);
const tokenBindings = computed(() =>
  Object.entries(
    resolveLiveTokenBindings(
      contract.value?.tokenBindings ?? {},
      playground.props,
    ),
  ),
);
const previewStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens(designThemeId.value)),
);
const tallPreview = computed(() =>
  ["bottom-sheet", "data-list", "app-bar", "tabs"].includes(props.componentId),
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
  (id) => playground.open(id),
  { immediate: true },
);

onMounted(() => playground.open(props.componentId));

function onPreviewUpdate(value: unknown) {
  playground.setProp("modelValue", value);
}
</script>

<template>
  <section v-if="record && contract" class="playground">
    <header>
      <p>{{ record.category === "basic" ? "基础组件" : "复杂组件" }}</p>
      <h1>{{ record.label }}</h1>
      <p class="hint">由设计令牌组成外观；复杂组件可复用基础组件。</p>
    </header>

    <div class="playground-grid">
      <div class="preview-wrap">
        <div class="preview-toolbar">
          <div class="preview-theme">
            <span class="preview-theme-label">设计系统主题</span>
            <span class="preview-theme-hint"
              >仅预览 · 与顶部工作台主题无关</span
            >
          </div>
          <v-switch
            :model-value="designThemeId === 'dark'"
            label="深色"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="designThemeId = $event ? 'dark' : 'light'"
          />
        </div>
        <div
          class="preview"
          :class="{ 'is-tall': tallPreview }"
          :style="previewStyle"
        >
          <component
            :is="previewComponent"
            v-bind="playground.props"
            @update:model-value="onPreviewUpdate"
          >
            <template v-if="record.id === 'bottom-sheet'">
              点遮罩或「关闭」可收起。这是由 Token 驱动的 Sheet。
            </template>
            <template v-else-if="record.id === 'card'">
              Card 表面 / 圆角 / 阴影来自设计令牌。
            </template>
          </component>
        </div>
      </div>

      <v-form class="controls" @submit.prevent>
        <div class="controls-header">
          <strong>Props</strong>
          <v-btn size="small" variant="text" @click="playground.reset"
            >重置</v-btn
          >
        </div>

        <template v-for="control in controls" :key="control.key">
          <v-switch
            v-if="control.control === 'boolean'"
            :model-value="Boolean(playground.props[control.key])"
            :label="control.label"
            color="primary"
            hide-details
            class="mb-3"
            @update:model-value="playground.setProp(control.key, $event)"
          />
          <v-select
            v-else-if="control.control === 'select'"
            :model-value="playground.props[control.key]"
            :items="control.options ?? []"
            item-title="label"
            item-value="value"
            :label="control.label"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mb-3"
            @update:model-value="playground.setProp(control.key, $event)"
          />
          <v-text-field
            v-else
            :model-value="String(playground.props[control.key] ?? '')"
            :label="control.label"
            :type="control.control === 'number' ? 'number' : 'text'"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mb-3"
            @update:model-value="
              playground.setProp(
                control.key,
                control.control === 'number' ? Number($event) : $event,
              )
            "
          />
        </template>

        <div v-if="tokenBindings.length > 0" class="token-bindings">
          <strong>令牌绑定（随 Props 更新）</strong>
          <ul>
            <li v-for="[slot, tokenId] in tokenBindings" :key="slot">
              <span>{{ slot }}</span>
              <code>{{ tokenId }}</code>
            </li>
          </ul>
        </div>

        <v-alert type="info" variant="tonal" density="comfortable">
          高级写回（更新组件示例）将在 M6 启用。
        </v-alert>
      </v-form>
    </div>
  </section>
  <v-alert v-else type="error" variant="tonal"
    >未知组件：{{ componentId }}</v-alert
  >
</template>

<style scoped>
.playground {
  width: min(960px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
}
.hint {
  margin: 0 0 24px !important;
  color: rgba(var(--v-theme-on-surface), 0.62) !important;
  font-size: 0.8125rem !important;
  font-weight: 400 !important;
}
.playground-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
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
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.preview-theme {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.preview-theme-label {
  font-size: 0.8125rem;
  font-weight: 600;
}
.preview-theme-hint {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.6875rem;
}
.preview {
  position: relative;
  min-height: 96px;
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
.token-bindings ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.token-bindings li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
}
.token-bindings code {
  color: rgba(var(--v-theme-on-surface), 0.62);
}
@media (max-width: 900px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }
}
</style>
