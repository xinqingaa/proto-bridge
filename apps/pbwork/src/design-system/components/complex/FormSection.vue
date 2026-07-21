<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import Button from "@/design-system/components/basic/Button.vue";

const props = defineProps<{
  title: string;
  description?: string;
  required?: boolean;
  actionLabel?: string;
}>();
defineEmits<{ action: [] }>();

const rootRef = usePbInspectRef();
const { title, description, required, actionLabel } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.form-section",
  componentId: "form-section",
  getProps: () => ({
    title: title.value,
    description: description.value ?? "",
    required: required.value ?? false,
    actionLabel: actionLabel.value ?? "",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "color.on-surface-muted",
    "radius.lg",
    "spacing.md",
    "typography.subtitle",
  ],
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    title: "color.on-surface",
    description: "color.on-surface-muted",
    radius: "radius.lg",
    padding: "spacing.md",
    typography: "typography.subtitle",
  }),
});
</script>

<template>
  <v-card
    ref="rootRef"
    class="pb-form-section section"
    data-pb-id="ds.form-section"
    data-pb-role="section"
    variant="outlined"
  >
    <v-card-item>
      <template #title>
        <h3>
          {{ title }}
          <em v-if="required">必填</em>
        </h3>
      </template>
      <template v-if="description" #subtitle>
        {{ description }}
      </template>
      <template #append>
        <slot name="action">
          <Button
            v-if="actionLabel"
            :label="actionLabel"
            variant="text"
            size="sm"
            @click="$emit('action')"
          />
        </slot>
      </template>
    </v-card-item>
    <v-card-text class="form-content">
      <slot>在此放置表单控件</slot>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.pb-form-section {
  padding: 0;
  border-color: var(--pb-color-border) !important;
  border-radius: var(--pb-radius-lg) !important;
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
}
.pb-form-section h3 {
  margin: 0;
  font: var(--pb-typography-subtitle);
}
.pb-form-section em {
  margin-left: var(--pb-spacing-xs);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
  font-style: normal;
}
.pb-form-section :deep(.v-card-subtitle) {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  opacity: 1;
}
.form-content {
  display: grid;
  gap: var(--pb-spacing-sm-plus);
  padding-top: 0;
}
</style>
