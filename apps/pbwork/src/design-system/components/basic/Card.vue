<script setup lang="ts">
import { toRefs } from "vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

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
  <article
    ref="rootRef"
    class="pb-card section card"
    data-pb-id="ds.card"
    data-pb-role="section"
    :class="[`radius-${radius ?? 'lg'}`, { 'is-elevated': elevated }]"
  >
    <h3 class="pb-card-title">{{ title }}</h3>
    <p v-if="subtitle" class="pb-card-subtitle">{{ subtitle }}</p>
    <div class="pb-card-body"><slot /></div>
  </article>
</template>

<style scoped>
.pb-card {
  padding: var(--pb-spacing-md, 16px);
  border: 1px solid var(--pb-color-border, #d7dee8);
  background: var(--pb-color-surface, #fff);
  color: var(--pb-color-on-surface, #1f2937);
}
.pb-card.radius-sm {
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-card.radius-md {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-card.radius-lg {
  border-radius: var(--pb-radius-lg, 16px);
}
.pb-card.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
}
.pb-card-title {
  margin: 0;
  font: var(--pb-typography-subtitle, 600 16px/1.4 Inter, system-ui, sans-serif);
}
.pb-card-subtitle {
  margin: var(--pb-spacing-xs, 4px) 0 0;
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.pb-card-body {
  margin-top: var(--pb-spacing-md, 16px);
}
</style>
