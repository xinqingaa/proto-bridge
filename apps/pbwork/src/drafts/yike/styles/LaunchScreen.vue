<script setup lang="ts">
import Dial from "./Dial.vue";
import type { StyleDirectionId } from "./sample";

defineProps<{ theme: StyleDirectionId }>();
</script>

<template>
  <div class="y-screen is-launch">
    <div class="y-launch-mark">
      <Dial :theme="theme" :minutes="theme === 'mechanical' ? 25 : 15" :total="25" size="compact" tone="idle" />
      <strong class="y-wordmark">一刻</strong>
      <span class="y-tagline">打开，就开始这一刻</span>
    </div>
    <span class="y-launch-foot">只在本机保存</span>
  </div>
</template>
