<script setup lang="ts">
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
    transitionDuration: 240,
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
  transitionDuration,
  inspectId,
} = toRefs(props);
const active = computed({
  get: () => modelValue.value,
  set: (value: string) => emit("update:modelValue", value),
});
const values = computed(() => items.value.map((item) => item.value));
const swipeEnabled = computed(() => swipe.value || mouseSwipe.value);
const gesture = usePointerSwipe(
  values,
  active,
  (value) => emit("update:modelValue", value),
  swipeEnabled,
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
    duration: "motion.duration-normal",
    easing: "motion.easing-standard",
  }),
  getTokens: () => [
    "color.background",
    "motion.duration-normal",
    "motion.easing-standard",
  ],
});
</script>

<template>
  <v-window
    ref="rootRef"
    v-model="active"
    class="pb-tab-viewport"
    :class="{ 'is-dragging': gesture.dragging.value }"
    :style="gesture.dragStyle.value"
    :transition-duration="transitionDuration"
    :touch="false"
    data-pb-id="ds.tab-viewport"
    data-pb-role="tab-viewport"
    @pointerdown="gesture.onPointerDown"
    @pointermove="gesture.onPointerMove"
    @pointerup="gesture.onPointerUp"
    @pointercancel="gesture.onPointerCancel"
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
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--pb-color-background);
  cursor: grab;
  touch-action: pan-y;
}
.pb-tab-viewport.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.pb-tab-viewport.is-dragging :deep(.v-window__container) {
  transform: translateX(var(--pb-swipe-offset, 0));
  transition: none !important;
}
.pb-tab-viewport :deep(.v-window__container),
.pb-tab-viewport :deep(.v-window-item),
.pb-tab-viewport-panel {
  min-height: 0;
  height: 100%;
}
</style>
