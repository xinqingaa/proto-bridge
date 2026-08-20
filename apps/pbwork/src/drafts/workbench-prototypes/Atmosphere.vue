<script setup lang="ts">
defineProps<{
  compact?: boolean;
}>();
</script>

<template>
  <div class="wbp-atm" :class="{ 'is-compact': compact }" aria-hidden="true">
    <i class="wbp-atm-ground" />
    <i class="wbp-atm-glow" />
    <i class="wbp-atm-mist" />
    <i class="wbp-atm-orbit" />
  </div>
</template>
