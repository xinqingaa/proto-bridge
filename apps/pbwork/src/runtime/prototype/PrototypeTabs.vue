<script setup lang="ts">
import type { Component } from "vue";
import TabViewport from "@/design-system/components/navigation/TabViewport.vue";
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
import { themeConstantNumber } from "@/design-system/theme/constants";
defineProps<{
  modelValue: string;
  inspectId: string;
  items: Array<{ value: string; label: string; icon: Component }>;
}>();
defineEmits<{ "update:modelValue": [string] }>();
const duration = themeConstantNumber("motion.duration-instant");
</script>
<template>
  <div class="prototype-tabs">
    <TabViewport
      :model-value="modelValue"
      :items="items"
      :swipe="false"
      :mouse-swipe="false"
      :keep-mounted="true"
      :transition-duration="duration"
      :inspect-id="`${inspectId}.viewport`"
    >
      <template v-for="item in items" :key="item.value" #[item.value]
        ><slot :name="item.value"
      /></template>
    </TabViewport>
    <Tabbar
      :model-value="modelValue"
      :items="items"
      :inspect-id="`${inspectId}.navigation`"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>
<style scoped>
.prototype-tabs {
  display: flex;
  flex-direction: column;
  height: var(--pb-layout-fill);
  min-height: var(--pb-layout-zero);
}
</style>
