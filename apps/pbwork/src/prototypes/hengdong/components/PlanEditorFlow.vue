<script setup lang="ts">
import { ref, watch } from "vue";
import Button from "@/design-system/components/action/Button.vue";
import FlowSheet from "@/design-system/components/feedback/FlowSheet.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import type { FitnessPlan, PlanGoal } from "../model";
import { hengdongState, savePlan } from "../storage";

const props = defineProps<{
  modelValue: boolean;
  planId?: string;
  inspectId: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [boolean];
  saved: [planId: string];
}>();

const step = ref(0);
const name = ref("我的轻量训练");
const goal = ref<PlanGoal>("唤醒");
const level = ref<"入门" | "进阶">("入门");
const minutes = ref("20 分钟");
const weeklyTarget = ref("每周 3 次");
const selectedExerciseIds = ref<string[]>([]);
const error = ref("");

const exercisePool = Array.from(
  new Map(
    hengdongState.plans
      .flatMap((plan) => plan.exercises)
      .map((exercise) => [exercise.id, exercise]),
  ).values(),
);

function hydrate() {
  const source = hengdongState.plans.find((plan) => plan.id === props.planId);
  name.value = source?.name ?? "我的轻量训练";
  goal.value = source?.goal ?? "唤醒";
  level.value = source?.level ?? "入门";
  minutes.value = `${source?.minutes ?? 20} 分钟`;
  weeklyTarget.value = `每周 ${source?.weeklyTarget ?? 3} 次`;
  selectedExerciseIds.value =
    source?.exercises.map((exercise) => exercise.id) ??
    exercisePool.slice(0, 3).map((exercise) => exercise.id);
  step.value = 0;
  error.value = "";
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) hydrate();
  },
  { immediate: true },
);

function toggleExercise(exerciseId: string, selected: boolean) {
  if (selected && !selectedExerciseIds.value.includes(exerciseId)) {
    selectedExerciseIds.value.push(exerciseId);
    return;
  }
  if (!selected) {
    selectedExerciseIds.value = selectedExerciseIds.value.filter(
      (id) => id !== exerciseId,
    );
  }
}

function save() {
  if (!name.value.trim() || selectedExerciseIds.value.length === 0) {
    error.value = "请填写计划名称，并至少保留一个动作。";
    return;
  }
  const source = hengdongState.plans.find((plan) => plan.id === props.planId);
  const id = source?.id ?? "custom-light-rhythm";
  const plan: FitnessPlan = {
    id,
    name: name.value.trim(),
    description:
      source?.description ?? "由你安排的一组轻量动作，随时可以继续调整。",
    goal: goal.value,
    level: level.value,
    minutes: Number.parseInt(minutes.value, 10),
    weeklyTarget: Number.parseInt(weeklyTarget.value.replace("每周 ", ""), 10),
    origin: source?.origin ?? "custom",
    exercises: exercisePool.filter((exercise) =>
      selectedExerciseIds.value.includes(exercise.id),
    ),
  };
  savePlan(plan);
  emit("saved", id);
  emit("update:modelValue", false);
}
</script>

<template>
  <FlowSheet
    :model-value="modelValue"
    v-model:step="step"
    :title="planId ? '编辑计划' : '新建计划'"
    :step-count="3"
    :swipe="false"
    :inspect-id="inspectId"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <section class="hd-flow-step">
      <h3>这套计划为了什么？</h3>
      <TextField
        v-model="name"
        label="计划名称"
        :show-label="true"
        inspect-id="hengdong.plan-editor.name"
      />
      <Menu
        v-model="goal"
        label="训练目标"
        :options="['唤醒', '力量', '舒缓']"
        inspect-id="hengdong.plan-editor.goal"
      />
      <Menu
        v-model="level"
        label="难度"
        :options="['入门', '进阶']"
        inspect-id="hengdong.plan-editor.level"
      />
    </section>
    <section class="hd-flow-step">
      <h3>安排一个可完成的节奏</h3>
      <Menu
        v-model="minutes"
        label="单次时长"
        :options="['12 分钟', '15 分钟', '20 分钟', '30 分钟']"
        inspect-id="hengdong.plan-editor.minutes"
      />
      <Menu
        v-model="weeklyTarget"
        label="每周次数"
        :options="['每周 2 次', '每周 3 次', '每周 4 次', '每周 5 次']"
        inspect-id="hengdong.plan-editor.frequency"
      />
      <p class="hd-muted">建议先选择能稳定完成的下限，以后再逐步增加。</p>
    </section>
    <section class="hd-flow-step">
      <h3>选择动作</h3>
      <div class="hd-choice-list">
        <div v-for="exercise in exercisePool" :key="exercise.id" class="hd-row">
          <span class="hd-row-main">
            <strong class="hd-row-title">{{ exercise.name }}</strong>
            <span class="hd-caption">{{ exercise.prescription }}</span>
          </span>
          <Checkbox
            :model-value="selectedExerciseIds.includes(exercise.id)"
            :label="`选择 ${exercise.name}`"
            :inspect-id="`hengdong.plan-editor.exercise.${exercise.id}`"
            @update:model-value="toggleExercise(exercise.id, $event)"
          />
        </div>
      </div>
      <p v-if="error" class="hd-validation" role="alert">{{ error }}</p>
    </section>
    <template #actions>
      <Button
        v-if="step > 0"
        label="上一步"
        bg-color="color.surface"
        border-color="color.border"
        text-color="color.on-surface"
        @click="step -= 1"
      />
      <Button v-if="step < 2" label="下一步" @click="step += 1" />
      <Button
        v-else
        label="保存计划"
        inspect-id="hengdong.plan-editor.save"
        @click="save"
      />
    </template>
  </FlowSheet>
</template>
