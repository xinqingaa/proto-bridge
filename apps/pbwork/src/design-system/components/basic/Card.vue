<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const NO_ELEVATION = tokenDefaultNumber("layer.base");

const props = defineProps<{
  elevated?: boolean;
  semanticRole?: "section" | "card" | "summary";
  /** Page-unique inspect / comment anchor; falls back to `ds.card`. */
  inspectId?: string;
}>();

const rootRef = usePbInspectRef();
const { elevated, inspectId, semanticRole } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.card",
  instanceId: inspectId,
  componentId: "card",
  getProps: () => ({
    elevated: elevated.value ?? false,
    inspectId: inspectId.value,
    semanticRole: semanticRole.value ?? "section",
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: "radius.lg",
    elevation: "elevation.card",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "radius.lg",
    "elevation.card",
  ],
});
</script>

<template>
  <v-card
    ref="rootRef"
    class="pb-card"
    data-pb-id="ds.card"
    :data-pb-role="semanticRole ?? 'section'"
    variant="outlined"
    :elevation="NO_ELEVATION"
    :style="[radiusStyle('lg'), elevationStyle(elevated ? 'card' : 'none')]"
  >
    <slot />
  </v-card>
</template>

<style scoped>
.pb-card {
  border-color: var(--pb-color-border) !important;
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
}
</style>
