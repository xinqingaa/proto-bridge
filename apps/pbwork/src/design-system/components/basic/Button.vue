<script setup lang="ts">
defineProps<{
  label: string;
  variant?: "flat" | "tonal" | "outlined" | "text";
  disabled?: boolean;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
  <v-btn
    data-pb-id="ds.button"
    :variant="variant ?? 'flat'"
    color="primary"
    :disabled="disabled ?? false"
    @click="$emit('click')"
  >
    {{ label }}
  </v-btn>
</template>
