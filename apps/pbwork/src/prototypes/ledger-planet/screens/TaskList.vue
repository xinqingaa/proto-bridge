<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import FilterBar from "@/design-system/components/complex/FilterBar.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import { tasks } from "../mock";
import { pushStack } from "../nav";

const route = useRoute();
const router = useRouter();
const filter = ref("全部");
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const rows = computed(() => {
  if (variant.value === "empty") return [];
  if (filter.value === "已完成")
    return tasks.filter((item) => item.status === "done");
  if (filter.value === "待完成")
    return tasks.filter((item) => item.status === "todo");
  return tasks;
});

function open(id: string, status: string) {
  void pushStack(router, route, "权益", "task-detail", {
    variant: status === "done" ? "completed" : "default",
    query: { task: id },
  });
}
</script>

<template>
  <LedgerPlanetShell title="任务" active="权益" back-to="benefits-home">
    <div class="page" data-pb-id="ledger-planet.task-list">
      <FilterBar
        v-model="filter"
        :items="['全部', '待完成', '已完成']"
        inspect-id="ledger-planet.task-list.filters"
      />
      <EmptyState
        v-if="rows.length === 0"
        title="没有任务"
        description="稍后再来看看。"
      />
      <DataList v-if="rows.length" surface="none" rounded="none">
        <button
          v-for="task in rows"
          :key="task.id"
          type="button"
          class="row"
          @click="open(task.id, task.status)"
        >
          <div>
            <strong>{{ task.title }}</strong>
            <span>{{ task.subtitle }}</span>
          </div>
          <Chip
            :label="task.status === 'done' ? '已完成' : '去完成'"
            :tone="task.status === 'done' ? 'success' : 'primary'"
          />
        </button>
      </DataList>
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 10px;
  padding: 16px;
  align-content: start;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 12px 2px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.row strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
.row span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
