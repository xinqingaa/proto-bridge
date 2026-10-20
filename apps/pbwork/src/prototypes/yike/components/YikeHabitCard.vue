<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import GlassSurface from "@/design-system/components/display/GlassSurface.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import YikeHabitGlyph, { type YikeHabitIcon } from "./YikeHabitGlyph.vue";
import artwork from "./punch-artwork.json";
const props = defineProps<{
  inspectId: string;
  face: "mechanical" | "water" | "sundial";
  habit: { id: string; name: string; icon: YikeHabitIcon; meta: string };
  days: readonly { date: string; completed: boolean }[];
  today: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ open: [id: string]; toggleToday: [id: string] }>();
const doneToday = computed(() =>
  props.days.some((day) => day.date === props.today && day.completed),
);
const stamp = computed(() => Array.from(props.habit.name.trim())[0] ?? "印");
const todayRef = ref<HTMLElement | null>(null);
usePbInspect({
  element: todayRef,
  pbId: "yike.habit-today",
  instanceId: () => `${props.inspectId}.today`,
  pbKey: () => props.habit.id,
  getState: () => ({ checked: doneToday.value }),
});
</script>
<template>
  <article
    class="habit-card"
    :class="`is-${face}`"
    :data-pb-id="inspectId"
    data-pb-role="card"
    :data-pb-key="habit.id"
    data-pb-token-radius="radius.surface"
    data-pb-token-padding="spacing.md"
  >
    <GlassSurface :inspect-id="`${inspectId}.surface`" :pb-key="habit.id">
      <div class="habit-content">
        <button
          type="button"
          class="habit-name"
          :data-pb-id="`${inspectId}.open`"
          data-pb-role="button"
          :data-pb-key="habit.id"
          data-pb-token-color="color.on-surface"
          @click="emit('open', habit.id)"
        >
          <YikeHabitGlyph :icon="habit.icon" />
          <span
            ><strong
              :data-pb-id="`${inspectId}.title`"
              :data-pb-key="habit.id"
              data-pb-role="text"
              data-pb-token-typography="typography.subtitle"
              data-pb-token-color="color.on-surface"
              >{{ habit.name }}</strong
            ><small
              :data-pb-id="`${inspectId}.meta`"
              :data-pb-key="habit.id"
              data-pb-role="text"
              data-pb-token-typography="typography.caption"
              data-pb-token-color="color.on-surface-muted"
              >{{ habit.meta }}</small
            ></span
          >
          <Icon name="chevron-right" size="sm" tone="muted" />
        </button>
        <div class="week" :aria-label="`${habit.name}本周记录`">
          <span
            v-for="day in days"
            :key="day.date"
            class="day"
            :class="{
              'is-on': day.completed && day.date <= today,
              'is-today': day.date === today,
              'is-future': day.date > today,
            }"
            :aria-label="`${day.date}：${day.date > today ? '未来' : day.completed ? '已完成' : '未完成'}`"
            :data-pb-id="`${inspectId}.day`"
            data-pb-role="status"
            :data-pb-key="`day-${day.date}`"
            :data-pb-token-color="
              day.completed && day.date <= today
                ? face === 'mechanical' && day.date !== today
                  ? 'color.on-surface'
                  : 'color.primary'
                : day.date === today
                  ? 'color.primary'
                  : 'color.outline'
            "
            data-pb-token-outline="color.outline"
          >
            <svg :viewBox="artwork.viewBox" aria-hidden="true">
              <path v-if="face === 'sundial'" class="hole" :d="artwork.stamp" />
              <path
                v-else-if="
                  face === 'water' && day.completed && day.date <= today
                "
                class="drop"
                :d="artwork.drop"
              />
              <circle
                v-else
                class="hole"
                :cx="artwork.cx"
                :cy="artwork.cy"
                :r="artwork.radius"
              />
              <circle
                v-if="face === 'sundial' && day.completed && day.date <= today"
                class="stamp-dot"
                :cx="artwork.cx"
                :cy="artwork.cy"
                :r="artwork.stampRadius"
              />
            </svg>
          </span>
          <button
            ref="todayRef"
            type="button"
            class="today"
            :class="{ 'is-done': doneToday }"
            :disabled="disabled"
            :aria-pressed="doneToday"
            :aria-label="`${doneToday ? '取消打卡' : '打卡'}：${habit.name}`"
            :data-pb-id="`${inspectId}.today`"
            data-pb-role="button"
            :data-pb-key="habit.id"
            :data-pb-token-color="
              face === 'mechanical' && doneToday
                ? 'color.on-primary'
                : 'color.primary'
            "
            :data-pb-token-background="
              face === 'mechanical' && doneToday
                ? 'color.primary'
                : 'transparent'
            "
            data-pb-token-border="border.default"
            data-pb-token-size="size.touch"
            @click="emit('toggleToday', habit.id)"
          >
            <Icon
              v-if="face === 'mechanical'"
              :name="doneToday ? 'check' : 'plus'"
              size="sm"
            />
            <svg
              v-else-if="face === 'water'"
              :viewBox="artwork.viewBox"
              aria-hidden="true"
            >
              <path :d="artwork.drop" />
            </svg>
            <span v-else-if="face === 'sundial'" aria-hidden="true">{{
              stamp
            }}</span>
          </button>
        </div>
      </div>
    </GlassSurface>
  </article>
</template>
<style scoped>
.habit-card {
  border-radius: var(--pb-radius-surface);
}
.habit-content {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-xs) var(--pb-spacing-md);
  border-radius: var(--pb-radius-surface);
}
button {
  border: none;
  background: transparent;
  cursor: pointer;
}
button:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
.habit-name {
  display: flex;
  align-items: center;
  gap: calc(var(--pb-spacing-sm) + var(--pb-spacing-xxs));
  min-block-size: var(--pb-size-touch);
  padding: var(--pb-layout-zero);
  color: var(--pb-color-on-surface);
  text-align: start;
}
.habit-name > span {
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  overflow-wrap: anywhere;
}
strong {
  display: block;
  font: var(--pb-typography-subtitle);
}
small {
  display: block;
  margin-block-start: var(--pb-spacing-xxs);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.week {
  display: flex;
  align-items: center;
}
.day {
  display: flex;
  justify-content: center;
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
}
.day svg {
  inline-size: calc(var(--pb-spacing-sm-plus) + var(--pb-spacing-xxs));
  block-size: calc(var(--pb-spacing-sm-plus) + var(--pb-spacing-xxs));
  overflow: visible;
}
.hole {
  fill: transparent;
  stroke: var(--pb-color-outline);
  stroke-width: var(--pb-border-width);
}
.is-today .hole {
  stroke: var(--pb-color-primary);
}
.is-mechanical .is-on .hole {
  fill: var(--pb-color-on-surface);
  stroke: var(--pb-color-on-surface);
}
.is-mechanical .is-on.is-today .hole,
.drop,
.stamp-dot {
  fill: var(--pb-color-primary);
  stroke: var(--pb-color-primary);
}
.is-future {
  opacity: var(--pb-opacity-disabled);
}
.today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  inline-size: var(--pb-size-touch);
  block-size: var(--pb-size-touch);
  margin-inline-start: var(--pb-spacing-sm);
  padding: var(--pb-layout-zero);
  border: var(--pb-border-default);
  border-radius: var(--pb-radius-pill);
  color: var(--pb-color-primary);
}
.today svg {
  inline-size: var(--pb-size-icon);
  block-size: var(--pb-size-icon);
  fill: transparent;
  stroke: currentColor;
  stroke-width: var(--pb-border-width);
}
.is-mechanical .today.is-done {
  color: var(--pb-color-on-primary);
  background: var(--pb-color-primary);
  border-color: var(--pb-color-primary);
}
.today.is-done svg {
  fill: currentColor;
}
.today span {
  font: var(--pb-typography-title-sm);
  color: var(--pb-color-on-surface-muted);
  opacity: var(--pb-opacity-disabled);
}
.today.is-done {
  border-color: var(--pb-color-primary);
}
.today.is-done span {
  color: var(--pb-color-primary);
  opacity: var(--pb-opacity-visible);
}
.today:disabled {
  opacity: var(--pb-opacity-disabled);
  cursor: default;
}
</style>

<style scoped>
.today,
.hole,
.drop,
.stamp-dot {
  transition:
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    background-color var(--pb-motion-duration-short)
      var(--pb-motion-easing-standard),
    color var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    fill var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    stroke var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.today:active:not(:disabled) {
  transform: scale(var(--pb-motion-press-scale));
}
.day.is-today.is-on svg,
.today.is-done svg,
.today.is-done > span {
  transform-origin: center;
  animation: yike-punch var(--pb-motion-duration-medium)
    var(--pb-motion-easing-emphasized);
}
.is-water .day.is-today.is-on svg,
.is-water .today.is-done svg {
  animation-name: yike-drop;
}
.is-sundial .day.is-today.is-on svg,
.is-sundial .today.is-done > span {
  animation-name: yike-stamp;
}
@keyframes yike-punch {
  from {
    transform: translateY(var(--pb-layout-inset-xs-negative));
    opacity: var(--pb-opacity-hidden);
  }
  to {
    transform: none;
    opacity: var(--pb-opacity-visible);
  }
}
@keyframes yike-drop {
  from {
    transform: translateY(var(--pb-layout-inset-sm-negative))
      scale(var(--pb-motion-press-scale-strong));
    opacity: var(--pb-opacity-hidden);
  }
  to {
    transform: none;
    opacity: var(--pb-opacity-visible);
  }
}
@keyframes yike-stamp {
  from {
    transform: scale(
      calc(var(--pb-layout-flex-grow) / var(--pb-motion-press-scale-strong))
    );
    opacity: var(--pb-opacity-hidden);
  }
  to {
    transform: none;
    opacity: var(--pb-opacity-visible);
  }
}
@media (prefers-reduced-motion: reduce) {
  .today,
  .hole,
  .drop,
  .stamp-dot {
    transition: none;
  }
  .day.is-today.is-on svg,
  .today.is-done svg,
  .today.is-done > span {
    animation: none;
  }
}
</style>
