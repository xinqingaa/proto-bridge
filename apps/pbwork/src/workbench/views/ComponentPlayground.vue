<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  watch,
  type Component,
} from "vue";
import { componentViewModules, loadComponentContract } from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import { usePlaygroundStore } from "@/app/stores/playground";
import type { PlaygroundControl } from "@/design-system/types";

const props = defineProps<{ componentId: string }>();
const playground = usePlaygroundStore();

const record = computed(() =>
  componentRecords.find((item) => item.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
);
const controls = computed(
  () => (record.value?.controls ?? []) as PlaygroundControl[],
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
</script>

<template>
  <section v-if="record && contract" class="playground">
    <header>
      <p>{{ record.category === "basic" ? "基础组件" : "复杂组件" }}</p>
      <h1>{{ record.label }}</h1>
    </header>

    <div class="playground-grid">
      <div class="preview">
        <component :is="previewComponent" v-bind="playground.props" />
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
  margin: 0 0 24px;
  font-size: 1.75rem;
}
.playground-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 20px;
}
.preview,
.controls {
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
@media (max-width: 900px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }
}
</style>
