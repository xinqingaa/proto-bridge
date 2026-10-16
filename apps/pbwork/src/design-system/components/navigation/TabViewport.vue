<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    items: Array<{ value: string }>;
    swipe?: boolean;
    mouseSwipe?: boolean;
    keepMounted?: boolean;
    transitionDuration?: number;
    inspectId?: string;
  }>(),
  {
    swipe: true,
    mouseSwipe: true,
    keepMounted: true,
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const rootRef = usePbInspectRef();
const {
  modelValue,
  items,
  swipe,
  mouseSwipe,
  keepMounted,
  transitionDuration: suppliedTransitionDuration,
  inspectId,
} = toRefs(props);
const defaultTransitionDuration = useTokenNumber("tab-viewport.duration");
const transitionDuration = computed(
  () => suppliedTransitionDuration.value ?? defaultTransitionDuration.value,
);
const active = computed({
  get: () => modelValue.value,
  set: (value: string) => emit("update:modelValue", value),
});
const values = computed(() => items.value.map((item) => item.value));
const gesture = usePointerSwipe(
  values,
  active,
  (value) => emit("update:modelValue", value),
  { swipe, mouseSwipe },
);

usePbInspect({
  element: rootRef,
  pbId: "ds.tab-viewport",
  instanceId: inspectId,
  componentId: "tab-viewport",
  getProps: () => ({
    modelValue: active.value,
    itemCount: items.value.length,
    swipe: swipe.value,
    mouseSwipe: mouseSwipe.value,
    keepMounted: keepMounted.value,
    transitionDuration: transitionDuration.value,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    background: "color.background",
    duration: "tab-viewport.duration",
    easing: "motion.easing-standard",
  }),
  getTokens: () => [
    "color.background",
    "tab-viewport.duration",
    "motion.easing-standard",
  ],
});
</script>

<template>
  <v-window
    ref="rootRef"
    v-model="active"
    class="pb-tab-viewport"
    :class="{
      'allows-mouse-swipe': mouseSwipe,
      'is-dragging': gesture.dragging.value,
    }"
    :transition-duration="transitionDuration"
    :touch="false"
    data-pb-id="ds.tab-viewport"
    data-pb-role="tab-viewport"
    @pointerdown="gesture.onPointerDown"
    @pointermove="gesture.onPointerMove"
    @pointerup="gesture.onPointerUp"
    @pointercancel="gesture.onPointerCancel"
    @touchstart="gesture.onTouchStart"
    @touchmove="gesture.onTouchMove"
    @touchend="gesture.onTouchEnd"
    @touchcancel="gesture.onTouchCancel"
    @click.capture="gesture.onClickCapture"
  >
    <v-window-item
      v-for="item in items"
      :key="item.value"
      :value="item.value"
      :eager="keepMounted"
    >
      <div class="pb-tab-viewport-panel" role="tabpanel">
        <slot name="item" :value="item.value" :active="active === item.value" />
      </div>
    </v-window-item>
  </v-window>
</template>

<style scoped>
.pb-tab-viewport {
  min-width: var(--pb-layout-zero);
  min-height: var(--pb-layout-zero);
  height: var(--pb-layout-fill);
  background: var(--pb-color-background);
  touch-action: pan-y;
}
.pb-tab-viewport.allows-mouse-swipe {
  cursor: grab;
}
.pb-tab-viewport.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.pb-tab-viewport :deep(.v-window__container),
.pb-tab-viewport :deep(.v-window-item),
.pb-tab-viewport-panel {
  min-height: var(--pb-layout-zero);
  height: var(--pb-layout-fill);
}
</style>
