<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import LedgerPlanetShell from "../LedgerPlanetShell.vue";
import ProgressIndicator from "@/design-system/components/basic/ProgressIndicator.vue";
import Button from "@/design-system/components/basic/Button.vue";
import SnackbarToast from "@/design-system/components/complex/SnackbarToast.vue";
import { tasks } from "../mock";
import { runtimePath } from "../nav";

const route = useRoute();
const router = useRouter();
const toast = ref(false);
const task = tasks[0]!;
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
  void router.push(runtimePath("record-edit", route));
}

function claim() {
  toast.value = true;
}
</script>

<template>
  <LedgerPlanetShell title="任务详情" active="权益" back-to="task-list">
    <div class="page" data-pb-id="ledger-planet.task-detail">
      <h1>{{ task.title }}</h1>
      <p>条件：{{ task.subtitle }}</p>
      <ProgressIndicator
        :value="completed ? 100 : (task.progress / task.target) * 100"
        :label="completed ? `${task.target}/${task.target}` : `${task.progress}/${task.target}`"
      />
      <Button
        v-if="!completed"
        label="去完成"
        block
        @click="goComplete"
      />
      <Button
        v-else-if="claimable"
        label="领取奖励"
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
  gap: 14px;
  padding: 16px;
}
h1 {
  margin: 0;
  font: var(--pb-typography-title);
}
p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
}
</style>
