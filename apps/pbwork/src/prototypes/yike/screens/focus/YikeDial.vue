<script setup lang="ts">
import { computed } from "vue";

type Face = "mechanical" | "water" | "sundial";
const props = defineProps<{
  face: Face;
  progress: number;
  display: string;
  caption: string;
  paused: boolean;
  rest: boolean;
  finished: boolean;
}>();

const center = 150;
const ticks = Array.from({ length: 60 }, (_, index) => {
  const angle = (index / 60) * Math.PI * 2;
  const major = index % 5 === 0;
  const outer = 137;
  const inner = major ? 123 : 130;
  return {
    index,
    major,
    x1: center + outer * Math.sin(angle),
    y1: center - outer * Math.cos(angle),
    x2: center + inner * Math.sin(angle),
    y2: center - inner * Math.cos(angle),
  };
});
const labels = [0, 10, 20, 30, 40, 50].map((minute) => {
  const angle = (minute / 60) * Math.PI * 2;
  return { minute, x: center + 151 * Math.sin(angle), y: center - 151 * Math.cos(angle) };
});
const wedge = computed(() => {
  const fraction = Math.min(1, Math.max(0, props.progress));
  if (!fraction) return "";
  if (fraction >= 0.999) return "full";
  const angle = fraction * Math.PI * 2;
  const x = center + 119 * Math.sin(angle);
  const y = center - 119 * Math.cos(angle);
  return `M${center} ${center} L${center} ${center - 119} A119 119 0 ${fraction > 0.5 ? 1 : 0} 1 ${x} ${y} Z`;
});
</script>

<template>
  <div class="yk-dial" :class="[`is-${face}`, { 'is-paused': paused, 'is-rest': rest, 'is-finished': finished }]" role="img" :aria-label="`${caption} ${display}`">
    <div v-if="face === 'water'" class="yk-water-vessel">
      <div class="yk-water-level" :style="{ '--yk-level': `${Math.round(progress * 100)}%` }"><i /></div>
      <div class="yk-water-readout"><span>{{ caption }}</span><strong>{{ display }}</strong></div>
    </div>
    <div v-else class="yk-face">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <circle class="yk-bezel" cx="150" cy="150" r="146" />
        <circle class="yk-face-surface" cx="150" cy="150" r="132" />
        <path v-if="face === 'mechanical' && wedge" class="yk-wedge" :d="wedge === 'full' ? undefined : wedge" />
        <circle v-if="face === 'mechanical' && wedge === 'full'" class="yk-wedge" cx="150" cy="150" r="119" />
        <line v-for="tick in ticks" :key="tick.index" class="yk-tick" :class="{ 'is-major': tick.major }" :x1="tick.x1" :y1="tick.y1" :x2="tick.x2" :y2="tick.y2" />
        <text v-for="label in labels" :key="label.minute" class="yk-label" :x="label.x" :y="label.y" text-anchor="middle" dominant-baseline="central">{{ label.minute }}</text>
        <template v-if="face === 'sundial'">
          <line class="yk-gnomon" x1="150" y1="150" x2="150" y2="24" />
          <line class="yk-shadow" x1="150" y1="150" x2="150" :y2="150 - 120 * Math.cos(progress * Math.PI * 2)" :transform="`rotate(${progress * 360} 150 150)`" />
        </template>
        <circle class="yk-hub" cx="150" cy="150" r="74" />
      </svg>
      <div class="yk-dial-readout"><strong>{{ display }}</strong><span>{{ finished ? '本轮完成' : caption }}</span></div>
    </div>
  </div>
</template>

<style scoped>
.yk-dial { position: relative; display: flex; inline-size: var(--pb-size-plot); block-size: var(--pb-size-plot); align-items: center; justify-content: center; color: var(--pb-color-on-surface); }
.yk-face, .yk-water-vessel { position: relative; inline-size: var(--pb-layout-fill); block-size: var(--pb-layout-fill); }
.yk-face svg { inline-size: var(--pb-layout-fill); block-size: var(--pb-layout-fill); overflow: visible; }
.yk-bezel { fill: var(--pb-color-surface-recessed); stroke: var(--pb-color-outline); stroke-width: var(--pb-border-width-strong); }
.yk-face-surface { fill: var(--pb-color-surface); }
.yk-tick { stroke: var(--pb-color-on-surface-muted); stroke-width: var(--pb-border-width); opacity: var(--pb-opacity-disabled); }
.yk-tick.is-major { stroke: var(--pb-color-on-surface); stroke-width: var(--pb-border-width-strong); }
.yk-label { fill: var(--pb-color-on-surface-muted); font: var(--pb-typography-caption); }
.yk-wedge { fill: var(--pb-color-primary); opacity: var(--pb-opacity-translucent); }
.yk-hub { fill: var(--pb-color-surface); stroke: var(--pb-color-outline); stroke-width: var(--pb-border-width); }
.yk-gnomon, .yk-shadow { stroke: var(--pb-color-primary); stroke-width: var(--pb-border-width-strong); stroke-linecap: round; }
.yk-shadow { opacity: var(--pb-opacity-pressed); }
.yk-dial-readout { position: absolute; inset: var(--pb-layout-zero); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--pb-space-2); }
.yk-dial-readout strong { font: var(--pb-typography-numeric-display); font-variant-numeric: tabular-nums; }
.yk-dial-readout span, .yk-water-readout span { color: var(--pb-color-on-surface-muted); font: var(--pb-typography-caption); }
.is-paused .yk-wedge { opacity: var(--pb-opacity-disabled); }
.yk-water-vessel { overflow: hidden; border: var(--pb-border-width-strong) solid var(--pb-color-outline); border-radius: var(--pb-radius-surface); background: var(--pb-color-surface); }
.yk-water-readout { position: absolute; inset: var(--pb-space-6); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.yk-water-readout strong { font: var(--pb-typography-numeric-display); font-variant-numeric: tabular-nums; }
.yk-water-level { position: absolute; right: var(--pb-layout-zero); bottom: var(--pb-layout-zero); left: var(--pb-layout-zero); block-size: var(--yk-level); background: var(--pb-color-primary); opacity: var(--pb-opacity-translucent); transition: block-size var(--pb-motion-duration-medium); }
.yk-water-level i { display: block; block-size: var(--pb-size-marker); background: var(--pb-color-primary-soft); opacity: var(--pb-opacity-translucent); }
</style>
