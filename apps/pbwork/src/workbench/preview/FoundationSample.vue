<script setup lang="ts">
import { computed, ref } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { TokenCategory } from "@/design-system/types";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import {
  themeKeyCategory,
  normalizeTokenCssVarName as cssVar,
} from "@/design-system/theme/presentation";
import { TOKEN_CATEGORY_META } from "@/design-system/tokenCategories";
const props = defineProps<{
  category: TokenCategory;
  table: ResolvedThemeTable;
}>();
const keys = computed(() => [
  ...runtimeThemeSources.keyCatalog.keys
    .filter((key) => themeKeyCategory(key) === props.category)
    .map((key) => ({ ...key, constant: false })),
  ...runtimeThemeSources.constants.constants
    .filter((key) => key.id.startsWith(`${props.category}.`))
    .map((key) => ({ ...key, constant: true })),
]);
const playing = ref("");
function replay(id: string) {
  playing.value = playing.value === id ? "" : id;
}
const variable = (id: string) => `var(${cssVar(id)})`;
function value(id: string) {
  return props.table.values[id] ?? props.table.constants[id];
}
function layoutStyle(id: string) {
  const v = value(id);
  if (typeof v === "string" && v.endsWith("%")) return { width: variable(id) };
  if (id.includes("shift")) return { transform: `translateX(${variable(id)})` };
  return { maxWidth: variable(id) };
}
</script>
<template>
  <div class="foundation-sample" :data-foundation-category="category">
    <h2>{{ TOKEN_CATEGORY_META[category].label }}</h2>
    <p>{{ TOKEN_CATEGORY_META[category].description }}</p>
    <section v-for="key in keys" :key="key.id" :data-foundation-key="key.id">
      <header>
        <strong>{{ key.label ?? key.id }}</strong
        ><code>{{ key.id }}</code
        ><small v-if="key.constant">只读常量</small>
      </header>
      <div v-if="category === 'spacing'" class="spacing-demo">
        <div :style="{ padding: variable(key.id), gap: variable(key.id) }">
          <span>内容</span><span>内容</span>
        </div>
      </div>
      <div v-else-if="category === 'sizing'" class="sample-frame">
        <div
          class="size-sample"
          :class="{ 'is-square': !key.id.includes('control') }"
          :style="
            key.id.includes('control')
              ? { height: variable(key.id) }
              : { width: variable(key.id), height: variable(key.id) }
          "
        >
          {{ key.id.includes("control") ? "操作区域" : "" }}
        </div>
      </div>
      <div
        v-else-if="category === 'radius'"
        class="shape-sample"
        :style="{ borderRadius: variable(key.id) }"
      >
        内容表面
      </div>
      <div
        v-else-if="category === 'border'"
        class="border-sample"
        :class="{ 'is-width-only': key.valueType === 'length' }"
        :style="
          key.valueType === 'length'
            ? { '--sample-border-width': variable(key.id) }
            : { border: variable(key.id) }
        "
      >
        {{ key.valueType === "length" ? "描边宽度" : "描边与焦点" }}
      </div>
      <div
        v-else-if="category === 'elevation'"
        class="shape-sample"
        :style="{ boxShadow: variable(key.id) }"
      >
        表面层次
      </div>
      <div v-else-if="category === 'opacity'" class="opacity-demo">
        <span>背景内容</span><i :style="{ opacity: variable(key.id) }" />
      </div>
      <div v-else-if="category === 'motion'" class="motion-demo">
        <template
          v-if="key.valueType === 'duration' || key.valueType === 'easing'"
        >
          <button
            type="button"
            :aria-pressed="playing === key.id"
            @click="replay(key.id)"
          >
            {{ playing === key.id ? "复位" : "播放" }}
          </button>
          <div class="motion-track">
            <i
              :class="{ 'is-playing': playing === key.id }"
              :style="
                key.valueType === 'duration'
                  ? { transitionDuration: variable(key.id) }
                  : { transitionTimingFunction: variable(key.id) }
              "
            />
          </div> </template
        ><span v-else>{{
          key.valueType === "asset" ? "未配置资源" : value(key.id)
        }}</span>
      </div>
      <div
        v-else-if="category === 'layout' && key.valueType !== 'enum'"
        class="layout-track"
      >
        <span class="layout-fill" :style="layoutStyle(key.id)">内容区域</span>
      </div>
      <div v-else-if="category === 'layout'" class="shape-sample">
        {{ key.label }} · {{ value(key.id) }}
      </div>
      <div v-else-if="category === 'layer'" class="layer-stack">
        <span>参考平面</span
        ><span :style="{ zIndex: variable(key.id) }"
          >{{ value(key.id) }} · {{ key.label }}</span
        >
      </div>
      <div v-else-if="category === 'effect'" class="effect-demo">
        <div
          v-if="key.valueType === 'filter'"
          :style="{ backdropFilter: variable(key.id) }"
        >
          玻璃表面
        </div>
        <div
          v-else-if="key.valueType === 'asset' && value(key.id) !== 'none'"
          class="asset-demo"
          :style="{ backgroundImage: variable(key.id) }"
        >
          资源图像
        </div>
        <span v-else>{{
          key.valueType === "asset" ? "未配置资源" : value(key.id)
        }}</span>
      </div>
      <small v-if="key.description">{{ key.description }}</small>
    </section>
  </div>
</template>
<style scoped>
.foundation-sample {
  padding: var(--pb-spacing-md);
  color: var(--pb-color-on-background);
  font: var(--pb-typography-content);
}
h2 {
  margin: 0;
  font: var(--pb-typography-title);
}
p,
small {
  color: var(--pb-color-on-surface-muted);
}
section {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding-block: var(--pb-spacing-md);
  border-bottom: var(--pb-border-hairline);
}
header {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
}
code,
small {
  font: var(--pb-typography-caption);
  overflow-wrap: anywhere;
}
.sample-frame {
  display: flex;
  align-items: center;
  min-height: 72px;
  overflow: hidden;
}
.shape-sample,
.border-sample {
  padding: var(--pb-spacing-md);
  min-height: 64px;
  background: var(--pb-color-surface);
  border-radius: var(--pb-radius-surface);
}
.border-sample.is-width-only {
  position: relative;
  border-radius: 0;
}
.border-sample.is-width-only::before {
  content: "";
  position: absolute;
  inset: 0;
  border: var(--sample-border-width) solid var(--pb-color-border);
  pointer-events: none;
}
.size-sample {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background: var(--pb-color-primary-soft);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
}
.size-sample.is-square {
  flex: none;
}
.spacing-demo {
  background: var(--pb-color-primary-soft);
  border-radius: var(--pb-radius-control);
}
.spacing-demo > div {
  display: flex;
  flex-wrap: wrap;
}
.spacing-demo span {
  padding: var(--pb-spacing-xs);
  background: var(--pb-color-surface);
}
.opacity-demo,
.effect-demo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  background: repeating-linear-gradient(
    45deg,
    var(--pb-color-primary-soft),
    var(--pb-color-primary-soft) 12px,
    var(--pb-color-surface) 12px,
    var(--pb-color-surface) 24px
  );
  overflow: hidden;
  border-radius: var(--pb-radius-control);
}
.opacity-demo i {
  position: absolute;
  inset: 0;
  background: var(--pb-color-scrim);
}
.effect-demo > div {
  padding: var(--pb-spacing-md);
  width: 100%;
  text-align: center;
  background-color: color-mix(
    in srgb,
    var(--pb-color-surface) 50%,
    transparent
  );
}
.asset-demo {
  background-position: center;
  background-size: contain;
  min-height: 100px;
}
.motion-demo {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.motion-demo button {
  align-self: flex-start;
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-action);
  color: var(--pb-color-on-action);
  padding: var(--pb-spacing-sm) var(--pb-spacing-md);
}
.motion-demo button:focus-visible {
  outline: var(--pb-border-focus);
}
.motion-track {
  height: 32px;
  position: relative;
  background: var(--pb-color-surface);
  border-radius: var(--pb-radius-control);
}
.motion-track i {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--pb-color-primary);
  transition: left var(--pb-motion-duration-long)
    var(--pb-motion-easing-standard);
}
.motion-track i.is-playing {
  left: calc(100% - 28px);
}
.layout-track {
  overflow: hidden;
  background: var(--pb-color-primary-soft);
  border-radius: var(--pb-radius-control);
}
.layout-fill {
  display: block;
  background: var(--pb-color-surface);
  padding: var(--pb-spacing-sm);
}
.layer-stack {
  position: relative;
  isolation: isolate;
  height: 90px;
}
.layer-stack span {
  position: absolute;
  padding: var(--pb-spacing-md);
  border: var(--pb-border-hairline);
  background: var(--pb-color-surface);
  border-radius: var(--pb-radius-control);
}
.layer-stack span:first-child {
  left: 24px;
  top: 20px;
  background: var(--pb-color-primary-soft);
}
@media (prefers-reduced-motion: reduce) {
  .motion-track i {
    transition: none;
  }
}
</style>
