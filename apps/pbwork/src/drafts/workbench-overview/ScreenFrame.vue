<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    src: string;
    title: string;
    scale?: number;
    live?: boolean;
  }>(),
  { scale: 0.5, live: true },
);

const width = 390;
const height = 844;
const mounted = ref(false);

const outerStyle = computed(() => ({
  width: `${Math.round(width * props.scale)}px`,
  height: `${Math.round(height * props.scale)}px`,
}));

const innerStyle = computed(() => ({
  width: `${width}px`,
  height: `${height}px`,
  transform: `scale(${props.scale})`,
}));

onMounted(() => {
  requestAnimationFrame(() => {
    mounted.value = true;
  });
});
</script>

<template>
  <span class="frm" :style="outerStyle">
    <span class="frm-inner" :style="innerStyle">
      <iframe
        v-if="live && mounted"
        class="frm-iframe"
        :src="src"
        :title="title"
        :width="width"
        :height="height"
        loading="lazy"
        tabindex="-1"
      />
    </span>
  </span>
</template>
