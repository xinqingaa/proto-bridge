<script setup lang="ts">
import { computed } from "vue";
import {
  loadPrototypes,
  loadPrototypeScreens,
} from "@/design-system/loaders";
import { LIFECYCLE_LABELS } from "@/design-system/types";

const props = defineProps<{
  prototypeId: string;
}>();

const prototype = computed(() =>
  loadPrototypes().find((item) => item.id === props.prototypeId),
);
const screens = computed(() =>
  loadPrototypeScreens().filter(
    (item) => item.prototypeId === props.prototypeId,
  ),
);
</script>

<template>
  <section v-if="prototype" class="overview">
    <header>
      <p>原型</p>
      <h1>{{ prototype.label }}</h1>
      <div class="meta">
        <v-chip size="small" color="primary" variant="tonal">
          {{ LIFECYCLE_LABELS[prototype.lifecycle] }}
        </v-chip>
        <v-chip
          v-for="owner in prototype.owners ?? []"
          :key="`owner-${owner}`"
          size="small"
          variant="flat"
        >
          {{ owner }}
        </v-chip>
        <v-chip
          v-for="role in prototype.roles ?? []"
          :key="`role-${role}`"
          size="small"
          variant="outlined"
        >
          {{ role }}
        </v-chip>
      </div>
    </header>

    <v-list lines="two" class="screen-list">
      <v-list-item
        v-for="screen in screens"
        :key="screen.screenId"
        :title="screen.label"
        :subtitle="`${screen.variants.length} 个 Variant · ${screen.path}`"
        :to="`/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`"
      />
    </v-list>
  </section>
  <v-alert v-else type="error" variant="tonal"
    >未知原型：{{ prototypeId }}</v-alert
  >
</template>

<style scoped>
.overview {
  width: min(840px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 12px;
  font-size: 1.75rem;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.screen-list {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
</style>
