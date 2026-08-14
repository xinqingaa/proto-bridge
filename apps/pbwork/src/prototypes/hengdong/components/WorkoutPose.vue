<script setup lang="ts">
export type WorkoutPoseName =
  | "mobilize"
  | "squat"
  | "push"
  | "core"
  | "neutral";

withDefaults(defineProps<{ pose?: WorkoutPoseName }>(), {
  pose: "neutral",
});
</script>

<template>
  <svg
    class="hd-workout-pose"
    viewBox="0 0 180 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <template v-if="pose === 'mobilize'">
      <circle cx="91" cy="38" r="13" />
      <path d="M91 53C88 69 86 84 88 102" />
      <path d="M88 65C70 68 58 78 47 91" />
      <path d="M88 67C107 69 121 80 134 94" />
      <path d="M88 101C74 111 66 127 59 145" />
      <path d="M88 101C101 113 111 128 121 145" />
      <path class="hd-workout-pose__motion" d="M53 72C43 78 36 89 35 101" />
      <path class="hd-workout-pose__motion" d="M127 73C137 79 144 90 145 102" />
    </template>

    <template v-else-if="pose === 'squat'">
      <circle cx="94" cy="34" r="13" />
      <path d="M93 49C87 65 81 78 76 94" />
      <path d="M78 63L52 82" />
      <path d="M78 65L112 78" />
      <path d="M76 94L49 112L35 143" />
      <path d="M76 94L108 111L139 137" />
      <path d="M38 149H59" />
      <path d="M130 143H151" />
      <path class="hd-workout-pose__motion" d="M43 104C66 89 99 88 123 103" />
    </template>

    <template v-else-if="pose === 'push'">
      <circle cx="48" cy="68" r="12" />
      <path d="M60 74L96 88L135 93" />
      <path d="M77 81L63 111" />
      <path d="M105 90L96 120" />
      <path d="M134 93L151 118" />
      <path d="M55 113H75" />
      <path d="M88 122H108" />
      <path class="hd-workout-pose__motion" d="M43 49C72 38 109 45 134 63" />
      <path class="hd-workout-pose__motion" d="M56 132C88 144 122 139 148 122" />
    </template>

    <template v-else-if="pose === 'core'">
      <circle cx="72" cy="67" r="13" />
      <path d="M83 75L105 95" />
      <path d="M105 95L137 74" />
      <path d="M105 95L132 123" />
      <path d="M96 88L70 112" />
      <path d="M70 112L42 91" />
      <path d="M70 112L46 139" />
      <path class="hd-workout-pose__motion" d="M48 68C77 49 114 50 140 68" />
      <path class="hd-workout-pose__motion" d="M39 133C67 151 110 151 141 132" />
    </template>

    <template v-else>
      <circle cx="90" cy="37" r="13" />
      <path d="M90 52V103" />
      <path d="M90 65L58 88" />
      <path d="M90 65L122 88" />
      <path d="M90 103L65 145" />
      <path d="M90 103L115 145" />
      <path class="hd-workout-pose__motion" d="M45 64C68 43 112 43 135 64" />
      <path class="hd-workout-pose__motion" d="M47 126C72 145 108 145 133 126" />
    </template>
  </svg>
</template>

<style scoped>
.hd-workout-pose {
  width: var(--pb-layout-fill);
  height: var(--pb-layout-fill);
  overflow: visible;
  stroke: var(--pb-color-primary);
  stroke-width: var(--pb-sizing-indicator-thickness);
  stroke-linecap: round;
  stroke-linejoin: round;
  transition:
    opacity var(--pb-motion-duration-normal) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-normal) var(--pb-motion-easing-emphasized);
}

.hd-workout-pose__motion {
  stroke: var(--pb-color-on-surface-muted);
  stroke-dasharray: var(--pb-spacing-sm) var(--pb-spacing-sm);
  opacity: var(--pb-opacity-muted);
}

@media (prefers-reduced-motion: reduce) {
  .hd-workout-pose {
    transition: none;
  }
}
</style>
