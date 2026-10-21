<script setup lang="ts">
import { computed } from "vue";
import { resolvePbIcon } from "@/design-system/components/_shared/icons";
const BookOpen = resolvePbIcon("book-open");
const Footprints = resolvePbIcon("footprints");
const GlassWater = resolvePbIcon("glass-water");
const Leaf = resolvePbIcon("leaf");
const Moon = resolvePbIcon("moon");
const StretchHorizontal = resolvePbIcon("stretch-horizontal");
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
</script>
<template>
  <component :is="glyph" :size="size" aria-hidden="true" />
</template>
