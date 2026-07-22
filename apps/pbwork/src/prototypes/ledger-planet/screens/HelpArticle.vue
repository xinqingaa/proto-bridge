<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import Button from "@/design-system/components/basic/Button.vue";

const route = useRoute();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
</script>

<template>
  <LedgerPlanetShell title="如何导出账本" active="我的" back-to="help-center">
    <div
      class="page"
      :class="{ 'is-state': variant === 'loading' || variant === 'error' }"
      data-pb-id="ledger-planet.help-article"
    >
      <Spinner v-if="variant === 'loading'" label="正在加载文章" size="lg" />
      <EmptyState
        v-else-if="variant === 'error'"
        title="文章加载失败"
        description="请检查网络后重试。"
        action-label="重试"
      />
      <article v-else class="article">
        <p class="badge">WebView mock</p>
        <h1>如何导出账本</h1>
        <p>
          账本星球支持将指定周期的流水导出为 CSV / JSON。打开记账页右上角更多，或从「我的
          → 帮助」进入本说明。
        </p>
        <p>
          本期原型仅展示帮助内容承载方式：二级列表进入三级文章页，样式遵守设计令牌，正文为页面本地排版，不引入额外通用组件。
        </p>
        <Button label="我知道了" variant="outlined" block />
      </article>
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  min-height: 100%;
  padding: 16px;
}
.page.is-state {
  display: grid;
  place-content: center;
  justify-items: center;
}
.article {
  display: grid;
  gap: 12px;
}
.badge {
  margin: 0;
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
}
h1 {
  margin: 0;
  font: var(--pb-typography-title);
}
p {
  margin: 0;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
  line-height: 1.6;
}
</style>
