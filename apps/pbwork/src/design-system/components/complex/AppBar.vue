<script setup lang="ts">
import { computed, toRefs, useSlots } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import IconButton from "@/design-system/components/basic/IconButton.vue";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

type ActionIcon = "more" | "plus" | "search" | "settings";

const ACTION_ARIA_LABELS: Record<ActionIcon, string> = {
  more: "更多操作",
  plus: "新建",
  search: "搜索",
  settings: "设置",
};

const props = defineProps<{
  title: string;
  dense?: boolean;
  elevated?: boolean;
  showBack?: boolean;
  backLabel?: string;
  showAction?: boolean;
  actionIcon?: ActionIcon;
  actionLabel?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.app-bar`. */
  inspectId?: string;
}>();

defineEmits<{ back: []; action: [] }>();

const slots = useSlots();
const rootRef = usePbInspectRef();
const {
  title,
  dense,
  elevated,
  showBack,
  backLabel,
  showAction,
  actionIcon,
  actionLabel,
  inspectId,
} = toRefs(props);

const resolvedActionIcon = computed<ActionIcon>(
  () => actionIcon.value ?? "more",
);
const resolvedActionLabel = computed(
  () =>
    actionLabel.value ||
    ACTION_ARIA_LABELS[resolvedActionIcon.value] ||
    "更多操作",
);

usePbInspect({
  element: rootRef,
  pbId: "ds.app-bar",
  instanceId: inspectId,
  componentId: "app-bar",
  getProps: () => ({
    title: title.value,
    dense: dense.value ?? false,
    elevated: elevated.value ?? false,
    showBack: showBack.value ?? false,
    backLabel: backLabel.value ?? "返回",
    showAction: showAction.value ?? false,
    actionIcon: resolvedActionIcon.value,
    actionLabel: resolvedActionLabel.value,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    elevation: "elevation.card",
    title: "typography.subtitle",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "elevation.card",
    "typography.subtitle",
    "spacing.sm",
    "spacing.md",
  ],
});
</script>

<template>
  <v-toolbar
    ref="rootRef"
    class="pb-app-bar app-bar"
    data-pb-id="ds.app-bar"
    data-pb-role="app-bar"
    flat
    color="surface"
    :density="dense ? 'compact' : 'default'"
    :elevation="0"
    :style="elevationStyle(elevated ? 'card' : 'none')"
    :class="{ 'is-elevated': elevated }"
  >
    <template v-if="showBack" #prepend>
      <v-btn
        class="pb-app-bar-back"
        icon
        variant="text"
        :aria-label="backLabel ?? '返回'"
        @click="$emit('back')"
      >
        <v-icon icon="mdi-arrow-left" />
      </v-btn>
    </template>
    <v-toolbar-title class="pb-app-bar-title">
      <h2 class="pb-app-bar-heading">{{ title }}</h2>
    </v-toolbar-title>
    <template v-if="slots.append || showAction" #append>
      <div class="pb-app-bar-actions">
        <slot name="append">
          <IconButton
            v-if="showAction"
            :ariaLabel="resolvedActionLabel"
            :icon="resolvedActionIcon"
            size="sm"
            @click="$emit('action')"
          />
        </slot>
      </div>
    </template>
  </v-toolbar>
</template>

<style scoped>
.pb-app-bar {
  position: relative !important;
  flex: none;
  padding-top: var(--pb-safe-top, 0px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  box-shadow: var(--pb-component-shadow, none) !important;
}
.pb-app-bar.is-elevated {
  box-shadow: var(
    --pb-component-shadow,
    var(--pb-elevation-card, none)
  ) !important;
}
.pb-app-bar :deep(.v-toolbar__content) {
  padding-inline: var(--pb-spacing-md, 16px);
}
.pb-app-bar-title,
.pb-app-bar-heading {
  margin: 0;
  font: var(
    --pb-typography-subtitle,
    600 16px/1.4 Inter,
    system-ui,
    sans-serif
  );
}
.pb-app-bar-actions {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-xs, 4px);
}
</style>
