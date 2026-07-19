<script setup lang="ts">
import Button from "@/design-system/components/basic/Button.vue";

defineProps<{
  title: string;
  modelValue?: boolean;
}>();
defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <div
    v-if="modelValue"
    class="pb-sheet-overlay"
    @click.self="$emit('update:modelValue', false)"
  >
    <section
      class="pb-sheet sheet"
      data-pb-id="ds.bottom-sheet"
      data-pb-shell="sheet"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <header class="pb-sheet-header">
        <h3>{{ title }}</h3>
        <Button
          label="关闭"
          variant="text"
          tone="secondary"
          @click="$emit('update:modelValue', false)"
        />
      </header>
      <div class="pb-sheet-body"><slot /></div>
    </section>
  </div>
</template>

<style scoped>
.pb-sheet-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
}
.pb-sheet {
  width: min(480px, 100%);
  max-height: 70vh;
  overflow: auto;
  border-radius: var(--pb-radius-lg, 16px) var(--pb-radius-lg, 16px) 0 0;
  background: var(--pb-color-surface, #fff);
  color: var(--pb-color-on-surface, #1f2937);
  box-shadow: var(--pb-elevation-raised, none);
}
.pb-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: var(--pb-spacing-md, 16px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
}
.pb-sheet-header h3 {
  margin: 0;
  font: var(--pb-typography-subtitle, 600 16px/1.4 Inter, system-ui, sans-serif);
}
.pb-sheet-body {
  padding: var(--pb-spacing-md, 16px);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
</style>
