<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "@/design-system/components/basic/Card.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import { activities, coupons, tasks } from "../mock";

const route = useRoute();
const router = useRouter();
const ownsVariant = computed(() => route.params.screenSlug === "benefits-home");
const variant = computed(() => {
  if (!ownsVariant.value) return "default";
  return typeof route.query.variant === "string" ? route.query.variant : "default";
});
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const unusedCount = coupons.filter((item) => item.status === "unused").length;
const doneCount = tasks.filter((item) => item.status === "done").length;

function go(slug: string, nextVariant = "default") {
  void router.push(
    `/prototype/ledger-planet/${slug}?variant=${nextVariant}&theme=${theme.value}`,
  );
}
</script>

<template>
  <div
    class="page"
    :class="{ 'is-state': variant === 'loading' || variant === 'empty' }"
    data-pb-id="ledger-planet.benefits-home"
  >
    <Spinner v-if="variant === 'loading'" label="正在加载权益" size="lg" />
    <EmptyState
      v-else-if="variant === 'empty'"
      title="暂无权益内容"
      description="稍后再来看看活动与任务。"
    />
    <template v-else>
      <button type="button" class="hit" @click="go('activity-detail')">
        <Card :title="activities[0]!.title" :subtitle="activities[0]!.subtitle">
          <div class="card-top">
            <Chip :label="activities[0]!.status" tone="success" />
          </div>
          <ProgressIndicator
            :value="(activities[0]!.progress / activities[0]!.target) * 100"
            :label="`${activities[0]!.progress}/${activities[0]!.target}`"
          />
        </Card>
      </button>

      <section class="section">
        <header>
          <h2>今日任务</h2>
          <button type="button" @click="go('task-list')">
            {{ doneCount }}/{{ tasks.length }} 全部 ›
          </button>
        </header>
        <button
          v-for="task in tasks"
          :key="task.id"
          type="button"
          class="list-row"
          @click="
            go(
              'task-detail',
              task.status === 'done' ? 'completed' : 'default',
            )
          "
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
      </section>

      <button type="button" class="coupon-entry" @click="go('coupon-wallet')">
        <span>我的券包</span>
        <strong>可用 {{ unusedCount }} · 即将过期 1 ›</strong>
      </button>

      <section class="section">
        <header><h2>热门活动</h2></header>
        <div class="activity-scroll">
          <button
            v-for="item in activities"
            :key="item.id"
            type="button"
            class="activity-card"
            @click="
              go(
                'activity-detail',
                item.status === '已结束' ? 'ended' : 'default',
              )
            "
          >
            <Chip :label="item.status" tone="secondary" />
            <strong>{{ item.title }}</strong>
            <span>{{ item.subtitle }}</span>
          </button>
        </div>
      </section>
      <Button
        label="查看全部任务"
        variant="outlined"
        block
        @click="go('task-list')"
      />
    </template>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
  align-content: start;
}
.page.is-state {
  place-content: center;
  justify-items: center;
  min-height: 100%;
}
.hit {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.card-top {
  margin-bottom: 10px;
}
.section {
  display: grid;
  gap: 8px;
}
.section header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section h2 {
  margin: 0;
  font: var(--pb-typography-subtitle);
}
.section header button {
  border: 0;
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  cursor: pointer;
}
.list-row,
.coupon-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 12px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.list-row strong,
.coupon-entry span {
  display: block;
  font: var(--pb-typography-subtitle);
}
.list-row span,
.coupon-entry strong {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  font-weight: 400;
}
.activity-scroll {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(200px, 70%);
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.activity-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.activity-card {
  display: grid;
  gap: 8px;
  justify-items: start;
  padding: 14px;
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.activity-card strong {
  font: var(--pb-typography-subtitle);
}
.activity-card span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
