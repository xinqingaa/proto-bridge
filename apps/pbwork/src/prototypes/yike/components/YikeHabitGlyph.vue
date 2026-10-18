<script setup lang="ts">
import { computed } from "vue";
import {
  BookOpen,
  Footprints,
  GlassWater,
  Leaf,
  Moon,
  StretchHorizontal,
} from "lucide-vue-next";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
export type YikeHabitIcon =
  "leaf" | "book" | "water" | "run" | "moon" | "stretch";
const props = defineProps<{ icon: YikeHabitIcon }>();
const glyph = computed(
  () =>
    ({
      leaf: Leaf,
      book: BookOpen,
      water: GlassWater,
      run: Footprints,
      moon: Moon,
      stretch: StretchHorizontal,
    })[props.icon],
);
const size = useTokenNumber("size.icon");
const stroke = useTokenNumber("border.width-strong");
</script>
<template>
  <component
    :is="glyph"
    :size="size"
    :stroke-width="stroke"
    aria-hidden="true"
  />
</template>
