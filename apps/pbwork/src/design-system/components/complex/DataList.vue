<script setup lang="ts">
import { computed, toRefs } from "vue";
import { ChevronRight } from "lucide-vue-next";
import Chip from "@/design-system/components/basic/Chip.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  items: Array<{ id: string; title: string; subtitle?: string }>;
  loading?: boolean;
  emptyText?: string;
  elevated?: boolean;
  showActions?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.data-list`. */
  inspectId?: string;
}>();
defineEmits<{ select: [id: string] }>();

const rootRef = usePbInspectRef();
const { items, loading, emptyText, elevated, showActions, inspectId } =
  toRefs(props);
const inspectBaseId = computed(() => inspectId.value ?? "ds.data-list");

usePbInspect({
  element: rootRef,
  pbId: "ds.data-list",
  instanceId: inspectId,
  componentId: "data-list",
  getProps: () => ({
    itemCount: items.value.length,
    loading: loading.value ?? false,
    emptyText: emptyText.value ?? "暂无数据",
    elevated: elevated.value ?? false,
    showActions: showActions.value ?? true,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: "radius.sm",
    elevation: "elevation.card",
    title: "typography.subtitle",
    subtitle: "typography.caption",
    muted: "color.on-surface-muted",
    empty: "typography.content",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "color.on-surface-muted",
    "radius.sm",
    "elevation.card",
    "typography.subtitle",
    "typography.caption",
    "typography.content",
    "spacing.md",
  ],
});
</script>

<template>
  <v-list
    ref="rootRef"
    data-pb-id="ds.data-list"
    data-pb-role="list"
    class="pb-data-list list"
    bg-color="surface"
    color="on-surface"
    :lines="false"
    :elevation="0"
    :style="[radiusStyle('sm'), elevationStyle(elevated ? 'card' : 'none')]"
  >
    <div v-if="loading" class="pb-data-list-loading">加载中…</div>
    <template v-else-if="items.length > 0">
      <div
        v-for="item in items"
        :key="item.id"
        class="pb-data-list-row-wrap"
        :data-pb-id="`${inspectBaseId}.row.${item.id}`"
        @click="$emit('select', item.id)"
      >
        <v-list-item
          class="pb-data-list-row"
          :title="item.title"
          :subtitle="item.subtitle ?? ''"
        >
          <template #append>
            <slot name="append" :item="item">
              <div class="pb-data-list-actions">
                <Chip
                  label="进行中"
                  tone="primary"
                  :inspect-id="`${inspectBaseId}.row.${item.id}.status`"
                />
                <v-btn
                  v-if="showActions ?? true"
                  icon
                  variant="tonal"
                  size="small"
                  :aria-label="`查看${item.title}`"
                  :data-pb-id="`${inspectBaseId}.row.${item.id}.action`"
                  @click.stop="$emit('select', item.id)"
                >
                  <ChevronRight :size="18" />
                </v-btn>
              </div>
            </slot>
          </template>
        </v-list-item>
      </div>
    </template>
    <p v-else class="pb-data-list-empty">{{ emptyText ?? "暂无数据" }}</p>
  </v-list>
</template>

<style scoped>
.pb-data-list {
  border: 1px solid var(--pb-color-border, #dde1e6);
  border-radius: var(--pb-radius-sm, 8px) !important;
  overflow: hidden;
  padding: 0;
  box-shadow: var(--pb-component-shadow, none) !important;
}
.pb-data-list-loading,
.pb-data-list-empty {
  margin: 0;
  padding: var(--pb-spacing-lg, 24px);
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
.pb-data-list:has(.pb-data-list-loading),
.pb-data-list:has(.pb-data-list-empty) {
  display: grid;
  min-height: 240px;
  height: 100%;
  place-content: center;
}
.pb-data-list-row-wrap {
  cursor: pointer;
}
.pb-data-list-actions {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.pb-data-list-row {
  min-height: 64px;
  border-bottom: 1px solid var(--pb-color-divider, #e5e7ea);
}
.pb-data-list-row-wrap:last-child .pb-data-list-row {
  border-bottom: 0;
}
.pb-data-list-row :deep(.v-list-item-title) {
  font: var(
    --pb-typography-subtitle,
    600 16px/1.4 Inter,
    system-ui,
    sans-serif
  );
}
.pb-data-list-row-wrap:hover {
  background: var(--pb-color-surface-variant, #f0f2f4);
}
.pb-data-list-row :deep(.v-list-item-subtitle) {
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
  opacity: var(--v-medium-emphasis-opacity, 0.6);
}
</style>
