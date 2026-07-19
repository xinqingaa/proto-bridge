<script setup lang="ts">
defineProps<{
  modelValue?: string;
  items: Array<{ value: string; label: string }>;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div data-pb-id="ds.tabs" data-pb-role="tab-bar" class="tab-bar">
    <v-tabs
      :model-value="modelValue"
      color="primary"
      @update:model-value="$emit('update:modelValue', String($event))"
    >
      <v-tab v-for="item in items" :key="item.value" :value="item.value">
        {{ item.label }}
      </v-tab>
    </v-tabs>
  </div>
</template>
