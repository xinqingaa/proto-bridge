<script setup lang="ts">
import { computed } from "vue";
import type { StyleDirectionId } from "./sample";

export type DialTone = "idle" | "run" | "paused" | "break" | "done";

const props = withDefaults(
  defineProps<{
    theme: StyleDirectionId;
    /** Minutes shown by the dial: remaining, or elapsed when counting up. */
    minutes: number;
    total: number;
    digits?: string;
    caption?: string;
    tone?: DialTone;
    size?: "full" | "compact" | "mini";
  }>(),
  { digits: "", caption: "", tone: "run", size: "full" },
);

const CENTER = 150;
const WEDGE_RADIUS = 112;

function point(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(radians),
    y: CENTER - radius * Math.cos(radians),
  };
}

const ratio = computed(() =>
  props.total > 0 ? Math.min(1, Math.max(0, props.minutes / props.total)) : 0,
);

/** Kitchen-timer semantics: the wedge always reads against a 60-minute face. */
const wedgeAngle = computed(() => (Math.min(props.minutes, 60) / 60) * 360);
const wedgePath = computed(() => {
  const end = point(WEDGE_RADIUS, wedgeAngle.value);
  const large = wedgeAngle.value > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - WEDGE_RADIUS} A ${WEDGE_RADIUS} ${WEDGE_RADIUS} 0 ${large} 1 ${end.x} ${end.y} Z`;
});
const grip = computed(() => point(WEDGE_RADIUS + 2, wedgeAngle.value));

const ticks = Array.from({ length: 60 }, (_, minute) => {
  const major = minute % 5 === 0;
  return {
    minute,
    major,
    outer: point(128, minute * 6),
    inner: point(major ? 116 : 122, minute * 6),
  };
});
const numerals = [0, 10, 20, 30, 40, 50].map((minute) => ({
  minute,
  ...point(140, minute * 6),
}));

const hourLines = Array.from({ length: 24 }, (_, index) => {
  const radians = (index * 15 * Math.PI) / 180;
  const inner = index % 2 === 0 ? 96 : 118;
  return {
    index,
    major: index % 2 === 0,
    x1: 150 + inner * Math.sin(radians),
    y1: 150 - inner * Math.cos(radians),
    x2: 150 + 132 * Math.sin(radians),
    y2: 150 - 132 * Math.cos(radians),
  };
});

const level = computed(() => `${Math.round(ratio.value * 1000) / 10}%`);
const shadowAngle = computed(() => `${Math.round(ratio.value * 360)}deg`);
</script>

<template>
  <div
    class="y-dial"
    :class="[`is-${size}`, `is-${tone}`]"
    role="img"
    :aria-label="digits ? `${caption} ${digits}` : '表盘'"
  >
    <div v-if="theme === 'mechanical'" class="ym-dial">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <circle class="ym-bezel" :cx="CENTER" :cy="CENTER" r="148" />
        <circle class="ym-face" :cx="CENTER" :cy="CENTER" r="130" />
        <path v-if="wedgeAngle > 0.5" class="ym-wedge" :d="wedgePath" />
        <line
          v-for="tick in ticks"
          :key="tick.minute"
          :class="['ym-tick', { 'is-major': tick.major }]"
          :x1="tick.outer.x"
          :y1="tick.outer.y"
          :x2="tick.inner.x"
          :y2="tick.inner.y"
        />
        <text
          v-for="numeral in numerals"
          :key="numeral.minute"
          class="ym-numeral"
          :x="numeral.x"
          :y="numeral.y"
        >
          {{ numeral.minute }}
        </text>
        <circle class="ym-grip" :cx="grip.x" :cy="grip.y" r="5" />
        <circle class="ym-knob" :cx="CENTER" :cy="CENTER" r="72" />
      </svg>
      <div v-if="size !== 'mini' && digits" class="ym-readout">
        <strong>{{ digits }}</strong>
        <span>{{ caption }}</span>
      </div>
    </div>

    <div
      v-else-if="theme === 'water'"
      class="yw-vessel"
      :style="{ '--yw-level': level }"
    >
      <div v-if="size !== 'mini' && digits" class="yw-readout">
        <span>{{ caption }}</span>
        <strong>{{ digits }}</strong>
      </div>
      <div class="yw-water">
        <svg
          class="yw-surface"
          viewBox="0 0 240 12"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 6 C 30 1, 60 11, 90 6 S 150 1, 180 6 S 225 10, 240 6 V 12 H 0 Z" />
        </svg>
        <div v-if="size !== 'mini' && digits" class="yw-readout is-submerged" aria-hidden="true">
          <span>{{ caption }}</span>
          <strong>{{ digits }}</strong>
        </div>
      </div>
    </div>

    <div v-else class="yd-paper" :style="{ '--yd-angle': shadowAngle }">
      <span class="yd-shadow" aria-hidden="true" />
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <line
          v-for="line in hourLines"
          :key="line.index"
          :class="['yd-hour', { 'is-major': line.major }]"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
        />
        <line class="yd-gnomon" x1="150" y1="150" x2="150" y2="22" />
        <circle class="yd-pin" cx="150" cy="150" r="3" />
      </svg>
      <div v-if="size !== 'mini' && digits" class="yd-readout">
        <strong>{{ digits }}</strong>
        <span>{{ caption }}</span>
      </div>
    </div>
  </div>
</template>
