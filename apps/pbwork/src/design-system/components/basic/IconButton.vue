<script setup lang="ts">
import { MoreHorizontal } from "lucide-vue-next";

defineProps<{
  ariaLabel: string;
  disabled?: boolean;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
  <v-btn
    data-pb-id="ds.icon-button"
    icon
    variant="text"
    :aria-label="ariaLabel"
    :disabled="disabled ?? false"
    @click="$emit('click')"
  >
    <MoreHorizontal :size="18" />
  </v-btn>
</template>
