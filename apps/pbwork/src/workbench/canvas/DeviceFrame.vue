<script setup lang="ts">
import { computed } from "vue";
import PhoneShell from "@/workbench/PhoneShell.vue";
import type { DevicePreset } from "@/workbench/canvas/devices";

const props = defineProps<{
  device: DevicePreset;
  title: string;
  src: string;
  isDark: boolean;
  pointerEvents: "auto" | "none";
}>();

const emit = defineEmits<{
  load: [];
}>();

const screenStyle = computed(() => ({
  width: `${props.device.width}px`,
  height: `${props.device.height}px`,
}));
</script>

<template>
  <PhoneShell
    chrome="overlay"
    :dark="isDark"
    :width="device.width"
    :height="device.height"
  >
    <iframe
      class="device-iframe"
      :src="src"
      :title="title"
      :width="device.width"
      :height="device.height"
      :style="{
        ...screenStyle,
        pointerEvents,
      }"
      data-testid="prototype-iframe"
      @load="emit('load')"
    />
  </PhoneShell>
</template>

<style scoped>
.device-iframe {
  display: block;
  border: 0;
  background: #fff;
}
</style>
