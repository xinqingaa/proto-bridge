<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { draftRecords } from "@/drafts/registry";
import {
  type PrototypeLifecycle,
  type TokenCategory,
} from "@/design-system/types";

const TokenGallery = defineAsyncComponent(
  () => import("@/workbench/views/TokenGallery.vue"),
);
const ThemePreview = defineAsyncComponent(
  () => import("@/workbench/views/ThemePreview.vue"),
);
const ComponentPlayground = defineAsyncComponent(
  () => import("@/workbench/views/ComponentPlayground.vue"),
);
const PrototypeOverview = defineAsyncComponent(
  () => import("@/workbench/views/PrototypeOverview.vue"),
);
const PrototypeGallery = defineAsyncComponent(
  () => import("@/workbench/views/PrototypeGallery.vue"),
);
const PhoneCanvasView = defineAsyncComponent(
  () => import("@/workbench/canvas/PhoneCanvasView.vue"),
);

const props = defineProps<{
  kind:
    | "token"
    | "theme"
    | "component"
    | "prototype-list"
    | "prototype"
    | "screen"
    | "draft";
  category?: TokenCategory;
  themeId?: string;
  componentId?: string;
  lifecycle?: "all" | PrototypeLifecycle;
  prototypeId?: string;
  screenSlug?: string;
}>();

const draftComponent = computed(() => {
  const draft = draftRecords.find((record) => record.id === props.prototypeId);
  return draft ? defineAsyncComponent(draft.load) : null;
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
  <PhoneCanvasView
    v-else-if="kind === 'screen' && prototypeId && screenSlug"
    :prototype-id="prototypeId"
    :screen-slug="screenSlug"
  />
  <PrototypeGallery
    v-else-if="kind === 'prototype-list'"
    :lifecycle="lifecycle"
  />
  <component :is="draftComponent" v-else-if="kind === 'draft' && draftComponent" />
</template>
