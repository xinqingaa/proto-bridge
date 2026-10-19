<script setup lang="ts">
import GlassMaterial from "../_shared/GlassMaterial.vue";
import Icon from "../action/Icon.vue";
import SurfaceMaterial from "@/design-system/components/_shared/SurfaceMaterial.vue";
import { useToken } from "@/design-system/theme/runtime-theme";

import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import IconButton from "@/design-system/components/action/IconButton.vue";

type ActionIcon = "more" | "plus" | "search" | "settings";

const ACTION_ARIA_LABELS: Record<ActionIcon, string> = {
  more: "更多操作",
  plus: "新建",
  search: "搜索",
  settings: "设置",
};

const themeTreatment = useToken("app-bar.surface-treatment");
const props = defineProps<{
  title: string;
  background?: "theme" | "solid" | "glass" | "transparent";
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

const surfaceTreatment = computed(() =>
  props.background === "theme" || !props.background
    ? themeTreatment.value
    : props.background,
);
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
    background: props.background ?? "theme",
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
    lineHeight: "size.navigation-bar",
    touch: "size.touch",
    focus: "border.focus",
    focusRadius: "radius.control",
    lineGap: "spacing.sm",
    glassTint: "color.glass-tint",
    glassClear: "color.glass-clear",
    glassEdge: "border.glass",
    glassLight: "elevation.glass",
    glassFallback: "color.surface",
    glassFallbackBorder: "border.default",

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
  <header
    ref="rootRef"
    class="pb-app-bar app-bar"
    data-pb-id="ds.app-bar"
    data-pb-role="app-bar"
    :class="{
      'is-dense': dense,
      'is-transparent': surfaceTreatment === 'transparent',
      'is-material': surfaceTreatment === 'glass',
      'is-elevated': elevated,
    }"
  >
    <GlassMaterial
      v-if="surfaceTreatment === 'glass'"
      class="app-bar-material"
    />
    <SurfaceMaterial
      v-else-if="surfaceTreatment !== 'transparent'"
      treatment-key="app-bar.surface-treatment"
      :treatment="
        surfaceTreatment === 'glass'
          ? 'glass'
          : surfaceTreatment === 'outlined'
            ? 'outlined'
            : 'solid'
      "
    />
    <div class="app-bar-foreground">
      <div class="app-bar-line">
        <div class="app-bar-side">
          <button
            v-if="showBack"
            class="pb-app-bar-back"
            type="button"
            :aria-label="backLabel ?? '返回'"
            @click="$emit('back')"
          >
            <Icon name="chevron-left" />
          </button>
        </div>
        <h2 v-if="title" class="pb-app-bar-title pb-app-bar-heading">
          {{ title }}
        </h2>
        <div class="app-bar-side is-trailing">
          <slot name="append"
            ><IconButton
              v-if="showAction"
              :ariaLabel="resolvedActionLabel"
              :icon="resolvedActionIcon"
              variant="text"
              size="sm"
              @click="$emit('action')"
          /></slot>
        </div>
      </div>
    </div>
  </header>
</template>
<style scoped>
.pb-app-bar {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  align-self: stretch;
  flex: none;
  width: var(--pb-layout-fill);
  min-width: var(--pb-layout-zero);
  color: var(--pb-color-on-surface);
}
.app-bar-material {
  z-index: var(--pb-layer-base);
}
.app-bar-foreground {
  /* Safari needs a separate composited foreground above the backdrop filter. */
  transform: translateZ(var(--pb-layout-zero));
  position: relative;
  z-index: var(--pb-layer-content);
}
.app-bar-line {
  position: relative;
  z-index: var(--pb-layer-content);
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-height: var(--pb-size-navigation-bar);
  padding-inline: var(--pb-spacing-md);
}
.app-bar-side {
  display: flex;
  align-items: center;
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-size-touch);
}
.is-trailing {
  justify-content: flex-end;
}
.pb-app-bar-title {
  flex: initial;
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-subtitle);
  text-align: center;
  min-width: var(--pb-layout-zero);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pb-app-bar-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--pb-size-touch);
  min-height: var(--pb-size-touch);
  color: inherit;
  border: none;
  background: transparent;
  cursor: pointer;
}
.pb-app-bar-back:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
  border-radius: var(--pb-radius-control);
}
.is-dense .app-bar-line {
  min-height: var(--pb-size-touch);
}
.is-elevated {
  box-shadow: var(--pb-elevation-surface);
}
</style>
