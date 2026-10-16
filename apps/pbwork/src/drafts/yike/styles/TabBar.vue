<script setup lang="ts">
import { SAMPLE_TABS } from "./sample";

defineProps<{ active: number }>();
</script>

<template>
  <nav class="y-tabbar" aria-label="主导航">
    <span
      v-for="(item, index) in SAMPLE_TABS"
      :key="item"
      :class="{ 'is-active': index === active }"
      :aria-current="index === active ? 'page' : undefined"
    >
      {{ item }}
    </span>
  </nav>
</template>
