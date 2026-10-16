<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { toRefs } from "vue";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const ICON_SURFACE_SIZE = useTokenNumber("size.avatar-large");

const props = defineProps<{
  title: string;
  description?: string;
  actionLabel?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.empty-state`. */
  inspectId?: string;
}>();
defineEmits<{ action: [] }>();

const rootRef = usePbInspectRef();
const { title, description, actionLabel, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.empty-state",
  instanceId: inspectId,
  componentId: "empty-state",
  getProps: () => ({
    title: title.value,
    description: description.value ?? "",
    actionLabel: actionLabel.value ?? "",
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.primary-soft",
    "color.primary",
    "color.on-surface",
    "color.on-surface-muted",
    "radius.pill",
    "size.icon-prominent",
    "size.avatar-large",
    "spacing.lg",
    "spacing.xs",
    "spacing.sm",
    "typography.subtitle",
    "typography.content",
  ],
  getTokenBindings: () => ({
    iconSurface: "color.primary-soft",
    icon: "color.primary",
    title: "color.on-surface",
    description: "color.on-surface-muted",
    radius: "radius.pill",
    spacing: "spacing.lg",
    iconSize: "size.icon-prominent",
    iconSurfaceSize: "size.avatar-large",
    typography: "typography.subtitle",
    body: "typography.content",
    titleOffset: "spacing.xs",
    descriptionOffset: "spacing.sm",
  }),
});
</script>

<template>
  <v-sheet
    ref="rootRef"
    class="pb-empty"
    data-pb-id="ds.empty-state"
    data-pb-role="empty-state"
    color="transparent"
  >
    <v-avatar
      color="primary"
      variant="tonal"
      :size="ICON_SURFACE_SIZE"
      class="pb-empty-icon"
    >
      <Icon name="inbox" size="lg" tone="primary" />
    </v-avatar>
    <h3>{{ title }}</h3>
    <p>{{ description ?? "这里还没有内容。" }}</p>
    <Button
      v-if="actionLabel"
      :label="actionLabel"
      kind="primary"
      @click="$emit('action')"
    />
  </v-sheet>
</template>

<style scoped>
.pb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-lg);
  color: var(--pb-color-on-surface);
  text-align: center;
}
.pb-empty-icon {
  border-radius: var(--pb-radius-pill);
  background: var(--pb-color-primary-soft) !important;
  color: var(--pb-color-primary) !important;
}
h3 {
  margin: var(--pb-spacing-xs) var(--pb-layout-zero) var(--pb-layout-zero);
  font: var(--pb-typography-subtitle);
}
p {
  margin: var(--pb-layout-zero) var(--pb-layout-zero) var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
</style>
