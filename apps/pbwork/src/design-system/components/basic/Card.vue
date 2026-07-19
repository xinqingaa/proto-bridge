<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <v-card
    data-pb-id="ds.card"
    data-pb-role="section"
    class="section card"
    variant="outlined"
  >
    <v-card-title>{{ title }}</v-card-title>
    <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    <v-card-text><slot /></v-card-text>
  </v-card>
</template>
