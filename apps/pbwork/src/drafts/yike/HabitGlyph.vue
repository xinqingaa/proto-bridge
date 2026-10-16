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
import type { HabitIcon } from "./model";

const props = defineProps<{ icon: HabitIcon }>();

const component = computed(
  () =>
    ({
      book: BookOpen,
      water: GlassWater,
      run: Footprints,
      moon: Moon,
      stretch: StretchHorizontal,
      leaf: Leaf,
    })[props.icon],
);
</script>

<template>
  <component :is="component" aria-hidden="true" />
</template>
