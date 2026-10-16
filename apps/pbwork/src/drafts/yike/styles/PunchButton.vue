<script setup lang="ts">
import { Check } from "lucide-vue-next";
import type { SampleHabit, StyleDirectionId } from "./sample";

defineProps<{ theme: StyleDirectionId; habit: SampleHabit; done: boolean }>();
</script>

<template>
  <button
    type="button"
    class="y-punch"
    :class="{ 'is-done': done }"
    :aria-pressed="done"
    :aria-label="`${habit.name}今天打卡`"
  >
    <Check v-if="theme === 'mechanical'" aria-hidden="true" />
    <i v-else-if="theme === 'water'" aria-hidden="true" />
    <span v-else aria-hidden="true">{{ habit.mark }}</span>
  </button>
</template>
