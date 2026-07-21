<script setup lang="ts">
import { toRefs } from "vue";
import { ChevronRight } from "lucide-vue-next";
import Chip from "@/design-system/components/basic/Chip.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  items: Array<{ id: string; title: string; subtitle?: string }>;
  loading?: boolean;
  emptyText?: string;
  radius?: "sm" | "md" | "lg";
  elevated?: boolean;
  showActions?: boolean;
}>();
defineEmits<{ select: [id: string] }>();

const rootRef = usePbInspectRef();
const { items, loading, emptyText, radius, elevated, showActions } =
  toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.data-list",
  componentId: "data-list",
  getProps: () => ({
    itemCount: items.value.length,
    loading: loading.value ?? false,
    emptyText: emptyText.value ?? "暂无数据",
    radius: radius.value ?? "lg",
    elevated: elevated.value ?? false,
    showActions: showActions.value ?? true,
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: `radius.${radius.value ?? "lg"}`,
    elevation: "elevation.card",
    title: "typography.subtitle",
    subtitle: "typography.caption",
    muted: "color.on-surface-muted",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "color.on-surface-muted",
    `radius.${radius.value ?? "lg"}`,
    "elevation.card",
    "typography.subtitle",
    "typography.caption",
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
    :style="[
      radiusStyle(radius ?? 'lg'),
      elevationStyle(elevated ? 'card' : 'none'),
    ]"
  >
    <div v-if="loading" class="pb-data-list-loading">加载中…</div>
    <template v-else-if="items.length > 0">
      <div
        v-for="item in items"
        :key="item.id"
        class="pb-data-list-row-wrap"
        :data-pb-id="`ds.data-list.row.${item.id}`"
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
                <Chip label="进行中" tone="primary" />
                <v-btn
                  v-if="showActions ?? true"
                  icon
                  variant="tonal"
                  size="small"
                  :aria-label="`查看${item.title}`"
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
  border: 1px solid var(--pb-color-border, #d7dee8);
  overflow: hidden;
  padding: 0;
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
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
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
.pb-data-list-row :deep(.v-list-item-subtitle) {
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
  opacity: var(--v-medium-emphasis-opacity, 0.6);
}
</style>
