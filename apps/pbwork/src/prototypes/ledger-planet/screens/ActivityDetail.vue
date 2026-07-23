<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Card from "@/design-system/components/basic/Card.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import Button from "@/design-system/components/basic/Button.vue";
import { activities } from "../mock";
import { pushStack } from "../nav";
import { CalendarDays, Gift, ShieldCheck } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const activity = activities[0]!;
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const ended = computed(() => variant.value === "ended");

function goRecord() {
  void pushStack(router, route, "权益", "record-edit", {
    query: { return: "activity-detail" },
  });
}
</script>

<template>
  <LedgerPlanetShell title="活动详情" active="权益" back-to="benefits-home">
    <div class="page" data-pb-id="ledger-planet.activity-detail">
      <section class="activity-hero">
        <div class="hero-top">
          <span>SUMMER · 2026</span
          ><Chip
            :label="ended ? '已结束' : activity.status"
            :tone="ended ? 'secondary' : 'success'"
          />
        </div>
        <h1>{{ activity.title }}</h1>
        <p>{{ activity.subtitle }}</p>
        <div class="hero-meta">
          <span><CalendarDays :size="16" />距结束还有 39 天</span
          ><span><Gift :size="16" />最高 ¥20 券包</span>
        </div>
      </section>
      <section class="progress-block">
        <div class="progress-title">
          <strong>连续进度</strong
          ><span
            >{{ ended ? activity.target : activity.progress }}/{{
              activity.target
            }}
            天</span
          >
        </div>
        <ProgressIndicator
          :value="ended ? 100 : (activity.progress / activity.target) * 100"
        />
        <div class="milestones">
          <span
            v-for="day in activity.target"
            :key="day"
            :class="{ done: ended || day <= activity.progress }"
            >{{ day }}</span
          >
        </div>
      </section>
      <Card title="活动规则" subtitle="2026-07-18 至 2026-08-31">
        <ul>
          <li>每日至少完成 1 笔记账</li>
          <li>连续 7 天可领取消费券</li>
          <li>中断进度将重新计算</li>
        </ul>
      </Card>
      <div class="safe-note">
        <ShieldCheck :size="18" /><span
          >奖励由账本星球模拟发放，仅用于原型体验</span
        >
      </div>
      <Button
        :label="ended ? '活动已结束' : '去记账'"
        :disabled="ended"
        block
        @click="goRecord"
      />
    </div>
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.activity-hero {
  display: grid;
  gap: 9px;
  padding: 20px;
  border-radius: var(--pb-radius-lg);
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 28%, var(--pb-color-border));
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 10%,
    var(--pb-color-surface)
  );
  box-shadow: var(--pb-elevation-card);
}
.hero-top,
.hero-meta,
.progress-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.hero-top > span {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
  letter-spacing: 0.08em;
}
.activity-hero p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
}
.hero-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 6px;
}
.hero-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: var(--pb-typography-caption);
}
.progress-block {
  display: grid;
  gap: 12px;
}
.progress-title span {
  color: var(--pb-color-primary);
  font: var(--pb-typography-label);
}
.milestones {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.milestones span {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: 1px solid var(--pb-color-border);
  border-radius: 50%;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.milestones span.done {
  border-color: var(--pb-color-primary);
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
}
.safe-note {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.safe-note svg {
  color: var(--pb-color-primary);
}
h1 {
  margin: 0;
  font: var(--pb-typography-title);
}
ul {
  margin: 0;
  padding-left: 18px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
</style>
