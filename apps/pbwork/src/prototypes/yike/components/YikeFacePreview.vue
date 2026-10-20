<script setup lang="ts">
import { provide } from "vue";
import {
  ThemeTableKey,
  useRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import type { YikeFace } from "../model";
import YikeDial from "./YikeDial.vue";
const props = defineProps<{
  face: YikeFace;
  mode: "light" | "dark";
  inspectId: string;
}>();
const { table, cssVars } = useRuntimeTheme(() => ({
  packId: "yike",
  theme: props.face,
  mode: props.mode,
}));
provide(ThemeTableKey, table);
</script>
<template>
  <span class="face-preview" :style="cssVars"
    ><YikeDial
      :face="face"
      :fraction="12.57 / 60"
      digits="12:34"
      caption=""
      :inspect-id="inspectId"
  /></span>
</template>
<style scoped>
.face-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--pb-size-brand);
  block-size: var(--pb-size-brand);
  max-inline-size: var(--pb-layout-fill);
}
.face-preview > svg {
  inline-size: var(--pb-layout-fill);
  block-size: var(--pb-layout-fill);
}
</style>
