<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/design-system/components/action/Button.vue";
import FlowSheet from "@/design-system/components/feedback/FlowSheet.vue";
import Checkbox from "@/design-system/components/input/Checkbox.vue";
import RadioGroup from "@/design-system/components/input/RadioGroup.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import {
  nextCustomPlanId,
  planSaveLabel,
  resolvePlanSaveMode,
  type FitnessPlan,
  type PlanGoal,
} from "../model";
import { hengdongState, savePlanForMode } from "../storage";

const props = defineProps<{
  modelValue: boolean;
  planId?: string;
  inspectId: string;
  initialState?: "default" | "validation-error";
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
const saveMode = computed(() =>
  resolvePlanSaveMode(props.planId, hengdongState.activePlanId),
);
const saveLabel = computed(() => planSaveLabel(saveMode.value));

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
  const showValidation = props.initialState === "validation-error";
  step.value = showValidation ? 2 : 0;
  if (showValidation) selectedExerciseIds.value = [];
  error.value = showValidation ? "请至少保留一个动作。" : "";
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
  const missingName = !name.value.trim();
  const missingExercise = selectedExerciseIds.value.length === 0;
  if (missingName || missingExercise) {
    error.value = missingName
      ? missingExercise
        ? "请填写计划名称，并至少保留一个动作。"
        : "请填写计划名称。"
      : "请至少保留一个动作。";
    return;
  }
  const source = hengdongState.plans.find((plan) => plan.id === props.planId);
  const id = source?.id ?? nextCustomPlanId(hengdongState.plans);
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
  savePlanForMode(plan, saveMode.value);
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
      <div class="hd-flow-intro">
        <span class="hd-overline">计划身份</span>
        <h3>安排训练</h3>
        <p class="hd-muted">先说明这套计划要解决什么，再决定执行节奏。</p>
      </div>
      <TextField
        v-model="name"
        label="计划名称"
        :show-label="true"
        inspect-id="hengdong.plan-editor.name"
      />
      <RadioGroup
        v-model="goal"
        label="训练目标"
        :options="['唤醒', '力量', '舒缓']"
        inspect-id="hengdong.plan-editor.goal"
      />
      <RadioGroup
        v-model="level"
        label="难度"
        :options="['入门', '进阶']"
        inspect-id="hengdong.plan-editor.level"
      />
    </section>
    <section class="hd-flow-step">
      <div class="hd-flow-intro">
        <span class="hd-overline">训练节奏</span>
        <h3>安排一个可完成的节奏</h3>
        <p class="hd-muted">从稳定完成的下限开始，以后再逐步增加。</p>
      </div>
      <RadioGroup
        v-model="minutes"
        label="单次时长"
        :options="['12 分钟', '15 分钟', '20 分钟', '30 分钟']"
        inspect-id="hengdong.plan-editor.minutes"
      />
      <RadioGroup
        v-model="weeklyTarget"
        label="每周次数"
        :options="['每周 2 次', '每周 3 次', '每周 4 次', '每周 5 次']"
        inspect-id="hengdong.plan-editor.frequency"
      />
    </section>
    <section class="hd-flow-step">
      <div class="hd-flow-intro">
        <span class="hd-overline">动作处方</span>
        <h3>选择动作</h3>
        <p class="hd-muted">保留真正会完成的动作，顺序会成为训练步骤。</p>
        <p v-if="error" class="hd-validation" role="alert">{{ error }}</p>
      </div>
      <div class="hd-plan-exercise-options">
        <div v-for="exercise in exercisePool" :key="exercise.id">
          <Checkbox
            class="hd-plan-exercise-check"
            :model-value="selectedExerciseIds.includes(exercise.id)"
            :label="exercise.name + ' · ' + exercise.prescription"
            :inspect-id="'hengdong.plan-editor.exercise.' + exercise.id"
            @update:model-value="toggleExercise(exercise.id, $event)"
          />
        </div>
      </div>
    </section>
    <template #actions>
      <Button
        v-if="step < 2"
        :label="step === 0 ? '继续安排节奏' : '选择动作'"
        block
        @click="step += 1"
      />
      <Button
        v-else
        :label="saveLabel"
        block
        inspect-id="hengdong.plan-editor.save"
        @click="save"
      />
    </template>
  </FlowSheet>
</template>
