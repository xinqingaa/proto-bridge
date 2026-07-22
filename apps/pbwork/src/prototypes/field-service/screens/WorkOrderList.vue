<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import FieldServiceShell from "../FieldServiceShell.vue";
import SearchBar from "@/design-system/components/complex/SearchBar.vue";
import FilterBar from "@/design-system/components/complex/FilterBar.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";

const route = useRoute();
const router = useRouter();
const query = ref("");
const filter = ref("全部");
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const isStateView = computed(() =>
  ["empty", "loading", "error"].includes(variant.value),
);
const base = [
  {
    id: "wo-1042",
    title: "中央空调异常检修",
    subtitle: "高优先级 · 远景科技园",
  },
  {
    id: "wo-1038",
    title: "消防泵例行巡检",
    subtitle: "今天 14:30 · 城北物流园",
  },
  {
    id: "wo-1029",
    title: "门禁控制器离线",
    subtitle: "已超时 45 分钟 · 客户总部",
  },
];
const items = computed(() => {
  if (["empty", "loading", "error"].includes(variant.value)) return [];
  let rows = base;
  if (variant.value === "high-priority") rows = base.slice(0, 1);
  if (variant.value === "overdue") rows = base.slice(2);
  const q = query.value.trim();
  return q
    ? rows.filter((i) => i.title.includes(q) || i.subtitle.includes(q))
    : rows;
});
function open() {
  void router.push(
    `/prototype/field-service/work-order-detail?variant=default&theme=${theme.value}`,
  );
}
</script>

<template>
  <FieldServiceShell title="工单" active="工单">
    <div
      class="page"
      :class="{ 'is-state': isStateView }"
      data-pb-id="field-service.work-orders"
    >
      <template v-if="variant === 'error'">
        <div class="error" role="alert">
          <strong>工单加载失败</strong>
          <span>网络连接异常，请稍后重试。</span>
        </div>
      </template>
      <Spinner
        v-else-if="variant === 'loading'"
        label="正在加载工单"
        size="lg"
      />
      <EmptyState
        v-else-if="variant === 'empty'"
        title="没有匹配的工单"
        description="尝试调整搜索或筛选条件。"
      />
      <template v-else>
        <SearchBar
          v-model="query"
          placeholder="搜索工单、客户或设备"
          inspect-id="field-service.work-orders.search"
        />
        <FilterBar
          v-model="filter"
          :items="['全部', '待处理', '进行中', '已完成']"
          inspect-id="field-service.work-orders.filters"
        />
        <div class="results">
          <EmptyState
            v-if="items.length === 0"
            title="没有匹配的工单"
            description="尝试调整搜索或筛选条件。"
            action-label="清除筛选"
            @action="query = ''"
          />
          <DataList
            v-else
            :items="items"
            inspect-id="field-service.work-orders.list"
            @select="open"
          />
        </div>
      </template>
    </div>
  </FieldServiceShell>
</template>

<style scoped>
.page {
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 10px;
  min-height: 100%;
  padding: 12px 16px 16px;
}
.page.is-state {
  grid-template-rows: 1fr;
  place-content: center;
  justify-items: center;
}
.results {
  display: grid;
  min-height: 0;
  place-content: start stretch;
}
.results:has(.pb-empty) {
  place-content: center;
}
.error {
  display: grid;
  gap: 5px;
  max-width: 280px;
  padding: 16px;
  border: 1px solid var(--pb-color-error);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
  text-align: center;
}
.error span {
  font: var(--pb-typography-caption);
}
</style>
