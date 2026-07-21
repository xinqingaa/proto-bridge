<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  title: string;
  subtitle?: string;
  elevated?: boolean;
  radius?: "sm" | "md" | "lg";
}>();

const rootRef = usePbInspectRef();
const { title, subtitle, elevated, radius } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.card",
  componentId: "card",
  getProps: () => ({
    title: title.value,
    subtitle: subtitle.value,
    elevated: elevated.value ?? false,
    radius: radius.value ?? "lg",
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
  <v-card
    ref="rootRef"
    class="pb-card section card"
    data-pb-id="ds.card"
    data-pb-role="section"
    variant="outlined"
    :elevation="0"
    :style="[
      radiusStyle(radius ?? 'lg'),
      elevationStyle(elevated ? 'card' : 'none'),
    ]"
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
  border-color: var(--pb-color-border, #d7dee8) !important;
  background: var(--pb-color-surface, #fff);
  color: var(--pb-color-on-surface, #1f2937);
}
.pb-card-title {
  font: var(
    --pb-typography-subtitle,
    600 16px/1.4 Inter,
    system-ui,
    sans-serif
  );
  padding-bottom: 0;
}
.pb-card-subtitle {
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
  opacity: 1;
}
.pb-card-body {
  padding-top: var(--pb-spacing-md, 16px);
}
</style>
