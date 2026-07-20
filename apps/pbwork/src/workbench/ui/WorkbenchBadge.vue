<script setup lang="ts">
withDefaults(defineProps<{ tone?: "neutral" | "comment" | "success" }>(), { tone: "neutral" });
</script>

<template><span class="wb-badge" :class="`is-${tone}`"><slot /></span></template>

<style scoped>
.wb-badge { display:inline-flex; min-width:18px; height:18px; align-items:center; justify-content:center; padding:0 5px; border-radius:999px; background:rgba(var(--v-theme-on-surface),.07); color:rgba(var(--v-theme-on-surface),.62); font-size:.625rem; font-weight:800; }
.wb-badge.is-comment { background:color-mix(in srgb,rgb(var(--v-theme-warning)) 16%,transparent); color:color-mix(in srgb,rgb(var(--v-theme-warning)) 76%,rgb(var(--v-theme-on-surface))); }
.wb-badge.is-success { background:color-mix(in srgb,rgb(var(--v-theme-success)) 14%,transparent); color:rgb(var(--v-theme-success)); }
</style>
