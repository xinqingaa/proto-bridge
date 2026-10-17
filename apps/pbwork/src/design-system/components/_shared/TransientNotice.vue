<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    timeout: number;
    attach?: string;
    contentClass?: string;
  }>(),
  { attach: ".runtime-app" },
);
defineEmits<{ "update:modelValue": [boolean] }>();
</script>
<template>
  <v-snackbar
    :model-value="modelValue"
    :timeout="timeout"
    :attach="attach"
    :content-class="contentClass"
    absolute
    location="bottom"
    multi-line
    @update:model-value="$emit('update:modelValue', Boolean($event))"
    ><slot
  /></v-snackbar>
</template>
