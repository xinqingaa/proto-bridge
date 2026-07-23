<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Chip from "@/design-system/components/basic/Chip.vue";
import Button from "@/design-system/components/basic/Button.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import { useHorizontalDragScroll } from "@/design-system/components/_shared/useHorizontalDragScroll";
import { pushStack } from "../nav";
import { activities, coupons, tasks } from "../mock";

const route = useRoute();
const router = useRouter();
const ownsVariant = computed(() => route.params.screenSlug === "benefits-home");
const variant = computed(() => {
  if (!ownsVariant.value) return "default";
  return typeof route.query.variant === "string"
    ? route.query.variant
    : "default";
});
const unusedCount = coupons.filter((item) => item.status === "unused").length;
const doneCount = tasks.filter((item) => item.status === "done").length;
const featured = activities[0]!;
const expiringSoon = coupons.find((item) => item.status === "unused");
const activityScrollRef = ref<HTMLElement | null>(null);
const activityDrag = useHorizontalDragScroll(activityScrollRef);

function go(slug: string, nextVariant = "default") {
  void pushStack(router, route, "权益", slug, { variant: nextVariant });
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
      <button type="button" class="feature" @click="go('activity-detail')">
        <div class="feature-top">
          <Chip :label="featured.status" tone="success" />
          <span>进行中</span>
        </div>
        <strong>{{ featured.title }}</strong>
        <p>{{ featured.subtitle }}</p>
        <ProgressIndicator
          :value="(featured.progress / featured.target) * 100"
          :label="`${featured.progress}/${featured.target}`"
        />
        <span class="feature-cta">查看活动 ›</span>
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
          class="task-row"
          :class="{ done: task.status === 'done' }"
          @click="
            go('task-detail', task.status === 'done' ? 'completed' : 'default')
          "
        >
          <span class="check" aria-hidden="true">
            {{ task.status === "done" ? "✓" : "" }}
          </span>
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

      <button type="button" class="coupon-ticket" @click="go('coupon-wallet')">
        <div class="ticket-main">
          <span>我的券包</span>
          <strong>可用 {{ unusedCount }}</strong>
        </div>
        <div class="ticket-side">
          <span>{{ expiringSoon ? "即将过期 1" : "查看全部" }}</span>
          <em>›</em>
        </div>
      </button>

      <section class="section">
        <header><h2>热门活动</h2></header>
        <div
          ref="activityScrollRef"
          class="activity-scroll"
          :class="{ 'is-dragging': activityDrag.dragging.value }"
          data-horizontal-scroll
          @pointerdown="activityDrag.onPointerDown"
          @pointermove="activityDrag.onPointerMove"
          @pointerup="activityDrag.onPointerUp"
          @pointercancel="activityDrag.onPointerCancel"
          @click.capture="activityDrag.onClickCapture"
        >
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
            <div class="activity-band" aria-hidden="true" />
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
  position: relative;
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
.feature {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 24%, var(--pb-color-border));
  border-radius: var(--pb-radius-lg);
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 7%,
    var(--pb-color-surface)
  );
  box-shadow:
    0 14px 34px
      color-mix(in srgb, var(--pb-color-on-background) 8%, transparent),
    inset 0 1px 0
      color-mix(in srgb, var(--pb-color-surface-raised) 76%, transparent);
  backdrop-filter: blur(14px);
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}
.feature-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.feature strong {
  font: var(--pb-typography-title);
}
.feature p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.feature-cta {
  margin-top: 4px;
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
}
.section {
  display: grid;
  gap: 4px;
}
.section header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
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
.task-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 10px 2px;
  border: 0;
  border-bottom: 1px solid var(--pb-color-border);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.task-row:last-child {
  border-bottom: 0;
}
.task-row.done strong {
  text-decoration: line-through;
  color: var(--pb-color-on-surface-muted);
}
.check {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--pb-color-border);
  background: var(--pb-color-surface);
  color: var(--pb-color-success);
  font-size: 12px;
}
.task-row.done .check {
  border-color: var(--pb-color-success);
  background: color-mix(in srgb, var(--pb-color-success) 16%, transparent);
}
.task-row strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
.task-row span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.coupon-ticket {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: stretch;
  min-height: 72px;
  padding: 0;
  border: 0;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--pb-color-border);
  overflow: hidden;
}
.ticket-main {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--pb-color-primary) 8%, transparent);
}
.ticket-main span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.ticket-main strong {
  font: var(--pb-typography-title);
}
.ticket-side {
  display: grid;
  place-content: center;
  gap: 2px;
  min-width: 88px;
  padding: 12px;
  border-left: 1px dashed var(--pb-color-border);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-align: center;
}
.ticket-side em {
  font-style: normal;
  color: var(--pb-color-primary);
  font-size: 18px;
}
.activity-scroll {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(200px, 70%);
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  cursor: grab;
  touch-action: pan-y;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
}
.activity-scroll.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.activity-scroll::-webkit-scrollbar {
  display: none;
}
.activity-card {
  position: relative;
  display: grid;
  gap: 8px;
  justify-items: start;
  padding: 14px;
  border: 0;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  box-shadow: inset 0 0 0 1px var(--pb-color-border);
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  scroll-snap-align: start;
}
.activity-band {
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: var(--pb-color-primary);
}
.activity-card strong {
  margin-top: 4px;
  font: var(--pb-typography-subtitle);
}
.activity-card span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
