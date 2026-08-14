<script setup lang="ts">
defineProps<{
  items: Array<{
    date: string;
    label: string;
    minutes: number;
    active: boolean;
    today: boolean;
  }>;
  totalMinutes: number;
  summary: string;
  inspectId: string;
}>();

defineEmits<{ select: [date: string] }>();
</script>

<template>
  <figure
    class="hd-week-rhythm"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-color="color.primary"
    data-pb-token-background="color.background"
    data-pb-token-spacing="spacing.md"
    aria-label="本周活动节奏"
  >
    <figcaption class="hd-week-rhythm-heading">
      <span class="hd-row-main">
        <strong class="hd-section-title">本周节奏</strong>
        <span class="hd-caption">{{ summary }}</span>
      </span>
      <span class="hd-week-total">
        <strong>{{ totalMinutes }}</strong>
        <small>分钟</small>
      </span>
    </figcaption>

    <div class="hd-week-days" role="group" aria-label="周一至周日活动情况">
      <button
        v-for="item in items"
        :key="item.date"
        type="button"
        class="hd-week-day"
        :class="{ 'is-active': item.active, 'is-today': item.today }"
        :data-pb-id="`${inspectId}.day`"
        :data-pb-key="`day-${item.date}`"
        data-pb-role="button"
        data-pb-token-color="color.primary"
        data-pb-token-spacing="spacing.xs"
        data-pb-token-size="sizing.touch"
        :data-pb-action="
          item.active ? 'open-rhythm-day' : 'show-empty-rhythm-day'
        "
        :aria-label="`${item.label}${item.today ? '，今天' : ''}，${item.minutes ? `${item.minutes} 分钟活动，查看记录` : '暂无活动，查看说明'}`"
        @click="$emit('select', item.date)"
      >
        <small>{{ item.label }}</small>
        <i aria-hidden="true" />
      </button>
    </div>
  </figure>
</template>

<style scoped>
.hd-week-rhythm {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
  margin: var(--pb-spacing-none);
}

.hd-week-rhythm-heading,
.hd-week-days,
.hd-week-day,
.hd-week-total {
  display: flex;
}

.hd-week-rhythm-heading {
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-md);
}

.hd-week-total {
  flex: none;
  align-items: baseline;
  gap: var(--pb-spacing-xs);
  color: var(--pb-color-on-surface);
}

.hd-week-total strong {
  font: var(--pb-typography-title);
}

.hd-week-total small,
.hd-week-day small {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-micro);
}

.hd-week-days {
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}

.hd-week-day {
  flex: var(--pb-layout-flex-fill);
  min-width: var(--pb-spacing-none);
  min-height: var(--pb-sizing-touch);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-none);
  border: none;
  border-radius: var(--pb-radius-sm);
  background: transparent;
  cursor: pointer;
}

.hd-week-day:hover {
  background: var(--pb-color-primary-soft);
}

.hd-week-day:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}

.hd-week-day i {
  box-sizing: border-box;
  width: var(--pb-sizing-step-dot);
  height: var(--pb-sizing-step-dot);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-surface-recessed);
}

.hd-week-day.is-active i {
  border-color: var(--pb-color-primary);
  background: var(--pb-color-primary);
}

.hd-week-day.is-today small {
  color: var(--pb-color-primary);
}

.hd-week-day.is-today i {
  border: var(--pb-border-strong);
  border-color: var(--pb-color-primary);
}
</style>
