<script setup lang="ts">
import Button from "@/design-system/components/action/Button.vue";
withDefaults(
  defineProps<{
    label: string;
    inspectId: string;
    kind?: "primary" | "secondary" | "danger" | "quiet";
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    type?: "button" | "submit";
  }>(),
  { kind: "primary", type: "button" },
);
defineEmits<{ click: [] }>();
</script>
<template>
  <Button
    :label="label"
    :inspect-id="inspectId"
    :type="type ?? 'button'"
    :kind="
      kind === 'primary'
        ? 'accent'
        : kind === 'secondary'
          ? 'outlined'
          : (kind ?? 'accent')
    "
    :material="kind === 'primary' || kind === 'quiet' ? 'solid' : 'glass'"
    shape="pill"
    size="lg"
    :disabled="Boolean(disabled)"
    :loading="Boolean(loading)"
    :ripple="false"
    :block="Boolean(block)"
    @click="$emit('click')"
  />
</template>
