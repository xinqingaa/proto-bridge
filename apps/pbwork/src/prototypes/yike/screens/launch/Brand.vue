<script setup lang="ts">
import LaunchScreen from "@/design-system/components/navigation/LaunchScreen.vue";
import { vPb } from "@/authoring/pb-style";
import { scope } from "./screen";
import YikeDial from "../../components/YikeDial.vue";
import type { YikeFace } from "../../model";
defineProps<{ face: YikeFace }>();
</script>
<template>
  <LaunchScreen mode="launch" :inspect-id="scope.id('root')">
    <template #brand>
      <div
        class="brand-object"
        v-pb="
          scope.node('object', 'image', {
            tokens: { width: 'size.panel-medium', color: 'color.primary' },
          })
        "
        role="img"
        :aria-label="`${face === 'water' ? '水位' : face === 'sundial' ? '日影' : '机械'}品牌物件`"
      >
        <YikeDial
          :face="face"
          :minutes="25"
          :total="25"
          digits=""
          caption=""
          :inspect-id="scope.id('dial')"
        />
      </div>
      <h1
        v-pb="
          scope.node('name', 'text', {
            tokens: { tracking: 'tracking.heading' },
            style: {
              typography: 'typography.headline',
              color: 'color.on-surface',
              margin: 'layout.zero',
            },
          })
        "
      >
        一刻
      </h1>
      <p
        v-pb="
          scope.node('promise', 'text', {
            style: {
              typography: 'typography.content',
              color: 'color.on-surface-muted',
              margin: 'layout.zero',
            },
          })
        "
      >
        打开，就开始这一刻
      </p>
    </template>
    <template #illustration><span aria-hidden="true" /></template>
  </LaunchScreen>
</template>
<style scoped>
.brand-object {
  display: flex;
  justify-content: center;
  align-items: center;
  inline-size: var(--pb-size-panel-medium);
  max-inline-size: var(--pb-layout-fill);
  color: var(--pb-color-primary);
}
h1 {
  letter-spacing: var(--pb-tracking-heading);
}
</style>
