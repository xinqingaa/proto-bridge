<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import HengdongShell from "../HengdongShell.vue";
import { plans, records } from "../model";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import { getRecords, removeRecord } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const baseRecord = records[0]!;
const fallbackPlan = plans[0]!;
const fallbackRecord = computed(() =>
  variant.value === "completed"
    ? {
        ...baseRecord,
        id: "record-20260813",
        date: "2026-08-13",
        minutes: 15,
        note: "完成今日训练。",
      }
    : baseRecord,
);
const record = computed(
  () =>
    getRecords().find((item) => item.id === route.query.record) ??
    fallbackRecord.value,
);
const plan = computed(
  () => plans.find((item) => item.id === record.value.planId) ?? fallbackPlan,
);
const deleteOpen = computed({
  get: () => variant.value === "delete-confirm-open",
  set: (open) =>
    void replaceVariant(
      router,
      route,
      open ? "delete-confirm-open" : "default",
    ),
});

function remove() {
  removeRecord(record.value.id);
  void replaceHengdongScreen(router, route, "records", "default");
}
</script>

<template>
  <HengdongShell
    title="训练记录"
    screen-id="hengdong.record-detail"
    back-to="records"
  >
    <section
      class="hd-page"
      data-pb-id="hengdong.record-detail.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.record-detail.scroll-list"
        ><div class="hd-content">
          <header
            class="hd-hero"
            data-pb-id="hengdong.record-detail.summary"
            data-pb-role="summary"
            data-pb-token-background="color.success-soft"
            data-pb-token-color="color.on-surface"
            data-pb-token-radius="radius.xl"
            data-pb-token-spacing="spacing.lg"
          >
            <span class="hd-inline"
              ><Chip label="已完成" tone="success" /><span class="hd-caption">{{
                record.date
              }}</span></span
            >
            <h1>{{ record.planName }}</h1>
            <div class="hd-metrics">
              <div class="hd-metric">
                <strong>{{ record.minutes }}</strong
                ><span>训练分钟</span>
              </div>
              <div class="hd-metric">
                <strong>{{ record.completedExerciseIds.length }}</strong
                ><span>完成动作</span>
              </div>
              <div class="hd-metric">
                <strong>{{ record.feeling }}</strong
                ><span>训练感受</span>
              </div>
            </div>
          </header>
          <section class="hd-section">
            <h2 class="hd-section-title">完成动作</h2>
            <DataList inspect-id="hengdong.record-detail.exercise-list"
              ><div
                v-for="exercise in plan.exercises"
                :key="exercise.id"
                class="hd-row"
              >
                <span class="hd-row-main"
                  ><h3>{{ exercise.name }}</h3>
                  <span class="hd-caption">{{
                    exercise.prescription
                  }}</span></span
                ><Chip label="完成" tone="success" /></div
            ></DataList>
          </section>
          <Card semantic-role="section" inspect-id="hengdong.record-detail.note"
            ><div class="hd-card-body">
              <h2 class="hd-card-title">训练备注</h2>
              <p class="hd-muted">{{ record.note || "这次没有留下备注。" }}</p>
            </div></Card
          >
          <Button
            label="删除记录"
            bg-color="color.error-soft"
            border-color="color.error-soft"
            text-color="color.error"
            inspect-id="hengdong.record-detail.delete"
            data-pb-action="open-delete-confirm"
            @click="deleteOpen = true"
          /></div
      ></ScrollableDataList>
      <Confirm
        v-model="deleteOpen"
        title="删除这条训练记录？"
        message="删除后，本周统计也会同步更新。"
        confirm-label="删除"
        inspect-id="hengdong.record-detail.delete-confirm"
        @confirm="remove"
      />
    </section>
  </HengdongShell>
</template>
