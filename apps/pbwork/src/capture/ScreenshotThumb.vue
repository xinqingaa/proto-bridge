<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Image } from "lucide-vue-next";
import { loadThumbnail } from "@/capture/screenshot-cache";

const props = withDefaults(
  defineProps<{
    bundleId: string;
    blobId: string;
    alt: string;
    width?: number;
  }>(),
  { width: 84 },
);

const root = ref<HTMLElement | null>(null);
const src = ref("");
let observer: IntersectionObserver | undefined;

async function load() {
  try {
    src.value = await loadThumbnail(props.bundleId, props.blobId, props.width);
  } catch {
    src.value = "";
  }
}

onMounted(() => {
  const element = root.value;
  if (!element || typeof IntersectionObserver === "undefined") {
    void load();
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      void load();
    },
    { rootMargin: "240px" },
  );
  observer.observe(element);
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <span ref="root" class="shot-thumb">
    <img v-if="src" :src="src" :alt="alt" decoding="async" />
    <Image v-else :size="14" aria-hidden="true" />
  </span>
</template>

<style scoped>
.shot-thumb {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  overflow: hidden;
}
.shot-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
