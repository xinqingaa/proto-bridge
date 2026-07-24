<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ChevronRight } from "lucide-vue-next";
import type {
  PrototypeScreenGroup,
  ScreenRecord,
} from "@/design-system/types";
import { resolveScreenGroups } from "./resolveScreenGroups";

const props = defineProps<{
  prototypeId: string;
  screens: ScreenRecord[];
  groups?: PrototypeScreenGroup[];
}>();

const resolvedGroups = computed(() =>
  resolveScreenGroups(props.screens, props.groups ?? []),
);
</script>

<template>
  <div class="flow-groups" aria-label="按模块分组的页面结构">
    <section
      v-for="group in resolvedGroups"
      :key="group.id"
      class="flow-group"
    >
      <h3>{{ group.label }}</h3>
      <ol>
        <template
          v-for="(screen, index) in group.screens"
          :key="screen.screenId"
        >
          <li>
            <RouterLink
              class="flow-chip"
              :to="`/workbench/prototypes/${prototypeId}/screens/${screen.screenSlug}`"
            >
              {{ screen.label }}
            </RouterLink>
          </li>
          <li
            v-if="index < group.screens.length - 1"
            class="flow-sep"
            aria-hidden="true"
          >
            <ChevronRight :size="12" />
          </li>
        </template>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.flow-groups {
  display: grid;
  gap: 8px;
}
.flow-group {
  display: grid;
  gap: 5px;
}
.flow-group h3 {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.64rem;
  font-weight: 750;
  letter-spacing: 0.04em;
}
.flow-group ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.flow-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 4px 9px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 6%,
    rgb(var(--v-theme-surface))
  );
  color: rgba(var(--v-theme-on-surface), 0.82);
  font-size: 0.68rem;
  font-weight: 650;
  text-decoration: none;
  transition:
    border-color 150ms ease,
    background 150ms ease,
    color 150ms ease;
}
.flow-chip:hover,
.flow-chip:focus-visible {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 42%,
    transparent
  );
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 12%,
    rgb(var(--v-theme-surface))
  );
  color: rgb(var(--v-theme-primary));
  outline: none;
}
.flow-sep {
  display: grid;
  place-items: center;
  color: rgba(var(--v-theme-on-surface), 0.28);
}
@media (prefers-reduced-motion: reduce) {
  .flow-chip {
    transition: none;
  }
}
</style>
