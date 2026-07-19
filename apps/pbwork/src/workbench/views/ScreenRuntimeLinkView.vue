<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
  loadPrototypes,
  loadPrototypeScreens,
} from "@/design-system/loaders";
import { buildCanonicalRuntimeUrl } from "@/runtime/url";

const props = defineProps<{
  prototypeId: string;
  screenSlug: string;
}>();

const route = useRoute();

const prototype = computed(() =>
  loadPrototypes().find((item) => item.id === props.prototypeId),
);
const screen = computed(() =>
  loadPrototypeScreens().find(
    (item) =>
      item.prototypeId === props.prototypeId &&
      item.screenSlug === props.screenSlug,
  ),
);

const selectedVariantId = computed(() => {
  const fromQuery = route.query.variant;
  if (typeof fromQuery === "string") return fromQuery;
  return screen.value?.defaultVariantId ?? "default";
});

const selectedThemeId = computed(() => {
  const fromQuery = route.query.theme;
  if (typeof fromQuery === "string") return fromQuery;
  return prototype.value?.defaultThemeId ?? "light";
});

const runtimeHref = computed(() => {
  if (!prototype.value || !screen.value) return "#";
  const variant =
    screen.value.variants.find((item) => item.id === selectedVariantId.value) ??
    screen.value.variants.find(
      (item) => item.id === screen.value!.defaultVariantId,
    )!;
  return buildCanonicalRuntimeUrl({
    prototypeId: prototype.value.id,
    screenSlug: screen.value.screenSlug,
    variantId: variant.id,
    themeId: selectedThemeId.value,
    ...(variant.query ? { query: variant.query } : {}),
  });
});
</script>

<template>
  <section v-if="prototype && screen" class="screen-link">
    <header>
      <p>{{ prototype.label }}</p>
      <h1>{{ screen.label }}</h1>
      <p class="path">{{ screen.path }}</p>
    </header>

    <v-alert type="info" variant="tonal" class="mb-4">
      M2 使用 A1：此处为页面概要。完整手机画板将在 M3 提供。请用下方按钮在新标签打开纯
      Runtime URL。
    </v-alert>

    <div class="meta-grid">
      <div>
        <h2>Variants</h2>
        <v-list density="compact">
          <v-list-item
            v-for="variant in screen.variants"
            :key="variant.id"
            :title="variant.label"
            :subtitle="variant.id"
            :active="variant.id === selectedVariantId"
            :to="{
              path: `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`,
              query: { variant: variant.id, theme: selectedThemeId },
            }"
          />
        </v-list>
      </div>
      <div>
        <h2>当前选择</h2>
        <p>Variant：{{ selectedVariantId }}</p>
        <p>Theme：{{ selectedThemeId }}</p>
        <code>{{ runtimeHref }}</code>
        <div class="actions">
          <v-btn
            color="primary"
            :href="runtimeHref"
            target="_blank"
            rel="noopener"
          >
            在新标签打开 Runtime
          </v-btn>
        </div>
      </div>
    </div>
  </section>
  <v-alert v-else type="error" variant="tonal">
    未知 Screen：{{ prototypeId }}/{{ screenSlug }}
  </v-alert>
</template>

<style scoped>
.screen-link {
  width: min(920px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
}
.path,
code {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8125rem;
}
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.meta-grid > div {
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
h2 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}
.actions {
  margin-top: 12px;
}
@media (max-width: 800px) {
  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
