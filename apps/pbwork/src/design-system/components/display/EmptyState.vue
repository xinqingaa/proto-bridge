<script setup lang="ts">
import { toRefs } from "vue";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const ICON_SURFACE_SIZE = tokenDefaultNumber("sizing.avatar-lg");

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
    "radius.full",
    "sizing.icon-lg",
    "sizing.avatar-lg",
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
    radius: "radius.full",
    spacing: "spacing.lg",
    iconSize: "sizing.icon-lg",
    iconSurfaceSize: "sizing.avatar-lg",
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
      bg-color="color.primary-soft"
      border-color="color.primary-soft"
      text-color="color.primary"
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
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary-soft) !important;
  color: var(--pb-color-primary) !important;
}
h3 {
  margin: var(--pb-spacing-xs) var(--pb-spacing-none) var(--pb-spacing-none);
  font: var(--pb-typography-subtitle);
}
p {
  margin: var(--pb-spacing-none) var(--pb-spacing-none) var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
</style>
