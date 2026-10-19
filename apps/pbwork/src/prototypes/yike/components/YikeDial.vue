<script setup lang="ts">
import { computed, useId } from "vue";
import { useToken } from "@/design-system/theme/runtime-theme";
import { themeAssetUrl } from "@/design-system/theme/sources";
import type { ResolvedThemeAsset } from "@proto-bridge/core/v2";
import artwork from "./dial-artwork.json";
const props = withDefaults(
  defineProps<{
    face: "mechanical" | "water" | "sundial";
    minutes: number;
    total: number;
    digits: string;
    caption: string;
    tone?: "idle" | "run" | "paused" | "break" | "done";
    inspectId: string;
    countingUp?: boolean;
    compact?: boolean;
  }>(),
  { tone: "idle" },
);
const mark = useToken("asset.brand-mark");
const image = computed(() => {
  const asset = mark.value as ResolvedThemeAsset;
  return asset && typeof asset === "object"
    ? themeAssetUrl(asset.packId, asset.file)
    : undefined;
});
const geometry = computed(() => artwork[props.face]);
const ratio = computed(() =>
  props.countingUp
    ? dialRatio.value
    : props.total > 0 && Number.isFinite(props.minutes)
      ? Math.min(
          artwork.full,
          Math.max(artwork.zero, props.minutes / props.total),
        )
      : artwork.zero,
);
const minutes = computed(() =>
  Number.isFinite(props.minutes)
    ? Math.max(artwork.zero, props.minutes)
    : artwork.zero,
);
const dialRatio = computed(() =>
  minutes.value > artwork.zero &&
  minutes.value % artwork.minuteScale === artwork.zero
    ? artwork.full
    : (minutes.value % artwork.minuteScale) / artwork.minuteScale,
);
const hourNote = computed(() =>
  minutes.value >= artwork.minuteScale
    ? `${minutes.value % artwork.minuteScale === artwork.zero ? "已满" : "另有"} ${Math.floor(minutes.value / artwork.minuteScale)} 小时`
    : "",
);
const captionText = computed(() =>
  hourNote.value ? `${props.caption} · ${hourNote.value}` : props.caption,
);
const clipId = `dial-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
function point(fraction: number, radius: number) {
  const g = geometry.value;
  const angle = fraction * Math.PI * 2;
  return {
    x: g.cx + radius * Math.sin(angle),
    y: g.cy - radius * Math.cos(angle),
  };
}
function sector(fraction: number, start = artwork.zero) {
  const g = geometry.value;
  const from = point(start, g.radius);
  const end = point(fraction, g.radius);
  return `M${g.cx} ${g.cy}L${from.x} ${from.y}A${g.radius} ${g.radius} 0 ${fraction - start > artwork.half ? 1 : 0} 1 ${end.x} ${end.y}Z`;
}
const wedge = computed(() => sector(dialRatio.value));
const shadowParts = computed(() => {
  const fade = Math.min(
    ratio.value,
    artwork.sundial.fadeDegrees / artwork.circleDegrees,
  );
  const core = Math.max(artwork.zero, ratio.value - fade);
  return [
    { path: sector(core), opacity: artwork.full },
    ...Array.from({ length: artwork.sundial.fadeSteps }, (_, index) => ({
      path: sector(
        core + (fade * (index + artwork.full)) / artwork.sundial.fadeSteps,
        core + (fade * index) / artwork.sundial.fadeSteps,
      ),
      opacity:
        artwork.full - (index + artwork.half) / artwork.sundial.fadeSteps,
    })),
  ];
});
const grip = computed(() =>
  point(
    dialRatio.value,
    artwork.mechanical.radius + artwork.mechanical.gripOffset,
  ),
);
const waterTop = computed(
  () => artwork.water.height * (artwork.full - ratio.value),
);
const waterHeight = computed(() => artwork.water.height * ratio.value);
</script>

<template>
  <svg
    class="yike-dial"
    :class="[`is-${face}`, `is-${tone}`, { 'is-compact': compact }]"
    :viewBox="geometry.viewBox"
    role="img"
    :aria-label="`${captionText} ${digits}`"
    :data-pb-id="inspectId"
    data-pb-role="image"
    data-pb-token-artwork="asset.brand-mark"
    data-pb-token-width="size.plot"
    :data-pb-token-compact-inset="compact ? 'spacing.lg' : undefined"
    data-pb-token-color="color.on-surface"
    data-pb-token-filter="effect.artwork-shadow"
  >
    <defs>
      <clipPath :id="`${clipId}-vessel`">
        <path :d="artwork.water.vessel" />
      </clipPath>
      <clipPath :id="`${clipId}-water`">
        <rect
          :x="artwork.zero"
          :y="waterTop"
          :width="artwork.water.width"
          :height="waterHeight"
        />
      </clipPath>
      <filter :id="`${clipId}-blur`">
        <feGaussianBlur :stdDeviation="artwork.sundial.shadowBlur" />
      </filter>
      <mask
        :id="`${clipId}-shadow`"
        class="shadow-mask"
        maskUnits="userSpaceOnUse"
        :x="artwork.zero"
        :y="artwork.zero"
        :width="geometry.width"
        :height="geometry.height"
      >
        <path
          v-for="(part, index) in shadowParts"
          :key="index"
          :d="part.path"
          :opacity="part.opacity"
          fill="currentColor"
        />
      </mask>
      <clipPath :id="`${clipId}-sector`">
        <circle
          v-if="dialRatio === artwork.full"
          :cx="geometry.cx"
          :cy="geometry.cy"
          :r="geometry.radius"
        />
        <path v-else :d="wedge" />
      </clipPath>
    </defs>
    <template v-if="face === 'mechanical'">
      <image :href="image" :width="geometry.width" :height="geometry.height" />
      <g
        v-if="dialRatio > artwork.zero"
        class="wedge"
        :clip-path="`url(#${clipId}-sector)`"
      >
        <image
          :href="`${image}#${tone === 'break' ? 'rest' : tone === 'paused' ? 'paused' : 'progress'}`"
          :width="geometry.width"
          :height="geometry.height"
        />
      </g>
      <circle
        class="grip"
        :cx="grip.x"
        :cy="grip.y"
        :r="artwork.mechanical.gripRadius"
      />
      <circle
        class="knob"
        :cx="geometry.cx"
        :cy="geometry.cy"
        :r="artwork.mechanical.knob"
      />
    </template>
    <template v-else-if="face === 'water'">
      <g :clip-path="`url(#${clipId}-vessel)`">
        <path class="vessel" :d="artwork.water.vessel" />
        <g :clip-path="`url(#${clipId}-water)`">
          <image
            :href="tone === 'break' ? `${image}#rest` : image"
            :width="geometry.width"
            :height="geometry.height"
          />
        </g>
        <image
          v-if="ratio > artwork.zero && tone !== 'paused'"
          :href="`${image}#wave`"
          preserveAspectRatio="none"
          :y="waterTop"
          :width="geometry.width"
          :height="artwork.water.waveHeight"
        />
      </g>
    </template>
    <template v-else>
      <image :href="image" :width="geometry.width" :height="geometry.height" />
      <g
        v-if="ratio > artwork.zero"
        class="shadow"
        :filter="`url(#${clipId}-blur)`"
        :mask="`url(#${clipId}-shadow)`"
        :opacity="
          tone === 'paused' || tone === 'break'
            ? artwork.sundial.subduedOpacity
            : artwork.full
        "
      >
        <image
          :href="`${image}#shadow`"
          :width="artwork.sundial.width"
          :height="artwork.sundial.shadowViewHeight"
        />
      </g>
    </template>
    <text
      class="digits"
      :data-pb-id="`${inspectId}.digits`"
      data-pb-role="text"
      data-pb-token-typography="typography.numeric-display"
      :data-pb-token-color="
        tone === 'done' ? 'color.primary' : 'color.on-surface'
      "
      data-pb-token-tracking="tracking.display"
      :x="geometry.cx"
      :y="geometry.readoutY"
      text-anchor="middle"
    >
      {{ digits }}
    </text>
    <text
      class="caption"
      :data-pb-id="`${inspectId}.caption`"
      data-pb-role="text"
      :data-pb-token-typography="
        face === 'mechanical' ? 'typography.micro' : 'typography.body-sm'
      "
      :data-pb-token-color="
        tone === 'paused' ? 'color.primary' : 'color.on-surface-muted'
      "
      data-pb-token-tracking="tracking.caption"
      :x="geometry.cx"
      :y="geometry.captionY"
      text-anchor="middle"
    >
      {{ captionText }}
    </text>
    <g
      v-if="face === 'water'"
      :clip-path="`url(#${clipId}-water)`"
      aria-hidden="true"
      class="submerged"
      :data-pb-token-color="
        tone === 'break' ? 'color.on-surface' : 'color.on-inverse-surface'
      "
    >
      <text
        class="digits"
        :x="geometry.cx"
        :y="geometry.readoutY"
        text-anchor="middle"
      >
        {{ digits }}
      </text>
      <text
        class="caption"
        :x="geometry.cx"
        :y="geometry.captionY"
        text-anchor="middle"
      >
        {{ captionText }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.yike-dial {
  display: block;
  inline-size: var(--pb-size-plot);
  max-inline-size: var(--pb-layout-fill);
  block-size: auto;
  overflow: visible;
  color: var(--pb-color-on-surface);
}
.yike-dial.is-compact {
  inline-size: calc(
    var(--pb-size-plot) - var(--pb-spacing-lg) - var(--pb-spacing-lg) -
      var(--pb-spacing-lg)
  );
}
.grip {
  fill: var(--pb-color-surface);
  stroke: var(--pb-color-primary);
  stroke-width: var(--pb-border-width-accent);
}
.is-break .grip {
  stroke: var(--pb-color-on-surface-muted);
}
.knob,
.vessel {
  fill: var(--pb-color-surface);
  stroke: var(--pb-color-border);
  stroke-width: var(--pb-border-width);
}
.digits {
  fill: currentColor;
  font: var(--pb-typography-numeric-display);
  font-variant-numeric: tabular-nums;
}
.caption {
  fill: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-body-sm);
}
.is-mechanical .caption {
  font: var(--pb-typography-micro);
}
.is-paused > .caption,
.is-done > .digits {
  fill: var(--pb-color-primary);
}
.submerged .digits,
.submerged .caption {
  fill: var(--pb-color-on-inverse-surface);
}
.is-break .submerged .digits,
.is-break .submerged .caption {
  fill: var(--pb-color-on-surface);
}
.shadow-mask {
  mask-type: alpha;
}
</style>

<style scoped>
.yike-dial {
  filter: var(--pb-effect-artwork-shadow);
}
.digits {
  letter-spacing: var(--pb-tracking-display);
}
.caption {
  letter-spacing: var(--pb-tracking-caption);
}
</style>
