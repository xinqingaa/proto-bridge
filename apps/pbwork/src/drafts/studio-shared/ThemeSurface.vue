<script setup lang="ts">
import { computed, provide } from "vue";
import {
  ThemeTableKey,
  useRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { useRuntimeVuetifyTheme } from "@/design-system/theme/vuetify-theme";
import { coercePackSelection } from "@/design-system/theme/presentation";
import type { Mode } from "./themes";
const props = defineProps<{
  packId: string;
  theme: string;
  mode: Mode;
  device?: boolean;
}>();
const active = useRuntimeTheme(() =>
  coercePackSelection(props.packId, props.theme, props.mode),
);
provide(ThemeTableKey, active.table);
const vuetify = useRuntimeVuetifyTheme(active.table);
// Only the preview's CSS rendering changes reference frames. Core tables stay untouched.
const style = computed(() =>
  props.device
    ? Object.fromEntries(
        Object.entries(active.cssVars.value).map(([k, v]) => [
          k,
          String(v)
            .replace(/(\d+(?:\.\d+)?)(?:dvh|svh|lvh|vh)\b/g, "$1cqh")
            .replace(/(\d+(?:\.\d+)?)(?:dvw|svw|lvw|vw)\b/g, "$1cqw"),
        ]),
      )
    : active.cssVars.value,
);
const defaults = computed(() =>
  Object.fromEntries(
    ["VTextField", "VTextarea", "VSelect"].map((k) => [
      k,
      { density: active.density.value },
    ]),
  ),
);
</script>
<template>
  <div class="pvs-surface" :style="style" v-bind="active.attributes.value">
    <v-theme-provider :theme="vuetify" class="pvs-theme"
      ><v-defaults-provider :defaults="defaults"><slot /></v-defaults-provider
    ></v-theme-provider>
  </div>
</template>
