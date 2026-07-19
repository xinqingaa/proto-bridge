<script setup lang="ts">
import { computed } from "vue";
import TokenGallery from "@/workbench/views/TokenGallery.vue";
import ThemePreview from "@/workbench/views/ThemePreview.vue";
import ComponentPlayground from "@/workbench/views/ComponentPlayground.vue";
import PrototypeOverview from "@/workbench/views/PrototypeOverview.vue";
import ScreenRuntimeLinkView from "@/workbench/views/ScreenRuntimeLinkView.vue";
import { loadPrototypes } from "@/design-system/loaders";
import { LIFECYCLE_LABELS, type PrototypeLifecycle, type TokenCategory } from "@/design-system/types";

const props = defineProps<{
  kind:
    | "token"
    | "theme"
    | "component"
    | "prototype-list"
    | "prototype"
    | "screen";
  category?: TokenCategory;
  themeId?: string;
  componentId?: string;
  lifecycle?: "all" | PrototypeLifecycle;
  prototypeId?: string;
  screenSlug?: string;
}>();

const lifecyclePrototypes = computed(() => {
  const all = loadPrototypes();
  if (!props.lifecycle || props.lifecycle === "all") return all;
  return all.filter((item) => item.lifecycle === props.lifecycle);
});
</script>

<template>
  <TokenGallery v-if="kind === 'token' && category" :category="category" />
  <ThemePreview v-else-if="kind === 'theme' && themeId" :theme-id="themeId" />
  <ComponentPlayground
    v-else-if="kind === 'component' && componentId"
    :component-id="componentId"
  />
  <PrototypeOverview
    v-else-if="kind === 'prototype' && prototypeId"
    :prototype-id="prototypeId"
  />
  <ScreenRuntimeLinkView
    v-else-if="kind === 'screen' && prototypeId && screenSlug"
    :prototype-id="prototypeId"
    :screen-slug="screenSlug"
  />
  <section v-else-if="kind === 'prototype-list'" class="proto-list">
    <header>
      <p>原型</p>
      <h1>
        {{
          lifecycle && lifecycle !== "all"
            ? LIFECYCLE_LABELS[lifecycle]
            : "全部原型"
        }}
      </h1>
    </header>
    <v-list lines="two">
      <v-list-item
        v-for="item in lifecyclePrototypes"
        :key="item.id"
        :title="item.label"
        :subtitle="LIFECYCLE_LABELS[item.lifecycle]"
        :to="`/workbench/prototypes/${item.id}`"
      />
      <v-list-item
        v-if="lifecyclePrototypes.length === 0"
        title="此生命周期下暂无原型"
      />
    </v-list>
  </section>
</template>

<style scoped>
.proto-list {
  width: min(760px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 20px;
  font-size: 1.75rem;
}
</style>
