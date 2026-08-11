<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

const props = withDefaults(
  defineProps<{
    divided?: boolean;
    inset?: boolean;
    surface?: "none" | "default" | "raised";
    rounded?: "none" | "sm" | "md" | "lg";
    elevated?: boolean;
    /** Page-unique inspect / comment anchor; falls back to `ds.data-list`. */
    inspectId?: string;
  }>(),
  {
    divided: true,
    inset: false,
    surface: "default",
    rounded: "md",
    elevated: false,
  },
);

const rootRef = usePbInspectRef();
const { divided, inset, surface, rounded, elevated, inspectId } = toRefs(props);
const resolvedRadius = computed(() =>
  rounded.value === "none" ? "none" : rounded.value,
);

usePbInspect({
  element: rootRef,
  pbId: "ds.data-list",
  instanceId: inspectId,
  componentId: "data-list",
  getProps: () => ({
    divided: divided.value,
    inset: inset.value,
    surface: surface.value,
    rounded: rounded.value,
    elevated: elevated.value,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    surface:
      surface.value === "raised" ? "color.surface-raised" : "color.surface",
    divider: "color.border",
    radius:
      rounded.value === "none" ? "radius.none" : `radius.${rounded.value}`,
    elevation: "elevation.card",
    content: "typography.content",
    inset: "spacing.md",
    dividerBorder: "border.default",
    restingElevation: "elevation.none",
  }),
  getTokens: () => [
    "color.surface",
    "color.surface-raised",
    "color.border",
    "color.on-surface",
    "radius.sm",
    "radius.md",
    "radius.lg",
    "elevation.card",
    "typography.content",
    "spacing.md",
    "border.default",
    "elevation.none",
  ],
});
</script>

<template>
  <div
    ref="rootRef"
    data-pb-id="ds.data-list"
    data-pb-role="list"
    class="pb-data-list"
    :class="[
      `surface-${surface}`,
      {
        'is-divided': divided,
        'is-inset': inset,
        'is-elevated': elevated,
        'is-square': rounded === 'none',
      },
    ]"
    :style="[
      rounded === 'none' ? undefined : radiusStyle(resolvedRadius),
      elevationStyle(elevated ? 'card' : 'none'),
    ]"
  >
    <slot />
  </div>
</template>

<style scoped>
.pb-data-list {
  box-sizing: border-box;
  min-width: var(--pb-spacing-none);
  overflow: hidden;
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
}
.pb-data-list.surface-none {
  background: transparent;
}
.pb-data-list.surface-default {
  background: var(--pb-color-surface);
}
.pb-data-list.surface-raised {
  background: var(--pb-color-surface-raised, var(--pb-color-surface));
}
.pb-data-list.is-inset {
  padding-inline: var(--pb-spacing-md);
}
.pb-data-list.is-square {
  border-radius: var(--pb-radius-none);
}
.pb-data-list.is-divided :deep(> * + *) {
  border-top: var(--pb-border-default);
}
</style>
