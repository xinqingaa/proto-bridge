<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { pbStyle } from "@/authoring/pb-style";
import { useToken } from "@/design-system/theme/runtime-theme";
import { ResolvedThemeAsset } from "@proto-bridge/core/v2";
import { themeAssetUrl } from "@/design-system/theme/sources";
const props = withDefaults(
  defineProps<{
    name?: string;
    layout?: "inline" | "stacked";
    inspectId?: string;
    pbKey?: string;
  }>(),
  { name: "品牌", layout: "inline" },
);

const rootRef = ref<HTMLElement | null>(null);

const mark = useToken("asset.brand-mark"),
  wordmark = useToken("asset.brand-wordmark");
function asset(value: unknown) {
  const parsed = ResolvedThemeAsset.safeParse(value);
  return parsed.success
    ? {
        url: themeAssetUrl(parsed.data.packId, parsed.data.file),
        alt: parsed.data.alt,
      }
    : null;
}
const markAsset = computed(() => asset(mark.value)),
  wordmarkAsset = computed(() => asset(wordmark.value));

usePbInspect({
  element: rootRef,
  pbId: "ds.brand-mark",
  componentId: "brand-mark",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    color: "color.on-surface",
    gap: "spacing.sm",
    typography: "typography.title-lg",
    mark: "asset.brand-mark",
    wordmark: "asset.brand-wordmark",
    size: "size.brand",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="brand"
    :class="{ 'is-stacked': props.layout === 'stacked' }"
    data-pb-role="image"
    role="img"
    :aria-label="name"
    :style="
      pbStyle({
        gap: 'spacing.sm',
        color: 'color.on-surface',
        typography: 'typography.title-lg',
      })
    "
  >
    <slot name="mark"
      ><img
        v-if="markAsset"
        :src="markAsset.url"
        :alt="markAsset.alt"
        class="mark" /></slot
    ><slot name="wordmark"
      ><img
        v-if="wordmarkAsset"
        :src="wordmarkAsset.url"
        :alt="wordmarkAsset.alt"
        class="wordmark"
      /><span v-else>{{ name }}</span></slot
    >
  </div>
</template>
<style scoped>
.brand {
  display: flex;
  align-items: center;
  min-width: var(--pb-layout-zero);
}
.mark {
  width: var(--pb-size-brand);
  height: var(--pb-size-brand);
  object-fit: contain;
}
.wordmark {
  max-width: var(--pb-layout-fill);
  height: var(--pb-size-brand);
  object-fit: contain;
}
</style>

<style scoped>
.brand.is-stacked {
  flex-direction: column;
  text-align: center;
}
.brand {
  font: var(--pb-typography-title-lg);
}
</style>
