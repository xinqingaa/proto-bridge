<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import { Check, Coins, Flame, Target } from "lucide-vue-next";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import { tasks } from "../mock";
import { pushStack } from "../nav";

const route = useRoute();
const router = useRouter();
const toast = ref(false);
const claimed = ref(false);
const task = computed(
  () => tasks.find((item) => item.id === route.query.task) ?? tasks[0]!,
);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const completed = computed(
  () => variant.value === "completed" || variant.value === "claimable",
);
const claimable = computed(() => variant.value === "claimable");

watch(
  variant,
  (value) => {
    if (value === "claimable") toast.value = false;
  },
  { immediate: true },
);

function goComplete() {
  void pushStack(router, route, "权益", "record-edit", {
    query: { return: "task-detail" },
  });
}

function claim() {
  claimed.value = true;
  toast.value = true;
}
</script>

<template>
  <LedgerPlanetShell title="任务详情" active="权益" back-to="task-list">
    <div
      class="page"
      data-pb-id="ledger-planet.task-detail.root"
      data-pb-role="page"
    >
      <section class="task-hero">
        <div class="hero-icon"><Target :size="24" /></div>
        <div>
          <span class="eyebrow">每日任务</span>
          <h1>{{ task.title }}</h1>
          <p>{{ task.subtitle }}</p>
        </div>
        <Chip
          :label="completed ? '已达成' : '进行中'"
          :tone="completed ? 'success' : 'primary'"
        />
      </section>
      <section class="progress-panel">
        <div class="section-heading">
          <strong>完成进度</strong
          ><span
            >{{ completed ? task.target : task.progress }}/{{
              task.target
            }}</span
          >
        </div>
        <ProgressIndicator
          :value="completed ? 100 : (task.progress / task.target) * 100"
        />
        <div class="reward">
          <Coins :size="18" />
          <div>
            <strong>奖励 ¥3 体验券</strong><span>完成后自动进入券包</span>
          </div>
        </div>
      </section>
      <section class="steps">
        <h2>完成方式</h2>
        <div>
          <span class="step-index"
            ><Check v-if="completed" :size="16" /><template v-else
              >1</template
            ></span
          >
          <p>
            <strong>新增一笔有效流水</strong
            ><small>支出或收入均可，金额需大于 0</small>
          </p>
        </div>
        <div>
          <span class="step-index"><Flame :size="16" /></span>
          <p>
            <strong>保持连续记录</strong><small>连续完成可解锁成长任务</small>
          </p>
        </div>
      </section>
      <Button v-if="!completed" label="去完成" block @click="goComplete" />
      <Button
        v-else-if="claimable"
        :label="claimed ? '已领取' : '领取奖励'"
        :disabled="claimed"
        block
        @click="claim"
      />
      <Button v-else label="已完成" variant="outlined" block disabled />
    </div>
    <SnackbarToast v-model="toast" message="奖励已放入券包" tone="success" />
  </LedgerPlanetShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 18px;
  padding: 16px;
}
.task-hero {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px solid
    color-mix(in srgb, var(--pb-color-primary) 26%, var(--pb-color-border));
  border-radius: var(--pb-radius-lg);
  background: color-mix(
    in srgb,
    var(--pb-color-primary) 8%,
    var(--pb-color-surface)
  );
  box-shadow: var(--pb-elevation-card);
}
.hero-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
}
.eyebrow {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
}
h1 {
  margin: 2px 0;
  font: var(--pb-typography-title);
}
p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
.progress-panel {
  display: grid;
  gap: 14px;
  padding: 2px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  font: var(--pb-typography-subtitle);
}
.section-heading span {
  color: var(--pb-color-primary);
}
.reward {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border-left: 3px solid var(--pb-color-primary);
  background: color-mix(in srgb, var(--pb-color-primary) 6%, transparent);
}
.reward > svg {
  color: var(--pb-color-primary);
}
.reward strong,
.reward span {
  display: block;
}
.reward span,
.steps small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.steps {
  display: grid;
  gap: 12px;
}
.steps h2 {
  margin: 0;
  font: var(--pb-typography-subtitle);
}
.steps > div {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.step-index {
  display: grid;
  place-items: center;
  flex: 0 0 28px;
  height: 28px;
  border: 1px solid var(--pb-color-primary);
  border-radius: 50%;
  color: var(--pb-color-primary);
  font: var(--pb-typography-label);
}
.steps strong,
.steps small {
  display: block;
}
</style>
