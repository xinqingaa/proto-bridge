<script setup lang="ts">
import { computed, ref, toRefs, useSlots } from "vue";
import Icon from "@/design-system/components/action/Icon.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label?: string;
  showLabel?: boolean;
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  type?: "text" | "password";
  autocomplete?:
    | "name"
    | "username"
    | "current-password"
    | "new-password"
    | "off";
  errorMessage?: string;
  revealable?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.text-field`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();

const slots = useSlots();
const rootRef = usePbInspectRef();
const {
  label,
  showLabel,
  modelValue,
  placeholder,
  disabled,
  clearable,
  type,
  autocomplete,
  errorMessage,
  revealable,
  inspectId,
} = toRefs(props);
const passwordVisible = ref(false);

const labeled = computed(() => showLabel.value === true);
const fieldVariant = computed(() =>
  labeled.value ? "outlined" : "solo-filled",
);
const resolvedType = computed(() => {
  if (type.value !== "password") return "text";
  return revealable.value && passwordVisible.value ? "text" : "password";
});
const canReveal = computed(
  () => type.value === "password" && revealable.value === true,
);

usePbInspect({
  element: rootRef,
  pbId: "ds.text-field",
  instanceId: inspectId,
  componentId: "text-field",
  getProps: () => ({
    label: label.value ?? "",
    showLabel: labeled.value,
    modelValue: modelValue.value ?? "",
    placeholder: placeholder.value ?? "",
    disabled: disabled.value ?? false,
    clearable: clearable.value ?? false,
    type: type.value ?? "text",
    autocomplete: autocomplete.value ?? "off",
    errorMessage: errorMessage.value ?? "",
    revealable: revealable.value ?? false,
    passwordVisible: passwordVisible.value,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    border: "color.border",
    surface: "color.surface",
    radius: "radius.md",
    height: "sizing.control-md",
    label: "typography.caption",
    input: "typography.content",
    errorColor: "color.error",
    errorText: "typography.caption",
    revealColor: "color.on-surface-muted",
    revealSize: "sizing.icon-md",
    revealTarget: "sizing.touch",
    disabledOpacity: "opacity.disabled",
  }),
  getTokens: () => [
    "color.border",
    "color.surface",
    "color.on-surface",
    "radius.md",
    "sizing.control-md",
    "typography.caption",
    "typography.content",
    "color.error",
    "color.on-surface-muted",
    "sizing.icon-md",
    "sizing.touch",
    "spacing.xs",
    "spacing.md",
    "opacity.disabled",
  ],
});
</script>

<template>
  <v-text-field
    ref="rootRef"
    class="pb-field radius-md"
    :class="{ 'is-plain': !labeled, 'is-labeled': labeled }"
    data-pb-id="ds.text-field"
    data-pb-role="field"
    :label="labeled ? (label ?? '') : undefined"
    :hide-details="!errorMessage"
    :flat="!labeled"
    :variant="fieldVariant"
    :type="resolvedType"
    :autocomplete="autocomplete ?? 'off'"
    :model-value="modelValue ?? ''"
    :placeholder="placeholder ?? ''"
    :disabled="disabled ?? false"
    :clearable="clearable ?? false"
    :error="Boolean(errorMessage)"
    :error-messages="errorMessage ? [errorMessage] : []"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
    @click:clear="$emit('update:modelValue', '')"
  >
    <template v-if="slots['prepend-inner']" #prepend-inner>
      <slot name="prepend-inner" />
    </template>
    <template v-if="canReveal || slots['append-inner']" #append-inner>
      <button
        v-if="canReveal"
        class="pb-field__reveal"
        type="button"
        :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
        :aria-pressed="passwordVisible"
        @click="passwordVisible = !passwordVisible"
      >
        <Icon
          :name="passwordVisible ? 'eye-off' : 'eye'"
          size="md"
          tone="muted"
        />
      </button>
      <slot v-else name="append-inner" />
    </template>
  </v-text-field>
</template>

<style scoped>
.pb-field {
  font: var(--pb-typography-content);
}
.pb-field :deep(.v-field) {
  min-height: var(--pb-sizing-control-md);
  background: var(--pb-color-surface);
}
.pb-field :deep(.v-field__input) {
  min-height: var(--pb-sizing-control-md);
}
.pb-field.is-plain :deep(.v-field) {
  box-shadow: none;
}
.pb-field.is-plain :deep(.v-field__outline) {
  display: none;
}
.pb-field.radius-sm :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-sm);
  border-radius: var(--pb-radius-sm);
}
.pb-field.radius-md :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-md);
  border-radius: var(--pb-radius-md);
}
.pb-field.radius-lg :deep(.v-field) {
  --v-field-border-radius: var(--pb-radius-lg);
  border-radius: var(--pb-radius-lg);
}
.pb-field.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
.pb-field :deep(.v-messages) {
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
.pb-field__reveal {
  display: inline-flex;
  min-width: var(--pb-sizing-touch);
  min-height: var(--pb-sizing-touch);
  align-items: center;
  justify-content: center;
  padding: var(--pb-spacing-none);
  border: none;
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  cursor: pointer;
}
</style>
