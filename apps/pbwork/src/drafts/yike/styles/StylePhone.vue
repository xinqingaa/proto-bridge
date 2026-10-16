<script setup lang="ts">
import { NOW_LABEL } from "../model";
import type { StyleDirectionId } from "./sample";

defineProps<{ label: string; direction: StyleDirectionId; dark?: boolean }>();
</script>

<template>
  <figure class="ys-phone-figure">
    <div class="ys-phone" :class="[`ys-${direction}`, { 'is-dark': dark }]">
      <div class="ys-phone-status" aria-hidden="true">
        <span>{{ NOW_LABEL }}</span>
      </div>
      <div class="ys-phone-body">
        <slot />
      </div>
    </div>
    <figcaption>{{ label }}</figcaption>
  </figure>
</template>
