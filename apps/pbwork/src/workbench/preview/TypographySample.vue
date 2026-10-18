<script setup lang="ts">
import { computed } from "vue";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import { normalizeTokenCssVarName } from "@/design-system/theme/presentation";
const roles = computed(() =>
  runtimeThemeSources.keyCatalog.keys.filter(
    (key) => key.valueType === "typography",
  ),
);
const tracking = computed(() => runtimeThemeSources.keyCatalog.keys.filter(key => key.id.startsWith("tracking.")));
</script>
<template>
  <div class="type-sample">
    <h2>字体与字阶</h2>
    <p>全部字阶按当前主题的字体、字号、字重与行高实际渲染。</p>
    <section v-for="key in roles" :key="key.id" :data-typography-key="key.id">
      <header>
        <strong>{{ key.label ?? key.id }}</strong
        ><code>{{ key.id }}</code>
      </header>
      <div
        class="type-example"
        :style="{
          font: `var(${normalizeTokenCssVarName(key.id)})`,
          fontVariantNumeric: `var(${normalizeTokenCssVarName(key.id)}-variant-numeric)`,
        }"
      >
        <template v-if="key.id.startsWith('typography.numeric-')"
          >12:34<br />1,280.50</template
        >
        <template v-else>把时间留给重要的事<br />Today, 09:41</template>
      </div>
    </section>
    <section v-for="key in tracking" :key="key.id" :data-typography-key="key.id">
      <header><strong>{{key.label}}</strong><code>{{key.id}}</code></header>
      <div :style="{letterSpacing: `var(${normalizeTokenCssVarName(key.id)})`}">把时间留给重要的事<br />Today, 09:41</div>
    </section>
  </div>
</template>
<style scoped>
.type-sample {
  padding: var(--pb-spacing-md);
  color: var(--pb-color-on-background);
  font: var(--pb-typography-content);
}
h2 {
  font: var(--pb-typography-title);
  margin: 0;
}
p {
  color: var(--pb-color-on-surface-muted);
}
section {
  padding-block: var(--pb-spacing-md);
  border-bottom: var(--pb-border-hairline);
}
header {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  margin-bottom: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
code {
  font: inherit;
}
.type-example {
  overflow-wrap: anywhere;
}
</style>
