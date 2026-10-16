<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  resolveScreenTransitionName,
  type ScreenTransitionMode,
  type ScreenTransitionNavigation,
} from "./screenTransition";

const props = withDefaults(
  defineProps<{
    screenKey: string;
    mode?: ScreenTransitionMode;
    navigation?: ScreenTransitionNavigation;
    inspectId?: string;
  }>(),
  {
    mode: "ios",
    navigation: "replace",
  },
);

const rootRef = usePbInspectRef();
const { screenKey, mode, navigation, inspectId } = toRefs(props);
const reducedMotion = ref(false);
let media: MediaQueryList | undefined;

function syncReducedMotion() {
  reducedMotion.value = Boolean(media?.matches);
}

onMounted(() => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncReducedMotion();
  media.addEventListener("change", syncReducedMotion);
});

onBeforeUnmount(() => {
  media?.removeEventListener("change", syncReducedMotion);
});

const transitionName = computed(() =>
  resolveScreenTransitionName({
    mode: mode.value,
    navigation: navigation.value,
    reducedMotion: reducedMotion.value,
  }),
);

usePbInspect({
  element: rootRef,
  pbId: "ds.screen-transition",
  instanceId: inspectId,
  componentId: "screen-transition",
  semantic: false,
  getProps: () => ({
    screenKey: screenKey.value,
    mode: mode.value,
    navigation: navigation.value,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    surface: "color.background",
    duration: "motion.duration-long",
    easing: "motion.easing-standard",
    incomingScale: "motion.press-scale",
  }),
  getTokens: () => [
    "color.background",
    "motion.duration-long",
    "motion.easing-standard",
    "motion.press-scale",
  ],
});
</script>

<template>
  <div ref="rootRef" class="pb-screen-transition">
    <Transition :name="transitionName" :css="Boolean(transitionName)">
      <div :key="screenKey" class="pb-screen-transition-frame">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pb-screen-transition {
  position: relative;
  overflow: hidden;
  flex-grow: var(--pb-layout-flex-grow);
  width: var(--pb-layout-fill);
  height: var(--pb-layout-fill);
  min-width: var(--pb-layout-zero);
  min-height: var(--pb-layout-zero);
  background: var(--pb-color-background);
}

.pb-screen-transition-frame {
  width: var(--pb-layout-fill);
  height: var(--pb-layout-fill);
  min-width: var(--pb-layout-zero);
  min-height: var(--pb-layout-zero);
}

.pb-route-ios-push-enter-active,
.pb-route-ios-push-leave-active,
.pb-route-ios-back-enter-active,
.pb-route-ios-back-leave-active,
.pb-route-android-push-enter-active,
.pb-route-android-push-leave-active,
.pb-route-android-back-enter-active,
.pb-route-android-back-leave-active {
  position: absolute;
  top: var(--pb-layout-zero);
  right: var(--pb-layout-zero);
  bottom: var(--pb-layout-zero);
  left: var(--pb-layout-zero);
  transition-duration: var(--pb-motion-duration-long);
  transition-timing-function: var(--pb-motion-easing-standard);
}

.pb-route-ios-push-enter-active,
.pb-route-ios-push-leave-active,
.pb-route-ios-back-enter-active,
.pb-route-ios-back-leave-active {
  transition-property: transform;
}

.pb-route-android-push-enter-active,
.pb-route-android-push-leave-active,
.pb-route-android-back-enter-active,
.pb-route-android-back-leave-active {
  transition-property: opacity, transform;
}

.pb-route-ios-push-enter-active,
.pb-route-ios-back-leave-active,
.pb-route-android-push-enter-active,
.pb-route-android-back-leave-active {
  z-index: var(--pb-layer-content);
}

.pb-route-ios-push-leave-active,
.pb-route-ios-back-enter-active,
.pb-route-android-push-leave-active,
.pb-route-android-back-enter-active {
  z-index: var(--pb-layer-base);
}

.pb-route-ios-push-enter-from,
.pb-route-ios-back-leave-to {
  transform: translateX(var(--pb-layout-fill));
}

.pb-route-ios-push-leave-to,
.pb-route-ios-back-enter-from {
  transform: translateX(var(--pb-layout-translate-full-negative));
}

.pb-route-android-push-enter-from,
.pb-route-android-back-leave-to {
  opacity: var(--pb-opacity-hidden);
  transform: scale(var(--pb-motion-press-scale));
}

.pb-route-android-push-leave-to,
.pb-route-android-back-enter-from {
  opacity: var(--pb-opacity-hidden);
}

@media (prefers-reduced-motion: reduce) {
  .pb-route-ios-push-enter-active,
  .pb-route-ios-push-leave-active,
  .pb-route-ios-back-enter-active,
  .pb-route-ios-back-leave-active,
  .pb-route-android-push-enter-active,
  .pb-route-android-push-leave-active,
  .pb-route-android-back-enter-active,
  .pb-route-android-back-leave-active {
    transition-duration: var(--pb-motion-duration-instant);
  }
}
</style>
