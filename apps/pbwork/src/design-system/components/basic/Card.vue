<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  title: string;
  subtitle?: string;
  elevated?: boolean;
  semanticRole?: "section" | "card" | "summary";
  /** Page-unique inspect / comment anchor; falls back to `ds.card`. */
  inspectId?: string;
}>();

const rootRef = usePbInspectRef();
const { title, subtitle, elevated, inspectId, semanticRole } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.card",
  instanceId: inspectId,
  componentId: "card",
  getProps: () => ({
    title: title.value,
    subtitle: subtitle.value,
    elevated: elevated.value ?? false,
    inspectId: inspectId.value,
    semanticRole: semanticRole.value ?? "section",
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: "radius.lg",
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
    "radius.lg",
    "elevation.card",
    "typography.subtitle",
    "typography.caption",
    "spacing.md",
  ],
});
</script>

<template>
  <v-card
    ref="rootRef"
    class="pb-card section card"
    data-pb-id="ds.card"
    :data-pb-role="semanticRole ?? 'section'"
    variant="outlined"
    :elevation="0"
    :style="[radiusStyle('lg'), elevationStyle(elevated ? 'card' : 'none')]"
  >
    <v-card-title class="pb-card-title">{{ title }}</v-card-title>
    <v-card-subtitle v-if="subtitle" class="pb-card-subtitle">
      {{ subtitle }}
    </v-card-subtitle>
    <v-card-text class="pb-card-body">
      <slot />
    </v-card-text>
  </v-card>
</template>

<style scoped>
.pb-card {
  border-color: var(--pb-color-border) !important;
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
}
.pb-card-title {
  font: var(--pb-typography-subtitle);
  padding-bottom: 0;
}
.pb-card-subtitle {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  opacity: var(--pb-opacity-visible);
}
.pb-card-body {
  padding-top: var(--pb-spacing-md);
}
</style>
