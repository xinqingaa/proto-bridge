<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import type {
  PrototypeLifecycle,
  PrototypeRecord,
} from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { useCommentsStore } from "@/app/stores/comments";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import AtmosphereLayer from "@/workbench/prototypes/AtmosphereLayer.vue";
import LifecycleTransitionDialog, {
  type LifecycleIntent,
} from "@/workbench/prototypes/LifecycleTransitionDialog.vue";
import LifecycleFinalizationSheet from "@/workbench/prototypes/LifecycleFinalizationSheet.vue";
import {
  atmosphereStyle,
  prototypeShortLabel,
  prototypeSummary,
} from "@/workbench/prototypes/prototypePresentation";
import {
  finalizeActionLabel,
  operationCaption,
  ownersAndRoles,
  prototypeChapters,
  prototypeStats,
  screensLine,
} from "@/workbench/prototypes/workMap";

const props = defineProps<{
  lifecycle?: "all" | PrototypeLifecycle | undefined;
}>();
const router = useRouter();
const state = usePrototypeLifecycleStore();
const comments = useCommentsStore();
const all = loadPrototypes();
const screens = loadPrototypeScreens();
state.ensurePrototypes(all);

const editing = ref<PrototypeRecord | null>(null);
const intent = ref<LifecycleIntent>("advance");
let pollTimer: ReturnType<typeof setInterval> | undefined;

const stages: PrototypeLifecycle[] = [
  "active",
  "review",
  "final",
  "archived",
];

const selectedFilter = computed(() => props.lifecycle ?? "all");
const items = computed(() =>
  all.filter(
    (item) =>
      selectedFilter.value === "all" ||
      state.effectiveLifecycle(item) === selectedFilter.value,
  ),
);
const rail = computed(() =>
  stages.map((id) => ({
    id,
    label: LIFECYCLE_LABELS[id],
    count: all.filter((item) => state.effectiveLifecycle(item) === id).length,
  })),
);

type RoomAction = {
  label: string;
  tone: "primary" | "ghost" | "danger";
  run: () => void;
  /** Stays usable during an unfinished finalization so its sheet can reopen. */
  resumesFinalization?: boolean;
};

function record(item: PrototypeRecord) {
  return state.recordFor(item.id);
}

function chaptersOf(item: PrototypeRecord) {
  return prototypeChapters(
    screens.filter((screen) => screen.prototypeId === item.id),
    item.screenGroups ?? [],
  );
}

function statsOf(item: PrototypeRecord) {
  const counts = prototypeStats(
    screens.filter((screen) => screen.prototypeId === item.id),
  );
  return {
    ...counts,
    chapters: chaptersOf(item).length,
    comments: comments.comments.filter(
      (comment) => comment.prototypeId === item.id && comment.status === "open",
    ).length,
  };
}

function isBusy(item: PrototypeRecord) {
  const operation = record(item)?.operation;
  return (
    operation?.kind === "finalizing" || operation?.kind === "rolling-back"
  );
}

function isFinalizing(item: PrototypeRecord) {
  return record(item)?.operation.kind === "finalizing";
}

function captionOf(item: PrototypeRecord) {
  const current = record(item);
  return operationCaption(current?.operation, Boolean(current?.artifacts));
}

function openArtifacts(item: PrototypeRecord) {
  const artifacts = record(item)?.artifacts;
  if (!artifacts) return;
  void router.push(
    `/workbench/evidence/${artifacts.bundleId}/${artifacts.snapshotId}`,
  );
}

function openTransition(item: PrototypeRecord, nextIntent: LifecycleIntent) {
  editing.value = item;
  intent.value = nextIntent;
}

function roomActions(item: PrototypeRecord): RoomAction[] {
  const stage = state.effectiveLifecycle(item);
  if (stage === "active") {
    return [
      {
        label: "送交待确定",
        tone: "primary",
        run: () => openTransition(item, "advance"),
      },
    ];
  }
  if (stage === "review") {
    return [
      {
        label: finalizeActionLabel(record(item)?.operation),
        tone: "primary",
        run: () => openTransition(item, "finalize"),
        resumesFinalization: true,
      },
      {
        label: "退回进行中",
        tone: "ghost",
        run: () => openTransition(item, "return-active"),
      },
    ];
  }
  if (stage === "final") {
    return [
      {
        label: "查看定稿产物",
        tone: "primary",
        run: () => openArtifacts(item),
      },
      {
        label: "回退待确定",
        tone: "ghost",
        run: () => openTransition(item, "rollback"),
      },
      {
        label: "归档",
        tone: "danger",
        run: () => openTransition(item, "archive"),
      },
    ];
  }
  return [
    {
      label: "查看归档产物",
      tone: "primary",
      run: () => openArtifacts(item),
    },
  ];
}

function selectFilter(value: "all" | PrototypeLifecycle) {
  void router.push(`/workbench/prototypes/${value}`);
}

async function pollOperations() {
  for (const item of all) {
    const operation = record(item)?.operation;
    if (operation?.kind === "finalizing" && operation.phase === "capturing") {
      await state.pollFinalization(item);
    }
  }
}

onMounted(() => {
  void pollOperations();
  pollTimer = setInterval(() => void pollOperations(), 1000);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <section class="catalog-page">
    <header class="catalog-head">
      <h1>全部原型</h1>
      <p>
        {{ items.length }}
        {{ selectedFilter === "all" ? "件在制作品" : "件在此阶段" }}
      </p>
    </header>

    <nav class="rail" aria-label="筛选原型">
      <button
        type="button"
        class="rail-all"
        :class="{ 'is-current': selectedFilter === 'all' }"
        :aria-pressed="selectedFilter === 'all'"
        @click="selectFilter('all')"
      >
        全部 <b>{{ all.length }}</b>
      </button>
      <div class="rail-track">
        <button
          v-for="station in rail"
          :key="station.id"
          type="button"
          :class="{
            'is-empty': station.count === 0,
            'is-current': selectedFilter === station.id,
          }"
          :aria-pressed="selectedFilter === station.id"
          @click="selectFilter(station.id)"
        >
          {{ station.label }} <b>{{ station.count }}</b>
        </button>
      </div>
    </nav>

    <section v-if="state.storageError" class="storage-error" role="alert">
      {{ state.storageError }}
    </section>

    <div v-if="items.length" class="wall">
      <article
        v-for="item in items"
        :key="item.id"
        class="room"
        :style="atmosphereStyle(item.id)"
      >
        <AtmosphereLayer compact />
        <RouterLink
          class="room-open"
          :to="`/workbench/prototypes/${item.id}`"
          :aria-label="`打开 ${item.label}`"
        >
          <div class="room-top">
            <span class="kicker">{{ prototypeShortLabel(item) }}</span>
            <span class="stage-pill">{{
              LIFECYCLE_LABELS[state.effectiveLifecycle(item)]
            }}</span>
          </div>
          <h2>{{ item.label }}</h2>
          <p class="summary">{{ prototypeSummary(item) }}</p>
          <p class="people">{{ ownersAndRoles(item) }}</p>
          <ul class="chapters">
            <li v-for="chapter in chaptersOf(item)" :key="chapter.id">
              <em>{{ chapter.label }}</em>
              <span>{{
                screensLine(
                  chapter.sequential,
                  chapter.screens.map((screen) => screen.label),
                )
              }}</span>
            </li>
          </ul>
          <div class="metrics">
            <span
              ><b>{{ statsOf(item).screens }}</b> 页面</span
            >
            <span
              ><b>{{ statsOf(item).variants }}</b> 状态</span
            >
            <span
              ><b>{{ statsOf(item).chapters }}</b> 模块</span
            >
            <span v-if="statsOf(item).comments"
              ><b>{{ statsOf(item).comments }}</b> 条评审</span
            >
          </div>
        </RouterLink>
        <p v-if="captionOf(item).status" class="status">
          {{ captionOf(item).status }}
        </p>
        <p v-if="captionOf(item).failure" class="failure">
          {{ captionOf(item).failure }}
        </p>
        <div class="room-actions">
          <WorkbenchButton
            v-for="action in roomActions(item)"
            :key="action.label"
            :tone="action.tone"
            :disabled="isBusy(item) && !(action.resumesFinalization && isFinalizing(item))"
            :loading="record(item)?.operation.kind === 'rolling-back' && action.tone === 'primary'"
            @click="action.run"
          >
            {{ action.label }}
          </WorkbenchButton>
        </div>
      </article>
    </div>
    <p v-else class="empty">此阶段还没有作品。</p>
  </section>

  <LifecycleTransitionDialog
    v-if="editing && intent !== 'finalize'"
    :model-value="true"
    :prototype="editing"
    :intent="intent"
    @changed="editing = null"
    @update:model-value="!$event && (editing = null)"
  />
  <LifecycleFinalizationSheet
    v-if="editing && intent === 'finalize'"
    :model-value="true"
    :prototype="editing"
    @update:model-value="!$event && (editing = null)"
  />
</template>

<style scoped>
.catalog-page {
  width: min(1240px, 100%);
  margin: 0 auto;
  color: rgb(var(--v-theme-on-surface));
}

.catalog-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.catalog-head h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 650;
  letter-spacing: -0.045em;
}

.catalog-head p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.8rem;
}

.rail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.rail button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.rail-all,
.rail-track button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border-radius: 9px;
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1;
}

.rail-all {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.48);
}

.rail-all b,
.rail-track b {
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rail-all.is-current {
  border-color: rgb(var(--v-theme-on-surface)) !important;
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}

.rail-track {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  padding: 3px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}


.rail-track button {
  position: relative;
  z-index: 1;
  min-width: 0;
  flex: 1;
  justify-content: center;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.rail-track button.is-empty {
  opacity: 0.42;
}

.rail-track button.is-current {
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
  opacity: 1;
}

.storage-error,
.empty {
  padding: 18px;
  border-radius: 12px;
  font-size: 0.84rem;
}

.storage-error {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-error)) 35%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 8%, transparent);
  color: rgb(var(--v-theme-error));
}

.empty {
  color: rgba(var(--v-theme-on-surface), 0.52);
}

.wall {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 18px;
}

.room {
  position: relative;
  display: flex;
  width: calc(50% - 9px);
  min-height: 520px;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--stage-ink) 12%, transparent);
  border-radius: 24px;
  background: var(--stage-ground);
  color: var(--stage-ink);
  box-shadow: 0 18px 40px rgba(8, 12, 20, 0.16);
}

.room-open,
.room-actions,
.status,
.failure {
  position: relative;
  z-index: 1;
}

.room-open {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  padding: 26px 26px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.room-open:focus-visible {
  outline: 2px solid var(--stage-ink);
  outline-offset: -8px;
}

.room-top {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kicker {
  color: var(--stage-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.stage-pill {
  padding: 3px 8px;
  border: 1px solid color-mix(in srgb, var(--stage-ink) 22%, transparent);
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 750;
}

.room-open h2 {
  overflow: hidden;
  width: 100%;
  margin: 16px 0 0;
  font-size: clamp(1.45rem, 2.2vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.045em;
  line-height: 1.12;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary {
  margin: 8px 0 0;
  color: var(--stage-muted);
  font-size: 0.88rem;
}

.people {
  margin: 6px 0 0;
  color: color-mix(in srgb, var(--stage-ink) 58%, transparent);
  font-size: 0.72rem;
}

.chapters {
  display: flex;
  width: 100%;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  margin: 22px 0 0;
  padding: 16px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--stage-ink) 14%, transparent);
  list-style: none;
}

.chapters li {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chapters em {
  color: color-mix(in srgb, var(--stage-ink) 52%, transparent);
  font-size: 0.64rem;
  font-style: normal;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.chapters span {
  font-size: 0.8rem;
  line-height: 1.45;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 20px;
  color: var(--stage-muted);
  font-size: 0.66rem;
}

.metrics b {
  display: block;
  color: var(--stage-ink);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.status,
.failure {
  margin: 0;
  padding: 0 26px;
  font-size: 0.72rem;
  font-weight: 700;
}

.failure {
  color: #f0a39b;
}

.room-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 26px 22px;
}

.room-actions :deep(.wb-button.is-primary),
.room-actions :deep(.wb-button.is-primary:hover:not(:disabled)) {
  border-color: var(--stage-ink);
  background: var(--stage-ink);
  color: var(--stage-ground);
}

.room-actions :deep(.wb-button.is-ghost) {
  border-color: color-mix(in srgb, var(--stage-ink) 22%, transparent);
  background: transparent;
  color: var(--stage-ink);
}

.room-actions :deep(.wb-button.is-danger) {
  border-color: transparent;
  background: transparent;
  color: #f0a39b;
}

@media (max-width: 860px) {
  .room {
    width: 100%;
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .rail-all,
  .rail-track button {
    transition: none;
  }
}
</style>
