<script setup lang="ts">
import { computed } from "vue";
import { loadTokens } from "@/design-system/loaders";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import type { TokenCategory } from "@/design-system/types";

const props = defineProps<{
  category: TokenCategory;
}>();

const tokens = computed(() =>
  loadTokens().filter((token) => token.category === props.category),
);
const resolved = computed(() => resolveThemeTokens("light"));
const cssVars = computed(() => tokensToCssVars(resolved.value));

const categoryLabels: Record<TokenCategory, string> = {
  color: "颜色",
  typography: "字体",
  spacing: "间距",
  radius: "圆角",
  elevation: "阴影",
};
</script>

<template>
  <section class="token-gallery" :style="cssVars">
    <header>
      <p>设计令牌</p>
      <h1>{{ categoryLabels[category] }}</h1>
    </header>

    <div v-if="category === 'color'" class="swatch-grid">
      <article v-for="token in tokens" :key="token.id" class="swatch">
        <div
          class="swatch-chip"
          :style="{ background: String(resolved[token.id]) }"
        />
        <strong>{{ token.label }}</strong>
        <code>{{ token.id }}</code>
        <span>{{ resolved[token.id] }}</span>
      </article>
    </div>

    <div v-else-if="category === 'typography'" class="stack">
      <article v-for="token in tokens" :key="token.id" class="row">
        <p :style="{ font: String(resolved[token.id]) }">
          {{ token.label }} — The quick brown fox
        </p>
        <code>{{ token.id }}</code>
      </article>
    </div>

    <div v-else-if="category === 'spacing' || category === 'radius'" class="stack">
      <article v-for="token in tokens" :key="token.id" class="row metric">
        <div
          class="metric-box"
          :style="
            category === 'spacing'
              ? { width: typeof resolved[token.id] === 'number' ? `${resolved[token.id]}px` : String(resolved[token.id]), height: '16px' }
              : { width: '64px', height: '64px', borderRadius: typeof resolved[token.id] === 'number' ? `${resolved[token.id]}px` : String(resolved[token.id]) }
          "
        />
        <div>
          <strong>{{ token.label }}</strong>
          <code>{{ token.id }}</code>
          <span>{{ resolved[token.id] }}</span>
        </div>
      </article>
    </div>

    <div v-else class="stack">
      <article v-for="token in tokens" :key="token.id" class="row">
        <div
          class="elevation-box"
          :style="{ boxShadow: String(resolved[token.id]) }"
        />
        <div>
          <strong>{{ token.label }}</strong>
          <code>{{ token.id }}</code>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.token-gallery {
  width: min(920px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 24px;
  font-size: 1.75rem;
}
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.swatch,
.row {
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.swatch {
  display: grid;
  gap: 6px;
}
.swatch-chip,
.metric-box,
.elevation-box {
  background: rgb(var(--v-theme-primary));
}
.swatch-chip {
  height: 72px;
  border-radius: 10px;
}
.stack {
  display: grid;
  gap: 10px;
}
.metric {
  display: flex;
  gap: 12px;
  align-items: center;
}
.metric-box {
  flex: 0 0 auto;
  border-radius: 4px;
}
.elevation-box {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
code,
span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}
</style>
