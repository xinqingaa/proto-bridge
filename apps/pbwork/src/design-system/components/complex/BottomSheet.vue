<script setup lang="ts">
defineProps<{
  title: string;
  modelValue?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue ?? false"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  >
    <v-card
      data-pb-id="ds.bottom-sheet"
      data-pb-shell="sheet"
      class="sheet"
      rounded="t-lg"
    >
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text><slot /></v-card-text>
    </v-card>
  </v-bottom-sheet>
</template>
