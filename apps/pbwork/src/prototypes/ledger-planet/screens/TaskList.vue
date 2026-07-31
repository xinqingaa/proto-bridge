<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Tabs from "@/design-system/components/complex/Tabs.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";
import { tasks, type BenefitTask } from "../mock";
import { pushStack } from "../nav";

type TaskTab = "all" | "todo" | "done";

const route = useRoute();
const router = useRouter();
const tab = ref<TaskTab>("all");
const refreshing = ref(false);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

const tabItems = [
  { value: "all", label: "全部" },
  { value: "todo", label: "待完成" },
  { value: "done", label: "已完成" },
];

const panels: Array<{
  value: TaskTab;
  emptyTitle: string;
  emptyDescription: string;
}> = [
  {
    value: "all",
    emptyTitle: "没有任务",
    emptyDescription: "稍后再来看看。",
  },
  {
    value: "todo",
    emptyTitle: "暂无待完成任务",
    emptyDescription: "新任务会出现在这里。",
  },
  {
    value: "done",
    emptyTitle: "暂无已完成任务",
    emptyDescription: "完成后会出现在这里。",
  },
];

watch(
  variant,
  (value) => {
    if (value === "claimable") tab.value = "all";
  },
  { immediate: true },
);

function rowsFor(status: TaskTab) {
  if (variant.value === "empty") return [];
  if (variant.value === "claimable") {
    // Keep a single instrumented list for the claimable variant.
    if (status !== "all") return [];
    return tasks.filter((item) => item.rewardState === "claimable");
  }
  if (status === "todo") return tasks.filter((item) => item.status === "todo");
  if (status === "done") return tasks.filter((item) => item.status === "done");
  return tasks;
}

function isInstrumented(status: TaskTab) {
  return tab.value === status;
}

function faceValue(reward: string) {
  const yen = reward.match(/¥\s*(\d+)/);
  if (yen) return { primary: `¥${yen[1]}`, hint: "体验券" };
  const coins = reward.match(/(\d+)\s*星币/);
  if (coins) return { primary: coins[1], hint: "星币" };
  return { primary: "奖", hint: "奖励" };
}

function chipFor(task: BenefitTask) {
  if (task.rewardState === "claimable") {
    return { label: "待领取", tone: "warning" as const };
  }
  if (task.status === "done") {
    return { label: "已完成", tone: "success" as const };
  }
  return { label: "去完成", tone: "primary" as const };
}

function open(id: string, status: string, rewardState: string) {
  void pushStack(router, route, "权益", "task-detail", {
    variant:
      rewardState === "claimable"
        ? "claimable"
        : status === "done"
          ? "completed"
          : "default",
    query: { task: id },
  });
}

function onRefresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  window.setTimeout(() => {
    refreshing.value = false;
  }, 650);
}
</script>

<template>
  <LedgerPlanetShell title="任务" active="权益" back-to="benefits-home">
    <ScrollableDataList
      :pull-refresh="{ enabled: true, mouse: true }"
      :load-more="false"
      :drag-scroll="{ enabled: true, mouse: true, momentum: true }"
      :refreshing="refreshing"
      inspect-id="ledger-planet.task-list.scroll-list"
      @refresh="onRefresh"
    >
      <div
        class="page"
        data-pb-id="ledger-planet.task-list.root"
        data-pb-role="page"
      >
        <div class="task-tabs">
          <Tabs
            class="task-tabs-control"
            v-model="tab"
            :items="tabItems"
            selection-style="pill"
            grow
            fill
            :swipe="true"
            :mouse-swipe="true"
            inspect-id="ledger-planet.task-list.filters"
          >
            <template v-for="panel in panels" :key="panel.value" #[panel.value]>
              <div class="panel">
                <EmptyState
                  v-if="rowsFor(panel.value).length === 0"
                  :title="panel.emptyTitle"
                  :description="panel.emptyDescription"
                />
                <DataList
                  v-else
                  class="ticket-list"
                  surface="none"
                  rounded="none"
                  :divided="false"
                  v-bind="
                    isInstrumented(panel.value)
                      ? {
                          inspectId: 'ledger-planet.task-list.list',
                          'data-pb-id': 'ledger-planet.task-list.list',
                        }
                      : {}
                  "
                >
                  <button
                    v-for="task in rowsFor(panel.value)"
                    :key="task.id"
                    type="button"
                    class="ticket"
                    :class="{
                      'is-done': task.status === 'done',
                      'is-claimable': task.rewardState === 'claimable',
                    }"
                    :data-pb-id="
                      isInstrumented(panel.value)
                        ? 'ledger-planet.task-list.list.row'
                        : undefined
                    "
                    :data-pb-key="
                      isInstrumented(panel.value) ? task.id : undefined
                    "
                    :data-pb-role="
                      isInstrumented(panel.value) ? 'list-item' : undefined
                    "
                    :data-pb-action="
                      isInstrumented(panel.value)
                        ? 'open-claimable-task'
                        : undefined
                    "
                    @click="open(task.id, task.status, task.rewardState)"
                  >
                    <div class="ticket-face" aria-hidden="true">
                      <strong
                        :data-pb-id="
                          isInstrumented(panel.value)
                            ? 'ledger-planet.task-list.list.row.face-value'
                            : undefined
                        "
                        :data-pb-key="
                          isInstrumented(panel.value) ? task.id : undefined
                        "
                        :data-pb-role="
                          isInstrumented(panel.value) ? 'text' : undefined
                        "
                        data-pb-token-typography="typography.title"
                      >{{ faceValue(task.reward).primary }}</strong>
                      <span
                        :data-pb-id="
                          isInstrumented(panel.value)
                            ? 'ledger-planet.task-list.list.row.face-hint'
                            : undefined
                        "
                        :data-pb-key="
                          isInstrumented(panel.value) ? task.id : undefined
                        "
                        :data-pb-role="
                          isInstrumented(panel.value) ? 'text' : undefined
                        "
                        data-pb-token-typography="typography.caption"
                      >{{ faceValue(task.reward).hint }}</span>
                    </div>
                    <div class="ticket-body">
                      <strong>{{ task.title }}</strong>
                      <span>{{ task.subtitle }}</span>
                      <small>{{ task.cycle }} · 奖励 {{ task.reward }}</small>
                    </div>
                    <Chip
                      :label="chipFor(task).label"
                      :tone="chipFor(task).tone"
                      v-bind="
                        isInstrumented(panel.value)
                          ? {
                              inspectId:
                                'ledger-planet.task-list.list.row.chip',
                              pbKey: task.id,
                            }
                          : {}
                      "
                    />
                  </button>
                </DataList>
              </div>
            </template>
          </Tabs>
        </div>
      </div>
    </ScrollableDataList>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm, 8px);
  padding: var(--pb-spacing-md, 16px);
  min-height: 100%;
  height: 100%;
  flex: 1;
  box-sizing: border-box;
}
.task-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.task-tabs-control {
  flex: 1;
  min-height: 0;
}
.panel {
  display: grid;
  gap: var(--pb-spacing-sm, 8px);
  padding-top: var(--pb-spacing-xs, 4px);
}
.ticket-list {
  display: grid;
  gap: var(--pb-spacing-sm-plus, 12px);
}
.ticket {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--pb-spacing-sm-plus, 12px);
  min-height: 88px;
  padding: 0;
  padding-inline-end: var(--pb-spacing-md, 16px);
  border: 0;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 1px var(--pb-color-border),
    0 10px 24px
      color-mix(in srgb, var(--pb-color-on-background) 6%, transparent);
}
.ticket-face {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--pb-spacing-xxs, 2px);
  align-self: stretch;
  min-width: 76px;
  padding: var(--pb-spacing-md, 16px) var(--pb-spacing-sm, 8px);
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 12%,
    var(--pb-color-surface)
  );
  color: var(--pb-color-primary);
  border-inline-end: 1px dashed
    color-mix(in srgb, var(--pb-color-primary) 28%, var(--pb-color-border));
}
.ticket-face strong {
  font: var(--pb-typography-title);
  letter-spacing: -0.02em;
  line-height: 1;
}
.ticket-face span {
  font: var(--pb-typography-caption);
  color: color-mix(
    in srgb,
    var(--pb-color-primary) 72%,
    var(--pb-color-on-surface-muted)
  );
}
.ticket-body {
  display: grid;
  gap: var(--pb-spacing-xxs, 2px);
  min-width: 0;
  padding-block: var(--pb-spacing-md, 16px);
}
.ticket-body strong {
  font: var(--pb-typography-subtitle);
  color: var(--pb-color-on-surface);
}
.ticket-body span,
.ticket-body small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.ticket.is-done:not(.is-claimable) {
  opacity: 0.78;
}
.ticket.is-done:not(.is-claimable) .ticket-face {
  background: color-mix(
    in srgb,
    var(--pb-color-on-surface-muted) 10%,
    var(--pb-color-surface)
  );
  color: var(--pb-color-on-surface-muted);
  border-inline-end-color: var(--pb-color-border);
}
.ticket.is-done:not(.is-claimable) .ticket-face span {
  color: var(--pb-color-on-surface-muted);
}
.ticket.is-claimable .ticket-face {
  background: color-mix(
    in srgb,
    var(--pb-color-warning) 14%,
    var(--pb-color-surface)
  );
  color: var(--pb-color-warning);
  border-inline-end-color: color-mix(
    in srgb,
    var(--pb-color-warning) 28%,
    var(--pb-color-border)
  );
}
.ticket.is-claimable .ticket-face span {
  color: color-mix(
    in srgb,
    var(--pb-color-warning) 72%,
    var(--pb-color-on-surface-muted)
  );
}
.ticket:active {
  transform: scale(0.992);
}
</style>
