<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "secondary";
  /** Page-unique inspect / comment anchor; falls back to `ds.avatar`. */
  inspectId?: string;
}>();

const rootRef = usePbInspectRef();
const { name, size, tone, inspectId } = toRefs(props);

const initials = computed(() => name.value.trim().slice(0, 2).toUpperCase());

const sizePx = computed(() => {
  return `var(--pb-sizing-avatar-${size.value ?? "md"})`;
});

usePbInspect({
  element: rootRef,
  pbId: "ds.avatar",
  instanceId: inspectId,
  componentId: "avatar",
  getProps: () => ({
    name: name.value,
    size: size.value ?? "md",
    tone: tone.value ?? "primary",
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    `color.${tone.value ?? "primary"}`,
    "color.on-primary",
    `sizing.avatar-${size.value ?? "md"}`,
    "radius.full",
    "typography.label",
  ],
  getTokenBindings: () => ({
    background: `color.${tone.value ?? "primary"}`,
    text: `color.on-${tone.value ?? "primary"}`,
    size: `sizing.avatar-${size.value ?? "md"}`,
    radius: "radius.full",
    initials: "typography.label",
  }),
});
</script>

<template>
  <v-avatar
    ref="rootRef"
    class="pb-avatar"
    data-pb-id="ds.avatar"
    :color="tone ?? 'primary'"
    :size="sizePx"
  >
    <span class="pb-avatar-text">{{ initials }}</span>
  </v-avatar>
</template>

<style scoped>
.pb-avatar {
  border-radius: var(--pb-radius-full, 999px);
}
.pb-avatar-text {
  color: currentColor;
  font: var(--pb-typography-label, 600 12px/1.2 Inter, system-ui, sans-serif);
}
</style>
