<script setup lang="ts">
import { computed, ref } from "vue";
import type { ResolvedThemeValue } from "@proto-bridge/core/v2";
import { deviceViewportCss } from "./model";
const props = defineProps<{
  tokenId: string;
  valueType: string;
  value: ResolvedThemeValue | undefined;
  cssValue: string;
  cssValues: Record<string, string>;
}>();
const playing = ref(false);
const visualValue = computed(
  () => deviceViewportCss({ value: props.cssValue }).value,
);
const palette = computed(() => ({
  "--sample-background": props.cssValues["--pb-color-background"],
  "--sample-surface": props.cssValues["--pb-color-surface"],
  "--sample-ink": props.cssValues["--pb-color-on-surface"],
  "--sample-accent": props.cssValues["--pb-color-primary"],
  "--sample-soft": props.cssValues["--pb-color-primary-soft"],
  "--sample-border": props.cssValues["--pb-color-border"],
}));
const numeric = computed(() => props.tokenId.startsWith("typography.numeric-"));
const isOpacity = computed(() => props.tokenId.startsWith("opacity."));
const isLayer = computed(() => props.tokenId.startsWith("layer."));
const isScale = computed(() => props.tokenId.includes("scale"));
const typographyStyle = computed(() => ({
  font: props.cssValue,
  fontVariantNumeric:
    props.cssValues[
      `--pb-${props.tokenId.replaceAll(".", "-")}-variant-numeric`
    ],
}));
</script>
<template>
  <div
    class="source-sample"
    :class="{ 'is-type': valueType === 'typography' }"
    :style="palette"
    :data-source-sample="valueType"
    :data-source-token="tokenId"
  >
    <i
      v-if="valueType === 'color'"
      class="color-swatch"
      data-color-swatch
      :style="{ background: cssValue }"
      aria-hidden="true"
    />
    <div
      v-else-if="valueType === 'typography'"
      class="font-specimen"
      :style="typographyStyle"
      data-font-specimen
    >
      <template v-if="numeric">12:34 · 1,280.50</template
      ><template v-else
        >把时间留给重要的事<br />Today, 09:41 · Aa 0123</template
      >
    </div>
    <div
      v-else-if="valueType === 'family-list'"
      class="font-specimen"
      :style="{ fontFamily: cssValue }"
    >
      文字与数字 Aa 0123
    </div>
    <div
      v-else-if="valueType === 'border'"
      class="specimen-box"
      :style="{ border: cssValue }"
    >
      描边与焦点
    </div>
    <div v-else-if="valueType === 'shadow'" class="shadow-stage">
      <div class="specimen-box" :style="{ boxShadow: cssValue }">表面层次</div>
    </div>
    <div v-else-if="valueType === 'filter'" class="pattern-stage">
      <div :style="{ backdropFilter: cssValue }">玻璃表面</div>
    </div>
    <div
      v-else-if="valueType === 'asset'"
      class="asset-stage"
      :style="{ backgroundImage: cssValue }"
    >
      <span v-if="value === 'none'">未配置资源</span>
    </div>
    <div
      v-else-if="valueType === 'duration' || valueType === 'easing'"
      class="motion-specimen"
    >
      <button
        type="button"
        :aria-label="`${playing ? '复位' : '播放'} ${tokenId}`"
        :aria-pressed="playing"
        @click="playing = !playing"
      >
        {{ playing ? "复位" : "播放" }}
      </button>
      <div class="motion-track">
        <i
          :class="{ playing }"
          :style="
            valueType === 'duration'
              ? { transitionDuration: cssValue }
              : { transitionTimingFunction: cssValue }
          "
        />
      </div>
    </div>
    <div v-else-if="isOpacity" class="pattern-stage">
      <div class="opacity-overlay" :style="{ opacity: String(value) }" />
      <span>内容可见度</span>
    </div>
    <div v-else-if="isLayer" class="layer-stage">
      <span>参考平面</span
      ><span :style="{ zIndex: String(value) }">层级 {{ value }}</span>
    </div>
    <div
      v-else-if="tokenId.startsWith('motion.') && /angle|rotate/.test(tokenId)"
      class="transform-stage"
    >
      <div
        class="rotation-specimen"
        :style="{
          transform: `rotate(${typeof value === 'number' ? value + 'deg' : cssValue})`,
        }"
      >
        ↑
      </div>
    </div>
    <div v-else-if="isScale" class="transform-stage">
      <div class="specimen-box" :style="{ transform: `scale(${cssValue})` }">
        缩放比例
      </div>
    </div>
    <div
      v-else-if="valueType === 'length' && tokenId.startsWith('radius.')"
      class="specimen-box"
      :style="{ borderRadius: cssValue }"
    >
      圆角表面
    </div>
    <div
      v-else-if="valueType === 'length' && tokenId.startsWith('border.width')"
      class="specimen-box"
      :style="{ border: `${cssValue} solid var(--sample-border)` }"
    >
      描边宽度
    </div>
    <div v-else-if="tokenId === 'layout.flex-fill'" class="flex-specimen">
      <span :style="{ flex: cssValue }">内容 A</span
      ><span :style="{ flex: cssValue }">内容 B</span>
    </div>
    <div
      v-else-if="
        valueType === 'length' &&
        cssValue.includes(' ') &&
        !cssValue.includes('(')
      "
      class="margin-stage"
    >
      <span :style="{ margin: cssValue }">边距区域</span>
    </div>
    <div
      v-else-if="valueType === 'length'"
      class="measure-stage"
      :class="{ 'is-spacing': tokenId.startsWith('spacing.') }"
    >
      <div
        v-if="tokenId.startsWith('spacing.')"
        class="spacing-specimen"
        :style="{ padding: visualValue, gap: visualValue }"
      >
        <span>内容</span><span>间距</span>
      </div>
      <i
        v-else-if="!cssValue.startsWith('-')"
        class="measure-bar"
        :style="{ width: visualValue }"
      />
      <i
        v-else
        class="position-marker"
        :style="{ transform: `translateX(${visualValue})` }"
      />
      <span v-if="Number(value) === 0" class="zero-value">0</span>
    </div>
    <div v-else class="literal-specimen">{{ cssValue }}</div>
  </div>
</template>
<style scoped>
.source-sample {
  margin-bottom: 10px;
  min-width: 0;
  color: var(--sample-ink);
}
.color-swatch {
  display: block;
  width: 36px;
  height: 28px;
  border: 1px solid rgba(var(--v-border-color), 0.22);
  border-radius: 6px;
}
.font-specimen {
  padding: 14px;
  background: var(--sample-background);
  border: 1px solid var(--sample-border);
  border-radius: 8px;
  overflow-wrap: anywhere;
  color: var(--sample-ink);
}
.specimen-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 10px 14px;
  background: var(--sample-surface);
  border-radius: 6px;
  font-size: 12px;
}
.shadow-stage {
  padding: 14px;
  background: var(--sample-background);
  border-radius: 8px;
}
.pattern-stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 64px;
  border-radius: 6px;
  overflow: hidden;
  isolation: isolate;
  background: repeating-linear-gradient(
    45deg,
    var(--sample-soft),
    var(--sample-soft) 10px,
    var(--sample-surface) 10px,
    var(--sample-surface) 20px
  );
}
.pattern-stage > div:not(.opacity-overlay) {
  padding: 12px;
  width: 100%;
  text-align: center;
  background: color-mix(in srgb, var(--sample-surface) 50%, transparent);
}
.opacity-overlay {
  position: absolute;
  inset: 0;
  background: var(--sample-accent);
}
.pattern-stage > span {
  position: relative;
  font-size: 12px;
}
.asset-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  background: var(--sample-background) center / contain no-repeat;
  font-size: 12px;
  border-radius: 6px;
}
.motion-specimen {
  display: flex;
  align-items: center;
  gap: 10px;
}
.motion-specimen button {
  flex: none;
  border: 1px solid var(--sample-border);
  padding: 5px 10px;
  border-radius: 5px;
  background: var(--sample-surface);
  color: var(--sample-ink);
  font-size: 11px;
}
.motion-specimen button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.motion-track {
  position: relative;
  flex: 1;
  height: 28px;
  min-width: 60px;
  background: var(--sample-background);
  border-radius: 6px;
}
.motion-track i {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--sample-accent);
  transition: left 0.6s ease;
}
.motion-track i.playing {
  left: calc(100% - 22px);
}
.flex-specimen {
  display: flex;
  gap: 6px;
  background: var(--sample-soft);
  padding: 6px;
  border-radius: 6px;
}
.flex-specimen span,
.margin-stage span {
  background: var(--sample-surface);
  padding: 6px 10px;
  font-size: 12px;
}
.margin-stage {
  display: flow-root;
  background: var(--sample-soft);
  padding: 6px;
  border-radius: 6px;
}
.margin-stage span {
  display: block;
}
.measure-stage {
  position: relative;
  min-height: 32px;
  max-height: 100px;
  overflow: hidden;
  container-type: size;
  background: var(--sample-soft);
  border-radius: 4px;
}
.measure-stage.is-spacing {
  container-type: inline-size;
  max-height: none;
}
.rotation-specimen {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sample-surface);
  border-radius: 6px;
}
.measure-bar {
  display: block;
  height: 24px;
  margin-block: 4px;
  background: var(--sample-accent);
}
.spacing-specimen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 32px;
  box-sizing: border-box;
}
.spacing-specimen span {
  padding: 2px 5px;
  background: var(--sample-surface);
  font-size: 11px;
  white-space: nowrap;
}
.position-marker {
  position: relative;
  left: 50%;
  display: block;
  width: 4px;
  height: 24px;
  margin-top: 4px;
  background: var(--sample-accent);
}
.zero-value {
  position: absolute;
  inset: 6px;
  font-size: 12px;
}
.layer-stage {
  position: relative;
  isolation: isolate;
  height: 64px;
}
.layer-stage span {
  position: absolute;
  padding: 10px 14px;
  border: 1px solid var(--sample-border);
  border-radius: 5px;
  background: var(--sample-surface);
  font-size: 12px;
}
.layer-stage span:first-child {
  left: 18px;
  top: 16px;
  background: var(--sample-soft);
}
.transform-stage {
  padding: 5px;
  background: var(--sample-soft);
  border-radius: 6px;
}
.literal-specimen {
  display: inline-block;
  padding: 7px 12px;
  border: 1px solid var(--sample-border);
  border-radius: 6px;
  background: var(--sample-surface);
  font-size: 12px;
}
@media (prefers-reduced-motion: reduce) {
  .motion-track i {
    transition: none;
  }
}
</style>
