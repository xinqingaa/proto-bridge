<script setup lang="ts">
import SurfaceMaterial from "@/design-system/components/_shared/SurfaceMaterial.vue";
import { useToken } from "@/design-system/theme/runtime-theme";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import { themeConstantNumber } from "@/design-system/theme/constants";

import { computed, toRefs, useSlots } from "vue";
import { ArrowLeft } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import IconButton from "@/design-system/components/action/IconButton.vue";
import { elevationStyle } from "@/design-system/components/_shared/appearance";
const NO_ELEVATION = themeConstantNumber("layer.base");
const BACK_ICON_SIZE = useTokenNumber("size.icon");

type ActionIcon = "more" | "plus" | "search" | "settings";

const ACTION_ARIA_LABELS: Record<ActionIcon, string> = {
  more: "更多操作",
  plus: "新建",
  search: "搜索",
  settings: "设置",
};

const surfaceTreatment = useToken("app-bar.surface-treatment");
const props = defineProps<{
  title: string;
  dense?: boolean;
  elevated?: boolean;
  showBack?: boolean;
  backLabel?: string;
  showAction?: boolean;
  actionIcon?: ActionIcon;
  actionLabel?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.app-bar`. */
  inspectId?: string;
}>();

defineEmits<{ back: []; action: [] }>();

const slots = useSlots();
const rootRef = usePbInspectRef();
const {
  title,
  dense,
  elevated,
  showBack,
  backLabel,
  showAction,
  actionIcon,
  actionLabel,
  inspectId,
} = toRefs(props);

const resolvedActionIcon = computed<ActionIcon>(
  () => actionIcon.value ?? "more",
);
const resolvedActionLabel = computed(
  () =>
    actionLabel.value ||
    ACTION_ARIA_LABELS[resolvedActionIcon.value] ||
    "更多操作",
);

usePbInspect({
  element: rootRef,
  pbId: "ds.app-bar",
  instanceId: inspectId,
  componentId: "app-bar",
  getProps: () => ({
    title: title.value,
    dense: dense.value ?? false,
    elevated: elevated.value ?? false,
    showBack: showBack.value ?? false,
    backLabel: backLabel.value ?? "返回",
    showAction: showAction.value ?? false,
    actionIcon: resolvedActionIcon.value,
    actionLabel: resolvedActionLabel.value,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    materialOpacity: "opacity.translucent",
    materialBackdrop: "surface.glass-backdrop",
    materialBorder: "border.default",
    surface: "color.surface",
    border: "color.border",
    text: "color.on-surface",
    elevation: "elevation.surface",
    title: "typography.subtitle",
    padding: "spacing.md",
    titleInset: "spacing.xs",
    restingElevation: "none",
    iconSize: "size.icon",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "elevation.surface",
    "typography.subtitle",
    "spacing.sm",
    "spacing.md",
    "size.icon",
  ],
});
</script>

<template>
  <v-toolbar
    ref="rootRef"
    class="pb-app-bar app-bar"
    data-pb-id="ds.app-bar"
    data-pb-role="app-bar"
    flat
    color="surface"
    :density="dense ? 'compact' : 'default'"
    :elevation="NO_ELEVATION"
    :style="elevationStyle(elevated ? 'card' : 'none')"
    :class="{
      'is-elevated': elevated,
      'is-material': surfaceTreatment !== 'solid',
    }"
  >
    <SurfaceMaterial
      v-if="surfaceTreatment !== 'solid'"
      treatment-key="app-bar.surface-treatment"
    />
    <template v-if="showBack" #prepend>
      <v-btn
        class="pb-app-bar-back"
        icon
        variant="text"
        :aria-label="backLabel ?? '返回'"
        @click="$emit('back')"
      >
        <ArrowLeft :size="BACK_ICON_SIZE" aria-hidden="true" />
      </v-btn>
    </template>
    <v-toolbar-title v-if="title" class="pb-app-bar-title">
      <h2 class="pb-app-bar-heading">{{ title }}</h2>
    </v-toolbar-title>
    <template v-if="slots.append || showAction" #append>
      <div class="pb-app-bar-actions">
        <slot name="append">
          <IconButton
            v-if="showAction"
            :ariaLabel="resolvedActionLabel"
            :icon="resolvedActionIcon"
            size="sm"
            @click="$emit('action')"
          />
        </slot>
      </div>
    </template>
  </v-toolbar>
</template>

<style scoped>
.pb-app-bar {
  position: relative !important;
  flex: none;
  padding-top: var(--pb-safe-top, var(--pb-layout-zero));
  border-bottom: var(--pb-border-hairline);
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
}
.pb-app-bar.is-material {
  background: transparent !important;
}
.pb-app-bar.is-material :deep(.v-toolbar__content) {
  position: relative;
  z-index: var(--pb-layer-content);
}
.pb-app-bar.is-elevated {
  box-shadow: var(
    --pb-component-shadow,
    var(--pb-elevation-surface)
  ) !important;
}
.pb-app-bar :deep(.v-toolbar__content) {
  padding-inline: var(--pb-spacing-md);
}
.pb-app-bar-title,
.pb-app-bar-heading {
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-subtitle);
}
.pb-app-bar-actions {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-xs);
}
</style>

<style scoped>
/* Preserve the established title inset independently of lazy vendor CSS order. */
.pb-app-bar .pb-app-bar-title {
  margin-inline-start: calc(var(--pb-spacing-md) + var(--pb-spacing-xs));
}
</style>
