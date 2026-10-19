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
  <div class="pb-sheet-top">
    <div class="pb-sheet-grip" aria-hidden="true" />
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
        <slot v-else name="start" />
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
  </div>
</template>

<style scoped>
.pb-sheet-top {
  display: flex;
  flex-direction: column;
}
.pb-sheet-grip {
  width: var(--pb-spacing-2xl);
  height: var(--pb-size-indicator);
  align-self: center;
  margin-top: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-pill);
  background: var(--pb-color-outline);
}
.pb-sheet-header {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm) var(--pb-spacing-md) var(--pb-spacing-md);
}
.pb-sheet-header-side {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  align-items: center;
  min-width: var(--pb-size-touch);
}
.pb-sheet-header-start {
  justify-content: flex-start;
}
.pb-sheet-header-end {
  justify-content: flex-end;
}
.pb-sheet-header-title {
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-layout-zero);
  margin: var(--pb-layout-zero);
  overflow: hidden;
  font: var(--pb-typography-subtitle);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
