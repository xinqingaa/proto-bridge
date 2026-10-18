<script setup lang="ts">
import { ref } from "vue";
import GlassMaterial from "../_shared/GlassMaterial.vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
const props = withDefaults(
  defineProps<{ clear?: boolean; inspectId?: string; pbKey?: string }>(),
  { clear: false },
);
const rootRef = ref<HTMLElement | null>(null);
usePbInspect({
  element: rootRef,
  pbId: "ds.glass-surface",
  componentId: "glass-surface",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    tint: "color.glass-tint",
    clearTint: "color.glass-clear",
    edge: "border.glass",
    light: "elevation.glass",
    backdrop: "surface.glass-backdrop",
    fallback: "color.surface",
    fallbackBorder: "border.default",
  }),
});
</script>
<template>
  <section ref="rootRef" class="glass-surface" data-pb-role="section">
    <GlassMaterial :clear="props.clear ?? false" />
    <div class="glass-content"><slot /></div>
  </section>
</template>
<style scoped>
.glass-surface {
  position: relative;
  border-radius: inherit;
}
.glass-content {
  position: relative;
  z-index: var(--pb-layer-content);
}
</style>
