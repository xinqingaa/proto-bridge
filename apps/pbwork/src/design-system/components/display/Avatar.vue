<script setup lang="ts">
import { avatarSizeToken } from "@/design-system/components/_shared/appearance";
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
  return `var(--pb-${avatarSizeToken(size.value ?? "md").replaceAll(".", "-")})`;
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
    `color.on-${tone.value ?? "primary"}`,
    avatarSizeToken(size.value ?? "md"),
    "radius.pill",
    "typography.label",
  ],
  getTokenBindings: () => ({
    background: `color.${tone.value ?? "primary"}`,
    text: `color.on-${tone.value ?? "primary"}`,
    size: avatarSizeToken(size.value ?? "md"),
    radius: "radius.pill",
    initials: "typography.label",
  }),
});
</script>

<template>
  <v-avatar
    ref="rootRef"
    class="pb-avatar"
    data-pb-id="ds.avatar"
    data-pb-role="image"
    :color="tone ?? 'primary'"
    :size="sizePx"
  >
    <span class="pb-avatar-text">{{ initials }}</span>
  </v-avatar>
</template>

<style scoped>
.pb-avatar {
  border-radius: var(--pb-radius-pill);
}
.pb-avatar-text {
  color: currentColor;
  font: var(--pb-typography-label);
}
</style>
