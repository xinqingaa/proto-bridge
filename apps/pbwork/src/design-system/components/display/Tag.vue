<script setup lang="ts">
import { computed, ref } from "vue";
import { tagColors, type TagTone } from "../_shared/tagColors";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { pbStyle } from "@/authoring/pb-style";

const props = withDefaults(
  defineProps<{
    label?: string;
    tone?: TagTone;
    inspectId?: string;
    pbKey?: string;
  }>(),
  { label: "进行中", tone: "neutral" },
);

const rootRef = ref<HTMLElement | null>(null);

const colors = computed(() => tagColors(props.tone));
const background = computed(() => colors.value.background);
const foreground = computed(() => colors.value.color);

usePbInspect({
  element: rootRef,
  pbId: "ds.tag",
  componentId: "tag",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    background: background.value,
    color: foreground.value,
    radius: "radius.mark",
    typography: "typography.caption-strong",
    paddingX: "spacing.xs",
    paddingY: "spacing.xxs",
  }),
});
</script>
<template>
  <span
    ref="rootRef"
    class="tag"
    data-pb-role="badge"
    :style="
      pbStyle({
        background,
        color: foreground,
        radius: 'radius.mark',
        typography: 'typography.caption-strong',
        padding: ['spacing.xxs', 'spacing.xs'],
      })
    "
    >{{ label }}</span
  >
</template>
<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  max-width: var(--pb-layout-fill);
  overflow-wrap: anywhere;
}
</style>
