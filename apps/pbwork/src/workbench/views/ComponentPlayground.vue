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
const designThemeId = ref("light");
const viewMode = ref<"single" | "matrix">("single");

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
const previewStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens(designThemeId.value)),
);
const tallPreview = computed(() =>
  ["bottom-sheet", "data-list", "app-bar", "tabs"].includes(props.componentId),
);
const isMatrix = computed(() => viewMode.value === "matrix");

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

const matrixCells = computed(() => {
  const base = contract.value?.defaultProps ?? {};
  const cells = [{ id: "default", label: "默认", props: { ...base } }];
  for (const state of states.value) {
    cells.push({
      id: state.id,
      label: state.label,
      props: { ...base, ...(state.props ?? {}) },
    });
  }
  return cells;
});

watch(
  () => props.componentId,
  (id) => {
    playground.open(id);
    viewMode.value = "single";
  },
  { immediate: true },
);

onMounted(() => playground.open(props.componentId));

function onPreviewUpdate(value: unknown) {
  playground.setProp("modelValue", value);
}
</script>

<template>
  <ResourcePageShell
    v-if="record && contract"
    :eyebrow="record.category === 'basic' ? '基础组件' : '复杂组件'"
    :title="record.label"
    description="主预览区占主要空间；右侧 Props 仅作用于单状态。状态矩阵为只读对照。"
  >
    <template #stats>
      <v-chip size="small" variant="tonal">{{ controls.length }} Props</v-chip>
      <v-chip size="small" variant="tonal">{{ states.length }} States</v-chip>
      <v-chip size="small" variant="tonal"
        >{{ tokenBindings.length }} Bindings</v-chip
      >
    </template>

    <template #toolbar>
      <v-btn-toggle
        v-model="viewMode"
        density="compact"
        color="primary"
        variant="outlined"
        divided
        mandatory
      >
        <v-btn value="single" size="small">单状态</v-btn>
        <v-btn value="matrix" size="small">状态矩阵</v-btn>
      </v-btn-toggle>
      <v-switch
        :model-value="designThemeId === 'dark'"
        label="深色预览"
        color="primary"
        density="compact"
        hide-details
        @update:model-value="designThemeId = $event ? 'dark' : 'light'"
      />
      <span class="toolbar-hint">仅预览 · 与顶部工作台主题无关</span>
    </template>

    <div class="playground-grid">
      <div class="preview-wrap">
        <div
          v-if="viewMode === 'single'"
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

        <div
          v-else
          class="matrix-grid is-readonly"
          :style="previewStyle"
          aria-label="状态矩阵（只读）"
        >
          <article
            v-for="cell in matrixCells"
            :key="cell.id"
            class="matrix-cell"
          >
            <header>{{ cell.label }}</header>
            <div class="matrix-preview" :class="{ 'is-tall': tallPreview }">
              <component :is="previewComponent" v-bind="cell.props">
                <template v-if="record.id === 'bottom-sheet'">
                  状态矩阵预览（只读）。
                </template>
                <template v-else-if="record.id === 'card'">
                  Card 表面 / 圆角 / 阴影来自设计令牌。
                </template>
              </component>
            </div>
          </article>
        </div>
      </div>

      <v-form class="controls" @submit.prevent>
        <div class="controls-header">
          <strong>Props</strong>
          <v-btn
            size="small"
            variant="text"
            :disabled="isMatrix"
            @click="playground.reset"
            >重置</v-btn
          >
        </div>

        <v-alert
          v-if="isMatrix"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-3"
        >
          状态矩阵为只读对照，右侧 Props 不会作用于矩阵。切回「单状态」可调参。
        </v-alert>

        <fieldset class="controls-fields" :disabled="isMatrix">
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
.preview {
  position: relative;
  min-height: 120px;
  padding: 20px;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.preview.is-tall,
.matrix-preview.is-tall {
  min-height: 260px;
}
.matrix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}
.matrix-grid.is-readonly {
  pointer-events: none;
  user-select: none;
}
.matrix-cell {
  background: rgb(var(--v-theme-surface));
}
.matrix-cell header {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.75rem;
  font-weight: 700;
}
.matrix-preview {
  position: relative;
  min-height: 120px;
  padding: 16px;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
  overflow: hidden;
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
.controls-fields {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.controls-fields:disabled {
  opacity: 0.55;
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
</style>
