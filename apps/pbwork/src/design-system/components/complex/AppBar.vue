<script setup lang="ts">
defineProps<{
  title: string;
  dense?: boolean;
}>();
</script>

<template>
  <v-app-bar
    data-pb-id="ds.app-bar"
    data-pb-role="app-bar"
    class="app-bar"
    :density="dense ? 'compact' : 'default'"
    flat
    border
  >
    <v-app-bar-title>{{ title }}</v-app-bar-title>
    <template #append><slot name="append" /></template>
  </v-app-bar>
</template>
