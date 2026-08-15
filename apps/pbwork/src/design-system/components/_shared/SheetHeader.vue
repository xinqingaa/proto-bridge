<script setup lang="ts">
import IconButton from "@/design-system/components/action/IconButton.vue";

const props = defineProps<{
  title: string;
  showBack?: boolean;
  inspectId?: string;
}>();

defineEmits<{
  back: [];
  close: [];
}>();
</script>

<template>
  <header class="pb-sheet-header">
    <div class="pb-sheet-header-side pb-sheet-header-start">
      <IconButton
        v-if="props.showBack"
        ariaLabel="返回"
        icon="chevron-left"
        size="sm"
        v-bind="
          props.inspectId ? { inspectId: `${props.inspectId}.back` } : {}
        "
        @click="$emit('back')"
      />
    </div>
    <h2 class="pb-sheet-header-title">{{ props.title }}</h2>
    <div class="pb-sheet-header-side pb-sheet-header-end">
      <IconButton
        ariaLabel="关闭"
        icon="x"
        size="sm"
        v-bind="
          props.inspectId ? { inspectId: `${props.inspectId}.close` } : {}
        "
        @click="$emit('close')"
      />
    </div>
  </header>
</template>

<style scoped>
.pb-sheet-header {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
}
.pb-sheet-header-side {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  align-items: center;
  min-width: var(--pb-sizing-touch);
}
.pb-sheet-header-start {
  justify-content: flex-start;
}
.pb-sheet-header-end {
  justify-content: flex-end;
}
.pb-sheet-header-title {
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  margin: var(--pb-spacing-none);
  overflow: hidden;
  font: var(--pb-typography-subtitle);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
