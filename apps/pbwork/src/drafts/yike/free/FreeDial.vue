<script setup lang="ts">
import { computed } from "vue";
import { Check } from "lucide-vue-next";

const props = defineProps<{
  /** Share of the 60-minute face covered by the wedge, 0..1. */
  fraction: number;
  display: string;
  paused: boolean;
  finished: boolean;
  finishedLabel: string;
  rest: boolean;
  /** Stopwatch only: seconds hand angle in degrees. */
  handAngle?: number | undefined;
}>();

const CENTER = 150;
const WEDGE_RADIUS = 122;

const ticks = Array.from({ length: 60 }, (_, index) => {
  const major = index % 5 === 0;
  const angle = (index / 60) * Math.PI * 2;
  const outer = 140;
  const inner = major ? 128 : 134;
  return {
    index,
    major,
    x1: CENTER + outer * Math.sin(angle),
    y1: CENTER - outer * Math.cos(angle),
    x2: CENTER + inner * Math.sin(angle),
    y2: CENTER - inner * Math.cos(angle),
  };
});

const labels = [0, 10, 20, 30, 40, 50].map((minute) => {
  const angle = (minute / 60) * Math.PI * 2;
  const radius = 156;
  return {
    minute,
    x: CENTER + radius * Math.sin(angle),
    y: CENTER - radius * Math.cos(angle),
  };
});

const wedge = computed(() => {
  const fraction = Math.min(Math.max(props.fraction, 0), 1);
  if (fraction <= 0) return "";
  if (fraction >= 0.9999) return "full";
  const angle = fraction * Math.PI * 2;
  const x = CENTER + WEDGE_RADIUS * Math.sin(angle);
  const y = CENTER - WEDGE_RADIUS * Math.cos(angle);
  const large = fraction > 0.5 ? 1 : 0;
  return `M${CENTER} ${CENTER} L${CENTER} ${CENTER - WEDGE_RADIUS} A${WEDGE_RADIUS} ${WEDGE_RADIUS} 0 ${large} 1 ${x} ${y} Z`;
});

const fill = computed(() => {
  if (props.paused) return "url(#yf-hatch)";
  return props.rest ? "var(--yf-rest)" : "var(--yf-accent)";
});
</script>

<template>
  <div class="yf-dial" :class="{ 'is-rest': rest, 'is-finished': finished }">
    <svg viewBox="-24 -24 348 348" aria-hidden="true">
      <defs>
        <pattern
          id="yf-hatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect
            width="8"
            height="8"
            :fill="rest ? 'var(--yf-rest-soft)' : 'var(--yf-accent-soft)'"
          />
          <rect
            width="3.5"
            height="8"
            :fill="rest ? 'var(--yf-rest)' : 'var(--yf-accent)'"
          />
        </pattern>
      </defs>
      <circle :cx="CENTER" :cy="CENTER" r="146" class="yf-dial-face" />
      <line
        v-for="tick in ticks"
        :key="tick.index"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        class="yf-dial-tick"
        :class="{ 'is-major': tick.major }"
      />
      <text
        v-for="label in labels"
        :key="label.minute"
        :x="label.x"
        :y="label.y"
        class="yf-dial-label"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ label.minute }}
      </text>
      <circle
        v-if="wedge === 'full'"
        :cx="CENTER"
        :cy="CENTER"
        :r="WEDGE_RADIUS"
        :fill="fill"
      />
      <path v-else-if="wedge" :d="wedge" :fill="fill" />
      <line
        v-if="handAngle !== undefined"
        :x1="CENTER"
        :y1="CENTER"
        :x2="CENTER"
        :y2="CENTER - 138"
        class="yf-dial-hand"
        :transform="`rotate(${handAngle} ${CENTER} ${CENTER})`"
      />
      <circle :cx="CENTER" :cy="CENTER" r="86" class="yf-dial-hub" />
    </svg>
    <div class="yf-dial-readout" aria-live="off">
      <template v-if="finished">
        <Check class="yf-dial-check" aria-hidden="true" />
        <span class="yf-dial-finished">{{ finishedLabel }}</span>
      </template>
      <span v-else class="yf-dial-digits">{{ display }}</span>
    </div>
  </div>
</template>
