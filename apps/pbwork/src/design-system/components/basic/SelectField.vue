<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const props = defineProps<{ label: string; modelValue?: string; options?: string[]; disabled?: boolean }>();
defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const { label, modelValue, options, disabled } = toRefs(props);
usePbInspect({ element: rootRef, pbId: "ds.select", componentId: "select", getProps: () => ({ label: label.value, modelValue: modelValue.value ?? "", options: options.value ?? [], disabled: disabled.value ?? false }), getTokens: () => ["color.surface", "color.border", "color.on-surface", "color.primary", "radius.md", "sizing.control-md", "typography.content"], getTokenBindings: () => ({ surface: "color.surface", border: "color.border", focus: "color.primary", radius: "radius.md", height: "sizing.control-md", text: "typography.content" }) });
</script>
<template><label ref="rootRef" class="pb-field" data-pb-id="ds.select"><span>{{ label }}</span><select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"><option v-for="item in options ?? ['选项一', '选项二']" :key="item" :value="item">{{ item }}</option></select></label></template>
<style scoped>.pb-field{display:grid;gap:6px;color:var(--pb-color-on-surface);font:var(--pb-typography-content)}.pb-field span{font:var(--pb-typography-caption)}select{min-height:var(--pb-sizing-control-md,40px);padding:0 12px;border:1px solid var(--pb-color-border);border-radius:var(--pb-radius-md);background:var(--pb-color-surface);color:inherit}select:focus{outline:2px solid var(--pb-color-primary);outline-offset:1px}</style>
