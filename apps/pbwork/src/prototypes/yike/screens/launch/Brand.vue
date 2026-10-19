<script setup lang="ts">
import LaunchScreen from "@/design-system/components/navigation/LaunchScreen.vue";
import { vPb } from "@/authoring/pb-style";
import { scope } from "./screen";
import YikeDial from "../../components/YikeDial.vue";
import type { YikeFace } from "../../model";
defineProps<{ face: YikeFace }>();
</script>
<template>
  <div class="brand-frame">
    <LaunchScreen mode="launch" :inspect-id="scope.id('root')">
      <template #brand>
        <div
          class="brand-object"
          v-pb="
            scope.node('object', 'image', {
              tokens: { width: 'size.action-min-inline', color: 'color.primary' },
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
    <p
      class="brand-privacy"
      v-pb="
        scope.node('privacy', 'text', {
          tokens: {
            typography: 'typography.caption',
            color: 'color.on-surface-muted',
          },
        })
      "
    >
      只在本机保存
    </p>
  </div>
</template>
<style scoped>
.brand-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: var(--pb-layout-flex-fill);
  min-block-size: var(--pb-layout-zero);
}
.brand-privacy {
  position: absolute;
  inset-block-end: calc(
    var(--pb-safe-bottom, var(--pb-layout-zero)) + var(--pb-spacing-lg)
  );
  inset-inline: var(--pb-spacing-lg);
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
  text-align: center;
}

.brand-object {
  display: flex;
  justify-content: center;
  align-items: center;
  inline-size: var(--pb-size-action-min-inline);
  max-inline-size: var(--pb-layout-fill);
  color: var(--pb-color-primary);
}
h1 {
  letter-spacing: var(--pb-tracking-heading);
}
</style>
