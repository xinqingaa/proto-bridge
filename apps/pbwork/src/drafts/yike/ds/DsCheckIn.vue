<script setup lang="ts">
import { computed } from "vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import Card from "@/design-system/components/display/Card.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import ProgressIndicator from "@/design-system/components/display/ProgressIndicator.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import HabitGlyph from "../HabitGlyph.vue";
import {
  TODAY_INDEX,
  TODAY_LABEL,
  WEEKDAYS,
  frequencyLabel,
  habitProgress,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();
const emit = defineEmits<{ create: [] }>();

const habits = computed(() => props.model.habits.value);
const done = computed(() => props.model.habitsDoneToday.value);
</script>

<template>
  <section class="yd-page" aria-label="打卡">
    <AppBar
      title="打卡"
      show-action
      action-icon="plus"
      action-label="新建习惯"
      inspect-id="yike-draft.checkin.app-bar"
      @action="emit('create')"
    />

    <div v-if="habits.length" class="yd-scroll">
      <Card class="yd-summary" inspect-id="yike-draft.checkin.summary">
        <span class="yd-caption">{{ TODAY_LABEL }}</span>
        <span class="yd-summary-number">
          <strong>{{ done }}</strong>
          <span>/ {{ habits.length }} 已完成</span>
        </span>
        <ProgressIndicator
          :value="(done / habits.length) * 100"
          inspect-id="yike-draft.checkin.progress"
        />
      </Card>

      <DataList surface="raised" inspect-id="yike-draft.checkin.habits">
        <div v-for="habit in habits" :key="habit.id" class="yd-habit">
          <span
            class="yd-habit-glyph"
            :class="{ 'is-done': habit.week[TODAY_INDEX] }"
          >
            <HabitGlyph :icon="habit.icon" />
          </span>
          <div class="yd-habit-body">
            <strong>{{ habit.name }}</strong>
            <span>
              {{ frequencyLabel(habit.frequency) }} · 本周
              {{ habitProgress(habit).done }}/{{ habitProgress(habit).goal }}
            </span>
            <span class="yd-week" aria-hidden="true">
              <span
                v-for="(value, index) in habit.week"
                :key="index"
                :class="{
                  'is-done': value,
                  'is-today': index === TODAY_INDEX,
                  'is-future': index > TODAY_INDEX,
                }"
                :title="`周${WEEKDAYS[index]}`"
              />
            </span>
          </div>
          <IconButton
            icon="check"
            size="lg"
            :variant="habit.week[TODAY_INDEX] ? 'flat' : 'outlined'"
            :tone="habit.week[TODAY_INDEX] ? 'primary' : 'secondary'"
            :ariaLabel="
              habit.week[TODAY_INDEX]
                ? `取消打卡：${habit.name}`
                : `打卡：${habit.name}`
            "
            :inspect-id="`yike-draft.checkin.punch.${habit.id}`"
            @click="model.toggleHabit(habit.id)"
          />
        </div>
      </DataList>
    </div>

    <EmptyState
      v-else
      class="yd-empty"
      title="还没有习惯"
      description="从一个很小的开始，比如“喝一杯水”。"
      action-label="新建习惯"
      inspect-id="yike-draft.checkin.empty"
      @action="emit('create')"
    />
  </section>
</template>
