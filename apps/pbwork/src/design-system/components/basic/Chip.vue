<script setup lang="ts">
defineProps<{
  label: string;
  color?: string;
}>();
</script>

<template>
  <v-chip data-pb-id="ds.chip" :color="color ?? 'primary'" size="small">
    {{ label }}
  </v-chip>
</template>
