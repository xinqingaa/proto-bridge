<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";
import BrandMark from "./BrandMark.vue";
import Button from "../action/Button.vue";
import { useToken } from "@/design-system/theme/runtime-theme";
import { ResolvedThemeAsset } from "@proto-bridge/core/v2";
import { themeAssetUrl } from "@/design-system/theme/sources";
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    actionLabel?: string;
    busy?: boolean;
    mode?: "welcome" | "launch";
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    title: "开始新的一天",
    description: "留一点时间给重要的事",
    actionLabel: "开始",
    busy: false,
    mode: "welcome",
  },
);
const emit = defineEmits<{ start: [] }>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.launch-screen",
  () => props.pbKey,
);

const illustration = useToken("asset.launch-image");
const image = computed(() => {
  const parsed = ResolvedThemeAsset.safeParse(illustration.value);
  return parsed.success
    ? {
        url: themeAssetUrl(parsed.data.packId, parsed.data.file),
        alt: parsed.data.alt,
      }
    : null;
});

usePbInspect({
  element: rootRef,
  pbId: "ds.launch-screen",
  componentId: "launch-screen",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    surface: "color.surface",
    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.lg",
    typography: "typography.content",
    padding: "spacing.lg",
    title: "typography.title",
    description: "typography.content",
    illustration: "asset.launch-image",
    contentExtent: "size.avatar-large",
  }),
});
</script>
<template>
  <section
    ref="rootRef"
    class="launch"
    :class="{ 'is-launch-only': props.mode === 'launch' }"
    data-pb-role="page"
    :aria-busy="busy"
    :style="
      pbStyle({
        padding: 'spacing.lg',
        gap: 'spacing.lg',
        background: 'color.surface',
        color: 'color.on-surface',
        typography: 'typography.content',
      })
    "
  >
    <slot name="brand"
      ><BrandMark
        layout="stacked"
        :inspect-id="`${inspectId ?? 'ds.launch-screen'}.brand`" /></slot
    ><slot name="illustration"
      ><img v-if="image" :src="image.url" :alt="image.alt"
    /></slot>
    <h1
      v-if="props.mode !== 'launch'"
      v-pb="
        part('title', 'text', {
          typography: 'typography.title',
          color: 'color.on-surface',
          margin: 'layout.zero',
        })
      "
    >
      {{ title }}
    </h1>
    <p
      v-if="description && props.mode !== 'launch'"
      v-pb="
        part('description', 'text', {
          typography: 'typography.content',
          color: 'color.on-surface-muted',
          margin: 'layout.zero',
        })
      "
    >
      {{ description }}
    </p>
    <slot /><slot name="actions"
      ><Button
        v-if="props.mode !== 'launch'"
        :label="props.actionLabel"
        :loading="props.busy"
        :inspect-id="`${inspectId ?? 'ds.launch-screen'}.start`"
        @click="emit('start')"
    /></slot>
  </section>
</template>
<style scoped>
.launch {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: var(--pb-layout-fill);
  flex: var(--pb-layout-flex-fill);
  width: var(--pb-layout-fill);
  gap: var(--pb-spacing-lg);
  text-align: center;
}
img {
  max-width: var(--pb-layout-fill);
  max-height: var(--pb-size-avatar-large);
  object-fit: contain;
}
</style>
