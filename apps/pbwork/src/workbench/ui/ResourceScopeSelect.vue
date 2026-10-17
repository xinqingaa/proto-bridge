<script setup lang="ts">
import { computed } from "vue";
import { loadPrototypes } from "@/design-system/loaders";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import WorkbenchSelect from "./WorkbenchSelect.vue";

export type ResourceScope =
  | { kind: "foundation" }
  | { kind: "sample"; packId: string }
  | { kind: "prototype"; id: string; packId: string };

const props = defineProps<{
  modelValue: ResourceScope;
  label?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ResourceScope];
}>();

const prototypes = loadPrototypes();
const samplePackIds = ["pbwork-sample"]; // Hard-coded list of sample packs

type SelectItem = {
  value: string;
  label: string;
  group?: string;
};

const items = computed((): SelectItem[] => [
  { value: "foundation", label: "基础 DS", group: "系统资源" },
  ...samplePackIds.map((packId) => {
    const manifest = runtimeThemeSources.packs.get(packId)?.manifest;
    return {
      value: `sample:${packId}`,
      label: `${manifest?.label ?? packId} · 演示`,
      group: "演示主题包",
    };
  }),
  ...prototypes.map((p) => ({
    value: `prototype:${p.id}`,
    label: `${p.label} · 原型`,
    group: "原型资源",
  })),
]);

const selectedValue = computed(() => {
  if (props.modelValue.kind === "foundation") return "foundation";
  if (props.modelValue.kind === "sample")
    return `sample:${props.modelValue.packId}`;
  return `prototype:${props.modelValue.id}`;
});

function handleUpdate(value: string) {
  if (value === "foundation") {
    emit("update:modelValue", { kind: "foundation" });
    return;
  }
  if (value.startsWith("sample:")) {
    const packId = value.slice(7);
    emit("update:modelValue", { kind: "sample", packId });
    return;
  }
  if (value.startsWith("prototype:")) {
    const id = value.slice(10);
    const proto = prototypes.find((p) => p.id === id);
    if (proto) {
      emit("update:modelValue", {
        kind: "prototype",
        id,
        packId: proto.themePackId,
      });
    }
  }
}
</script>

<template>
  <WorkbenchSelect
    :model-value="selectedValue"
    :items="items"
    :label="label ?? '查看范围'"
    @update:model-value="handleUpdate"
  />
</template>
