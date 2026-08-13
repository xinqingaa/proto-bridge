<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import HengdongShell from "../HengdongShell.vue";
import { plans, type Exercise } from "../model";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import { getPlans, savePlan } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const storedPlans = getPlans();
const fallbackPlan = storedPlans[0] ?? plans[0]!;
const exerciseSource = plans[1]!;
const source = storedPlans.find((item) => item.id === route.query.plan);
const name = ref(source?.name ?? "我的轻量训练");
const level = ref(source?.level ?? "入门");
const minutes = ref(`${source?.minutes ?? 20} 分钟`);
const weeklyTarget = ref(`每周 ${source?.weeklyTarget ?? 3} 次`);
const exercises = ref<Exercise[]>(
  source?.exercises.slice() ?? fallbackPlan.exercises.slice(0, 2),
);
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));
const sheetOpen = computed({
  get: () => variant.value === "exercise-sheet-open",
  set: (open) =>
    void replaceVariant(
      router,
      route,
      open ? "exercise-sheet-open" : "default",
    ),
});

function addExercise(exercise: Exercise) {
  if (!exercises.value.some((item) => item.id === exercise.id))
    exercises.value.push(exercise);
  sheetOpen.value = false;
}

function save() {
  savePlan({
    id: source?.id ?? "custom-light",
    name: name.value,
    description: "由你创建的本地训练计划。",
    level: level.value as "入门" | "进阶",
    minutes: Number.parseInt(minutes.value, 10),
    weeklyTarget: Number.parseInt(weeklyTarget.value.replace("每周 ", ""), 10),
    exercises: exercises.value,
  });
  toast.value = true;
  void replaceHengdongScreen(router, route, "plans", "default");
}
</script>

<template>
  <HengdongShell
    :title="source ? '编辑计划' : '新建计划'"
    screen-id="hengdong.plan-editor"
    back-to="plans"
  >
    <section
      class="hd-page"
      data-pb-id="hengdong.plan-editor.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.plan-editor.scroll-list"
      >
        <form
          class="hd-content"
          data-pb-id="hengdong.plan-editor.form"
          data-pb-role="form"
          data-pb-token-spacing="spacing.md"
          @submit.prevent="save"
        >
          <section class="hd-section">
            <h2 class="hd-section-title">基础信息</h2>
            <TextField
              v-model="name"
              label="计划名称"
              :show-label="true"
              inspect-id="hengdong.plan-editor.name"
            /><Menu
              v-model="level"
              label="难度"
              :options="['入门', '进阶']"
              inspect-id="hengdong.plan-editor.level"
            /><Menu
              v-model="minutes"
              label="单次时长"
              :options="['15 分钟', '20 分钟', '30 分钟', '45 分钟']"
              inspect-id="hengdong.plan-editor.minutes"
            /><Menu
              v-model="weeklyTarget"
              label="每周目标"
              :options="['每周 2 次', '每周 3 次', '每周 4 次', '每周 5 次']"
              inspect-id="hengdong.plan-editor.frequency"
            />
          </section>
          <section class="hd-section">
            <div class="hd-row-head">
              <h2 class="hd-section-title">动作安排</h2>
              <Button
                label="添加动作"
                size="sm"
                bg-color="color.primary-soft"
                border-color="color.primary-soft"
                text-color="color.primary"
                inspect-id="hengdong.plan-editor.add"
                data-pb-action="open-exercise-sheet"
                @click="sheetOpen = true"
              />
            </div>
            <DataList inspect-id="hengdong.plan-editor.exercise-list"
              ><div
                v-for="exercise in exercises"
                :key="exercise.id"
                class="hd-row"
              >
                <span class="hd-row-main"
                  ><h3>{{ exercise.name }}</h3>
                  <span class="hd-caption">{{
                    exercise.prescription
                  }}</span></span
                ><Button
                  label="移除"
                  size="sm"
                  bg-color="color.error-soft"
                  border-color="color.error-soft"
                  text-color="color.error"
                  @click="
                    exercises = exercises.filter(
                      (item) => item.id !== exercise.id,
                    )
                  "
                /></div
            ></DataList>
          </section>
          <Button
            label="保存计划"
            block
            inspect-id="hengdong.plan-editor.save"
            data-pb-action="save-plan"
            @click="save"
          />
        </form>
      </ScrollableDataList>
      <BottomSheet
        v-model="sheetOpen"
        title="选择动作"
        inspect-id="hengdong.plan-editor.exercise-sheet"
        ><DataList inspect-id="hengdong.plan-editor.exercise-options"
          ><button
            v-for="exercise in exerciseSource.exercises"
            :key="exercise.id"
            type="button"
            class="hd-row hd-list-button"
            @click="addExercise(exercise)"
          >
            <span class="hd-row-main"
              ><h3>{{ exercise.name }}</h3>
              <span class="hd-caption">{{ exercise.prescription }}</span></span
            ><strong>＋</strong>
          </button></DataList
        ></BottomSheet
      >
      <Toast
        v-model="toast"
        message="计划已保存到此设备"
        inspect-id="hengdong.plan-editor.toast"
      />
    </section>
  </HengdongShell>
</template>
