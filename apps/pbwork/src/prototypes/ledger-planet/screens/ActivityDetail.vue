<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Card from "@/design-system/components/basic/Card.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import Button from "@/design-system/components/basic/Button.vue";
import { activities } from "../mock";

const route = useRoute();
const router = useRouter();
const activity = activities[0]!;
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
const ended = computed(() => variant.value === "ended");

function goRecord() {
  void router.push(
    `/prototype/ledger-planet/record-edit?variant=default&theme=${theme.value}`,
  );
}
</script>

<template>
  <LedgerPlanetShell title="活动详情" active="权益" back-to="benefits-home">
    <div class="page" data-pb-id="ledger-planet.activity-detail">
      <h1>{{ activity.title }}</h1>
      <Chip :label="ended ? '已结束' : activity.status" :tone="ended ? 'secondary' : 'success'" />
      <Card title="活动规则" subtitle="截止 2026-08-31">
        <ul>
          <li>每日至少完成 1 笔记账</li>
          <li>连续 7 天可领取消费券</li>
          <li>中断进度将重新计算</li>
        </ul>
      </Card>
      <ProgressIndicator
        :value="ended ? 100 : (activity.progress / activity.target) * 100"
        :label="ended ? '已结束' : `${activity.progress}/${activity.target}`"
      />
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
  justify-items: start;
  padding: 16px;
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
