<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight } from "lucide-vue-next";
import type { ScreenRecord } from "@/design-system/types";

const props = withDefaults(
  defineProps<{
    prototypeId: string;
    screen: ScreenRecord;
    density?: "default" | "compact";
  }>(),
  { density: "default" },
);

const compact = computed(() => props.density === "compact");
const defaultVariant = computed(
  () =>
    props.screen.variants.find(
      (variant) => variant.id === props.screen.defaultVariantId,
    ) ?? props.screen.variants[0],
);
const workbenchUrl = computed(
  () =>
    `/workbench/prototypes/${props.prototypeId}/screens/${props.screen.screenSlug}`,
);
</script>

<template>
  <RouterLink
    class="screen-card"
    :class="{ compact }"
    :to="workbenchUrl"
  >
    <div class="page-silhouette" aria-hidden="true">
      <div class="page-topbar">
        <span />
        <i />
      </div>
      <div class="page-body">
        <span class="page-title-line" />
        <span class="page-hero-block" />
        <div v-if="!compact" class="page-row"><i /><span /></div>
        <div v-if="!compact" class="page-row"><i /><span /></div>
      </div>
      <span class="page-number">{{ screen.variants.length }}</span>
    </div>

    <div class="card-content">
      <div>
        <h3>{{ screen.label }}</h3>
        <p>
          {{ defaultVariant?.label ?? screen.defaultVariantId }} ·
          {{ screen.variants.length }} 个状态
        </p>
      </div>
      <ArrowRight :size="compact ? 14 : 16" aria-hidden="true" />
    </div>
  </RouterLink>
</template>

<style scoped>
.screen-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}
.screen-card.compact {
  border-radius: 12px;
}
.screen-card:hover,
.screen-card:focus-visible {
  transform: translateY(-2px);
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 36%,
    transparent
  );
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
  outline: none;
}
.screen-card:focus-visible {
  box-shadow:
    0 0 0 2px color-mix(in srgb, rgb(var(--v-theme-primary)) 24%, transparent),
    0 10px 22px rgba(15, 23, 42, 0.07);
}
.page-silhouette {
  position: relative;
  height: 132px;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 3%,
    rgb(var(--v-theme-background))
  );
}
.compact .page-silhouette {
  height: 78px;
  padding: 8px 16px;
}
.page-silhouette::before {
  position: absolute;
  inset: 12px 24px 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 0;
  border-radius: 9px 9px 0 0;
  background: rgb(var(--v-theme-surface));
  content: "";
}
.compact .page-silhouette::before {
  inset: 8px 16px 0;
  border-radius: 7px 7px 0 0;
}
.page-topbar,
.page-body {
  position: relative;
  z-index: 1;
}
.page-topbar {
  display: flex;
  height: 25px;
  align-items: center;
  justify-content: space-between;
  padding: 0 9px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.55);
}
.compact .page-topbar {
  height: 18px;
  padding: 0 7px;
}
.page-topbar span {
  width: 34px;
  height: 5px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.14);
}
.compact .page-topbar span {
  width: 24px;
  height: 4px;
}
.page-topbar i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
}
.compact .page-topbar i {
  width: 9px;
  height: 9px;
}
.page-body {
  display: grid;
  gap: 7px;
  padding: 10px;
}
.compact .page-body {
  gap: 5px;
  padding: 7px;
}
.page-body > span,
.page-row i,
.page-row span {
  display: block;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.075);
}
.page-title-line {
  width: 34%;
  height: 5px;
}
.compact .page-title-line {
  height: 4px;
}
.page-hero-block {
  width: 100%;
  height: 29px;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 8%,
    transparent
  ) !important;
}
.compact .page-hero-block {
  height: 18px;
}
.page-row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.page-row i {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}
.page-row span {
  width: 56%;
  height: 5px;
}
.page-number {
  position: absolute;
  top: 9px;
  right: 11px;
  z-index: 2;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.62rem;
  font-weight: 750;
}
.compact .page-number {
  top: 6px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  font-size: 0.56rem;
}
.card-content {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}
.compact .card-content {
  min-height: 0;
  gap: 8px;
  padding: 8px 10px;
}
.card-content h3 {
  margin: 0;
  font-size: 0.88rem;
}
.compact .card-content h3 {
  font-size: 0.78rem;
}
.card-content p {
  margin: 3px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.66rem;
}
.compact .card-content p {
  margin: 2px 0 0;
  font-size: 0.6rem;
}
.card-content > svg {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.34);
  transition:
    color 160ms ease,
    transform 160ms ease;
}
.screen-card:hover .card-content > svg {
  transform: translateX(2px);
  color: rgb(var(--v-theme-primary));
}
@media (prefers-reduced-motion: reduce) {
  .screen-card,
  .card-content > svg {
    transition: none;
  }
}
</style>
