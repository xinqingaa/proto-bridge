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

    <div class="hd-week-days" role="list" aria-label="周一至周日活动情况">
      <span
        v-for="item in items"
        :key="item.date"
        class="hd-week-day"
        :class="{ 'is-active': item.active, 'is-today': item.today }"
        role="listitem"
        :aria-label="`${item.label}${item.today ? '，今天' : ''}，${item.minutes ? `${item.minutes} 分钟活动` : '暂无活动'}`"
      >
        <small>{{ item.label }}</small>
        <i aria-hidden="true" />
      </span>
    </div>
  </figure>
</template>

<style scoped>
.hd-week-rhythm {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
  margin: var(--pb-spacing-none);
  padding: var(--pb-spacing-md) var(--pb-spacing-none);
  border-top: var(--pb-border-hairline);
  border-bottom: var(--pb-border-hairline);
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
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xs);
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
  font: var(--pb-typography-caption-strong);
}

.hd-week-day.is-today i {
  border: var(--pb-border-strong);
  border-color: var(--pb-color-primary);
}
</style>
