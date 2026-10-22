<script setup lang="ts">
import themeArtwork from "../theme/artwork.json";
import { computed, useId, ref, watch, inject } from "vue";
import { useToken, ThemeTableKey } from "@/design-system/theme/runtime-theme";
import { themeAssetUrl } from "@/design-system/theme/sources";
import type { ResolvedThemeAsset } from "@proto-bridge/core/v2";
import YikeReadout from "./YikeReadout.vue";
import artwork from "./dial-artwork.json";
const props = withDefaults(
  defineProps<{
    face: "mechanical" | "water" | "sundial";
    /** 0–1 of one 60-minute revolution; the same amount on every face. */
    fraction: number;
    digits: string;
    /** Reserve the longest reading of this session to keep its type size stable. */
    readoutSlots?: number;
    caption: string;
    note?: string;
    tone?: "idle" | "run" | "paused" | "break" | "done";
    inspectId: string;
    /** Session elapsed time, used only for the per-second / per-minute beat. */
    elapsedMs?: number;
    /**
     * `hour` prints the 0–60 minute scale (pomodoro, breaks, stopwatch).
     * `session` drops the numbers because the revolution is the chosen
     * countdown length, where printed minutes would lie.
     */
    scale?: "hour" | "session";
  }>(),
  { tone: "idle", elapsedMs: 0, scale: "hour" },
);
const themeTable = inject(ThemeTableKey)!;
const waterInkToken = computed(() =>
  props.tone === "break" || themeTable.value.identity.mode === "light"
    ? "color.on-surface"
    : "color.on-inverse-surface",
);
const waterInk = useToken(waterInkToken);
const readoutDirection = ref<"up" | "down" | "crossfade">("crossfade");
const secondsOf = (value: string) =>
  value.split(":").reduce((sum, part) => sum * 60 + Number(part), 0);
watch(
  () => props.digits,
  (value, previous) => {
    const delta = secondsOf(value) - secondsOf(previous);
    readoutDirection.value =
      value.length === previous.length &&
      Math.abs(delta) === 1 &&
      !document.hidden
        ? delta > 0
          ? "up"
          : "down"
        : "crossfade";
  },
  { flush: "sync" },
);
const reservedSlots = computed(() => props.readoutSlots ?? props.digits.length);
const mark = useToken("asset.brand-mark");
const selectedArtwork = computed(() => {
  const asset = mark.value as ResolvedThemeAsset;
  if (!asset || typeof asset !== "object") return undefined;
  const base = themeArtwork.assets.find((entry) => entry.file === asset.file);
  const sessionId =
    base && "sessionAsset" in base ? base.sessionAsset : undefined;
  const session = themeArtwork.assets.find((entry) => entry.id === sessionId);
  const selected =
    props.face === "mechanical" && props.scale === "session" ? session : base;
  if (!selected) throw new Error("Missing registered session artwork");
  return { ...selected, packId: asset.packId };
});
const image = computed(() => {
  const selected = selectedArtwork.value;
  return selected ? themeAssetUrl(selected.packId, selected.file) : undefined;
});
const artworkDeclaration = computed(() => {
  const selected = selectedArtwork.value;
  if (!selected) return undefined;
  return JSON.stringify({
    packId: selected.packId,
    file: selected.file,
    state: { tone: props.tone, scale: props.scale, fraction: props.fraction },
  });
});
const geometry = computed(() => artwork[props.face]);
const ratio = computed(() =>
  Number.isFinite(props.fraction)
    ? Math.min(artwork.full, Math.max(artwork.zero, props.fraction))
    : artwork.zero,
);
const captionRevision = ref(artwork.zero);
watch(
  () => props.caption,
  () => {
    captionRevision.value += artwork.full;
  },
);
const captionText = computed(() =>
  props.note ? `${props.caption} · ${props.note}` : props.caption,
);
/** Running only: seconds phase drives the beat, silence otherwise. */
const beat = computed(() => {
  if (props.tone !== "run") return { second: 0, minute: 0, phase: 0 };
  const milliseconds = Math.max(0, props.elapsedMs);
  const seconds = milliseconds / 1000;
  const phase = seconds - Math.floor(seconds);
  const minutePhase = (milliseconds % 60_000) / 60_000;
  return {
    phase,
    second: Math.max(0, 1 - phase / artwork.beat.secondWindow),
    minute: Math.max(0, 1 - minutePhase / artwork.beat.minuteWindow),
  };
});
const gripRadius = computed(
  () =>
    artwork.mechanical.gripRadius *
    (1 +
      artwork.beat.gripSecond * beat.value.second +
      artwork.beat.gripMinute * beat.value.minute),
);
/** The surface shimmers every second; a ripple rings once a minute. */
const ripple = computed(() => ({
  radius:
    artwork.beat.rippleMinRadius +
    (artwork.beat.rippleMaxRadius - artwork.beat.rippleMinRadius) *
      Math.min(1, (1 - beat.value.minute) * 1.4),
  opacity: Math.max(0, beat.value.minute) * artwork.beat.rippleMinuteOpacity,
}));
const surfaceOpacity = computed(() =>
  shut.value
    ? 0
    : artwork.beat.surfaceRest + artwork.beat.surfaceSecond * beat.value.second,
);
const gnomonRing = computed(() => ({
  radius:
    artwork.beat.gnomonSecondRadius +
    (artwork.beat.gnomonMinuteRadius - artwork.beat.gnomonSecondRadius) *
      Math.min(1, beat.value.phase * 1.6),
  opacity: Math.min(1, beat.value.minute * artwork.beat.gnomonOpacity),
}));
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
const wedge = computed(() => sector(ratio.value));
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
  point(ratio.value, artwork.mechanical.radius + artwork.mechanical.gripOffset),
);
const waterTop = computed(
  () => artwork.water.height * (artwork.full - ratio.value),
);
const waterHeight = computed(() => artwork.water.height * ratio.value);
const shut = computed(() => props.tone === "paused" || props.tone === "done");
/** Sundial: the shadow brightens a hair each second, a ring marks each minute. */
const shadowOpacity = computed(() => {
  const base =
    props.tone === "paused" || props.tone === "break"
      ? artwork.sundial.subduedOpacity
      : artwork.sundial.restOpacity;
  return Math.min(
    1,
    base +
      (props.tone === "run"
        ? artwork.beat.shadowSecond * beat.value.second
        : 0),
  );
});
</script>

<template>
  <svg
    class="yike-dial"
    :class="[`is-${face}`, `is-${tone}`]"
    :viewBox="geometry.viewBox"
    role="img"
    :aria-label="`${captionText} ${digits}`"
    :data-pb-id="inspectId"
    :data-pb-artwork="artworkDeclaration"
    data-pb-role="image"
    data-pb-token-artwork="asset.brand-mark"
    data-pb-token-width="size.plot"
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
          v-if="ratio === artwork.full"
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
        v-if="ratio > artwork.zero"
        class="wedge"
        :clip-path="`url(#${clipId}-sector)`"
      >
        <image
          class="layer"
          :class="{ 'is-on': tone !== 'paused' && tone !== 'break' }"
          :href="`${image}#progress`"
          :width="geometry.width"
          :height="geometry.height"
        />
        <image
          class="layer"
          :class="{ 'is-on': tone === 'paused' }"
          :href="`${image}#paused`"
          :width="geometry.width"
          :height="geometry.height"
        />
        <image
          class="layer"
          :class="{ 'is-on': tone === 'break' }"
          :href="`${image}#rest`"
          :width="geometry.width"
          :height="geometry.height"
        />
      </g>
      <circle class="grip" :cx="grip.x" :cy="grip.y" :r="gripRadius" />
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
            class="layer"
            :class="{ 'is-on': tone !== 'break' }"
            :href="image"
            :width="geometry.width"
            :height="geometry.height"
          />
          <image
            class="layer"
            :class="{ 'is-on': tone === 'break' }"
            :href="`${image}#rest`"
            :width="geometry.width"
            :height="geometry.height"
          />
        </g>
        <g
          v-if="ratio > artwork.zero && ripple.opacity > artwork.zero"
          :clip-path="`url(#${clipId}-water)`"
        >
          <ellipse
            class="ripple"
            :cx="geometry.cx"
            :cy="waterTop"
            :rx="ripple.radius"
            :ry="ripple.radius * artwork.beat.rippleFlatten"
            :opacity="ripple.opacity"
          />
        </g>
        <image
          class="wave"
          :style="{ opacity: surfaceOpacity }"
          :href="`${image}#wave`"
          preserveAspectRatio="none"
          :y="waterTop"
          :width="geometry.width"
          :height="artwork.water.waveHeight"
        />
        <image
          :href="`${image}#glass`"
          :width="geometry.width"
          :height="geometry.height"
        />
      </g>
    </template>
    <template v-else>
      <image :href="image" :width="geometry.width" :height="geometry.height" />
      <g
        v-if="ratio > artwork.zero"
        class="shadow"
        :style="{ opacity: shadowOpacity }"
        :filter="`url(#${clipId}-blur)`"
        :mask="`url(#${clipId}-shadow)`"
      >
        <image
          :href="`${image}#shadow`"
          :width="artwork.sundial.width"
          :height="artwork.sundial.shadowViewHeight"
        />
      </g>
      <circle
        v-if="tone === 'run' && beat.minute > artwork.zero"
        class="gnomon"
        :cx="geometry.cx"
        :cy="geometry.cy"
        :r="gnomonRing.radius"
        :opacity="gnomonRing.opacity"
      />
    </template>
    <YikeReadout
      class="digits"
      :data-pb-id="`${inspectId}.digits`"
      data-pb-role="text"
      data-pb-token-typography="typography.numeric-display"
      :data-pb-token-color="
        tone === 'done' ? 'color.primary' : 'color.on-surface'
      "
      data-pb-token-tracking="tracking.display"
      data-pb-token-duration="motion.duration-short"
      data-pb-token-easing="motion.easing-standard"
      :x="geometry.cx"
      :value="digits"
      :slots="reservedSlots"
      :direction="readoutDirection"
      :y="geometry.readoutY"
    />
    <text
      class="caption"
      :key="captionRevision"
      :class="{ 'is-changing': captionRevision > artwork.zero }"
      :data-pb-id="`${inspectId}.caption`"
      data-pb-role="text"
      data-pb-token-typography="typography.micro"
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
      :data-pb-token-color="waterInkToken"
      :style="{ color: String(waterInk) }"
    >
      <YikeReadout
        class="digits"
        :value="digits"
        :slots="reservedSlots"
        :direction="readoutDirection"
        :x="geometry.cx"
        :y="geometry.readoutY"
      />
      <text
        class="caption"
        :key="captionRevision"
        :class="{ 'is-changing': captionRevision > artwork.zero }"
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
.layer,
.shadow {
  transition: opacity var(--pb-motion-duration-medium)
    var(--pb-motion-easing-standard);
}
.wave {
  transition: opacity var(--pb-motion-duration-short) linear;
}
.layer {
  opacity: var(--pb-opacity-hidden);
}
.layer.is-on {
  opacity: var(--pb-opacity-visible);
}
.ripple,
.gnomon {
  fill: none;
  stroke: var(--pb-color-on-inverse-surface);
  stroke-width: var(--pb-border-width);
}
.gnomon {
  stroke: var(--pb-color-primary);
  stroke-width: var(--pb-border-width);
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
  stroke: var(--pb-color-outline);
  stroke-width: var(--pb-border-width);
}
.digits {
  fill: currentColor;
  font: var(--pb-typography-numeric-display);
  font-variant-numeric: tabular-nums;
}
.caption {
  fill: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-micro);
}
.is-paused > .caption,
.is-done > .digits {
  color: var(--pb-color-primary);
  fill: var(--pb-color-primary);
}
.submerged .digits,
.submerged .caption {
  fill: currentColor;
}
.is-break .submerged .digits,
.is-break .submerged .caption {
  fill: currentColor;
}
.shadow-mask {
  mask-type: alpha;
}
</style>

<style scoped>
.yike-dial {
  filter: var(--pb-effect-artwork-shadow);
  transform-origin: center;
}
.digits {
  letter-spacing: var(--pb-tracking-display);
}
.caption {
  letter-spacing: var(--pb-tracking-caption);
}
.is-done {
  animation: yike-settle var(--pb-motion-duration-long)
    var(--pb-motion-easing-emphasized);
}
@keyframes yike-settle {
  0%,
  100% {
    transform: none;
  }
  35% {
    transform: scale(
      calc(var(--pb-layout-flex-grow) / var(--pb-motion-press-scale))
    );
  }
}
@media (prefers-reduced-motion: reduce) {
  .layer,
  .shadow,
  .wave {
    transition: none;
  }
  .is-done {
    animation: none;
  }
}
</style>

<style scoped>
.caption.is-changing {
  animation: yike-caption-appear var(--pb-motion-duration-short)
    var(--pb-motion-easing-standard);
}
@keyframes yike-caption-appear {
  from {
    opacity: var(--pb-opacity-hidden);
  }
  to {
    opacity: var(--pb-opacity-visible);
  }
}
@media (prefers-reduced-motion: reduce) {
  .caption.is-changing {
    animation: none;
  }
}
</style>
