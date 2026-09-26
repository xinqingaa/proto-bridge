<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { ArrowRight, ChevronDown } from "lucide-vue-next";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { LIFECYCLE_LABELS } from "@/design-system/types";
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
  canvasPath,
  finalizeActionLabel,
  formatLastEvent,
  operationCaption,
  ownersAndRoles,
  prototypeChapters,
  rollbackActionLabel,
} from "@/workbench/prototypes/workMap";

const props = defineProps<{
  prototypeId: string;
}>();
const lifecycle = usePrototypeLifecycleStore();
const router = useRouter();
const transitionOpen = ref(false);
const transitionIntent = ref<LifecycleIntent>("advance");
let pollTimer: ReturnType<typeof setInterval> | undefined;
const stages = ["active", "review", "final", "archived"] as const;

const prototype = computed(() =>
  loadPrototypes().find((item) => item.id === props.prototypeId),
);
lifecycle.ensurePrototypes(loadPrototypes());
const screens = computed(() =>
  loadPrototypeScreens().filter(
    (item) => item.prototypeId === props.prototypeId,
  ),
);
const chapters = computed(() =>
  prototype.value
    ? prototypeChapters(screens.value, prototype.value.screenGroups ?? [])
    : [],
);
const finalizedArtifacts = computed(
  () => lifecycle.recordFor(props.prototypeId)?.artifacts ?? null,
);
const effectiveLifecycle = computed(() =>
  prototype.value ? lifecycle.effectiveLifecycle(prototype.value) : "active",
);
const currentStageIndex = computed(() =>
  stages.findIndex((stage) => stage === effectiveLifecycle.value),
);
const lastEvent = computed(() => {
  const history = lifecycle.historyFor(props.prototypeId);
  return formatLastEvent(history[0]);
});
const operation = computed(
  () => lifecycle.recordFor(props.prototypeId)?.operation,
);
const busy = computed(
  () =>
    operation.value?.kind === "finalizing" ||
    operation.value?.kind === "rolling-back",
);
const caption = computed(() =>
  operationCaption(operation.value, Boolean(finalizedArtifacts.value)),
);

function openPrototypeEvidence() {
  const evidence = finalizedArtifacts.value;
  if (!evidence) return;
  void router.push(
    `/workbench/evidence/${evidence.bundleId}/${evidence.snapshotId}`,
  );
}

function openTransition(intent: LifecycleIntent) {
  transitionIntent.value = intent;
  transitionOpen.value = true;
}

async function pollOperation() {
  if (!prototype.value) return;
  const current = lifecycle.recordFor(prototype.value.id)?.operation;
  if (current?.kind === "finalizing" || current?.kind === "rolling-back") {
    await lifecycle.pollFinalization(prototype.value);
  }
}

onMounted(() => {
  void pollOperation();
  pollTimer = setInterval(() => void pollOperation(), 1000);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <section v-if="prototype" class="detail-page">
    <header class="hero" :style="atmosphereStyle(prototype.id)">
      <AtmosphereLayer />
      <div class="hero-copy">
        <span class="kicker">{{ prototypeShortLabel(prototype) }}</span>
        <h1 :title="prototype.label">{{ prototype.label }}</h1>
        <p class="summary">
          {{ prototypeSummary(prototype) }} · {{ ownersAndRoles(prototype) }}
        </p>
        <div class="hero-actions">
          <WorkbenchButton
            v-if="effectiveLifecycle === 'active'"
            tone="primary"
            :disabled="busy"
            :loading="busy"
            @click="openTransition('advance')"
          >
            送交待确定
          </WorkbenchButton>
          <WorkbenchButton
            v-if="effectiveLifecycle === 'review'"
            tone="primary"
            :disabled="operation?.kind === 'rolling-back'"
            @click="openTransition('finalize')"
          >
            {{ finalizeActionLabel(operation) }}
          </WorkbenchButton>
          <WorkbenchButton
            v-if="effectiveLifecycle === 'review'"
            tone="ghost"
            :disabled="busy"
            @click="openTransition('return-active')"
          >
            退回进行中
          </WorkbenchButton>
          <WorkbenchButton
            v-if="finalizedArtifacts"
            tone="primary"
            @click="openPrototypeEvidence"
          >
            {{
              effectiveLifecycle === "archived"
                ? "查看归档产物"
                : "查看定稿产物"
            }}
          </WorkbenchButton>
          <WorkbenchButton
            v-if="effectiveLifecycle === 'final'"
            tone="ghost"
            :disabled="busy"
            @click="openTransition('rollback')"
          >
            {{ rollbackActionLabel(operation) }}
          </WorkbenchButton>
          <WorkbenchButton
            v-if="effectiveLifecycle === 'final'"
            tone="ghost"
            :disabled="busy"
            @click="openTransition('archive')"
          >
            归档
          </WorkbenchButton>
          <span v-if="effectiveLifecycle === 'archived'" class="archived">
            永久只读，不可回退或删除
          </span>
        </div>
      </div>
      <div class="hero-track" aria-label="当前生命周期">
        <span
          v-for="(id, index) in stages"
          :key="id"
          :class="{
            'is-done': index < currentStageIndex,
            'is-here': index === currentStageIndex,
            'is-archive': id === 'archived',
          }"
        >
          <i aria-hidden="true" />
          {{ LIFECYCLE_LABELS[id] }}
        </span>
      </div>
      <p class="last">{{ lastEvent }}</p>
      <p v-if="caption.status" class="status">{{ caption.status }}</p>
      <p v-if="caption.failure" class="failure">{{ caption.failure }}</p>
    </header>

    <div v-if="chapters.length" class="map">
      <section
        v-for="chapter in chapters"
        :key="chapter.id"
        class="chapter"
      >
        <h2>{{ chapter.label }} · {{ chapter.screens.length }} 页</h2>
        <div :class="chapter.sequential ? 'flow' : 'destinations'">
          <template
            v-for="(screen, index) in chapter.screens"
            :key="screen.slug"
          >
            <RouterLink
              class="screen-card"
              :to="canvasPath(prototype.id, screen.slug)"
            >
              <span class="pageface" aria-hidden="true">
                <i class="pageface-bar" />
                <i class="pageface-hero" />
                <i class="pageface-line" />
                <i class="pageface-line is-short" />
              </span>
              <span class="screen-copy">
                <strong>{{ screen.label }}</strong>
                <small
                  >{{ screen.variantLabel }} · {{ screen.variantCount }}
                  个状态</small
                >
              </span>
            </RouterLink>
            <span
              v-if="chapter.sequential && index < chapter.screens.length - 1"
              class="arrow"
              aria-hidden="true"
            >
              <ArrowRight :size="14" class="arrow-h" />
              <ChevronDown :size="14" class="arrow-v" />
            </span>
          </template>
        </div>
      </section>
    </div>
    <p v-else class="empty-map">这个原型还没有可打开的页面。</p>
  </section>
  <p v-else class="unknown" role="alert">未知原型：{{ prototypeId }}</p>
  <LifecycleTransitionDialog
    v-if="prototype && transitionIntent !== 'finalize'"
    v-model="transitionOpen"
    :prototype="prototype"
    :intent="transitionIntent"
  />
  <LifecycleFinalizationSheet
    v-if="prototype && transitionIntent === 'finalize'"
    v-model="transitionOpen"
    :prototype="prototype"
  />
</template>

<style scoped>
.detail-page {
  width: min(1240px, 100%);
  margin: 0 auto;
}

.hero {
  position: relative;
  overflow: hidden;
  min-height: 248px;
  padding: 28px 32px 24px;
  border: 1px solid color-mix(in srgb, var(--stage-ink) 12%, transparent);
  border-radius: 24px;
  background: var(--stage-ground);
  color: var(--stage-ink);
  box-shadow: 0 18px 40px rgba(8, 12, 20, 0.16);
}

.hero-copy,
.hero-track,
.last,
.status,
.failure {
  position: relative;
  z-index: 1;
}

.kicker {
  color: var(--stage-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero h1 {
  overflow: hidden;
  margin: 14px 0 0;
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  font-weight: 650;
  letter-spacing: -0.045em;
  line-height: 1.12;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary {
  margin: 8px 0 0;
  color: var(--stage-muted);
  font-size: 0.86rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
}

.hero-actions :deep(.wb-button.is-primary),
.hero-actions :deep(.wb-button.is-primary:hover:not(:disabled)) {
  border-color: var(--stage-ink);
  background: var(--stage-ink);
  color: var(--stage-ground);
}

.hero-actions :deep(.wb-button.is-ghost) {
  border-color: transparent;
  background: transparent;
  color: var(--stage-muted);
}

.archived {
  color: var(--stage-muted);
  font-size: 0.74rem;
}

.hero-track {
  display: flex;
  margin-top: 28px;
}

.hero-track span {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  color: color-mix(in srgb, var(--stage-ink) 38%, transparent);
  font-size: 0.66rem;
  font-weight: 650;
}

.hero-track span + span::before {
  position: absolute;
  top: 6px;
  right: calc(100% - 10px);
  left: -100%;
  height: 1px;
  background: color-mix(in srgb, var(--stage-ink) 18%, transparent);
  content: "";
}

.hero-track i {
  position: relative;
  z-index: 1;
  width: 13px;
  height: 13px;
  border: 1.5px solid color-mix(in srgb, var(--stage-ink) 28%, transparent);
  border-radius: 50%;
  background: var(--stage-ground);
}

.hero-track .is-archive i {
  border-radius: 2px;
}

.hero-track .is-done,
.hero-track .is-here {
  color: var(--stage-ink);
}

.hero-track .is-done i,
.hero-track .is-here i {
  border-color: var(--stage-ink);
  background: var(--stage-ink);
}

.hero-track .is-here i {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--stage-ink) 16%, transparent);
}

.last,
.status,
.failure {
  margin: 14px 0 0;
  font-size: 0.7rem;
}

.last {
  color: var(--stage-muted);
}

.status,
.failure {
  font-weight: 700;
}

.failure {
  color: #f0a39b;
}

.map {
  margin-top: 28px;
}

.chapter + .chapter {
  margin-top: 22px;
}

.chapter h2 {
  margin: 0 0 10px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.flow,
.destinations {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 14px;
}

.screen-card {
  display: flex;
  width: 168px;
  flex: none;
  flex-direction: column;
  overflow: hidden;
  aspect-ratio: 1 / 1.618;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
}

.screen-card:hover,
.screen-card:focus-visible {
  border-color: rgba(var(--v-theme-on-surface), 0.28);
}

.pageface {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 7px;
  padding: 12px 12px 0;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pageface-bar,
.pageface-hero,
.pageface-line {
  display: block;
  border-radius: 3px;
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.pageface-bar {
  width: 42%;
  height: 6px;
}

.pageface-hero {
  width: 100%;
  height: 38%;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.pageface-line {
  width: 78%;
  height: 5px;
}

.pageface-line.is-short {
  width: 52%;
}

.screen-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 12px;
}

.screen-copy strong {
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.screen-copy small {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.64rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  display: flex;
  align-self: center;
  color: rgba(var(--v-theme-on-surface), 0.32);
}

.arrow-v {
  display: none;
}

.empty-map,
.unknown {
  margin: 24px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.84rem;
}

@media (max-width: 760px) {
  .hero {
    padding: 22px 20px 20px;
  }

  .flow {
    flex-direction: column;
  }

  .arrow {
    width: 100%;
    justify-content: center;
  }

  .arrow-h {
    display: none;
  }

  .arrow-v {
    display: block;
  }
}
</style>
