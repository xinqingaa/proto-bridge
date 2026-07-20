<script setup lang="ts">
import TokenGallery from "@/workbench/views/TokenGallery.vue";
import ThemePreview from "@/workbench/views/ThemePreview.vue";
import ComponentPlayground from "@/workbench/views/ComponentPlayground.vue";
import PrototypeOverview from "@/workbench/views/PrototypeOverview.vue";
import PrototypeGallery from "@/workbench/views/PrototypeGallery.vue";
import PhoneCanvasView from "@/workbench/canvas/PhoneCanvasView.vue";
import { type PrototypeLifecycle, type TokenCategory } from "@/design-system/types";

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
  <PrototypeGallery v-else-if="kind === 'prototype-list'" :lifecycle="lifecycle" />
</template>
