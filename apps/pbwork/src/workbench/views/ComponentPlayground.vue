<script setup lang="ts">
import { previewExtensions } from "@/workbench/preview/extensions/registry";
import ComponentPreview from "@/workbench/preview/ComponentPreview.vue";
import { componentRecords } from "@/design-system/components/registry";
defineProps<{ componentId: string }>();
</script>
<template>
  <ComponentPreview
    v-if="
      componentRecords.some((record) => record.id === componentId) ||
      previewExtensions.some((entry) => entry.id === componentId)
    "
    :key="componentId"
    :component-id="componentId"
  /><v-alert v-else type="error">未知组件：{{ componentId }}</v-alert>
</template>
