<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, ChevronDown } from "lucide-vue-next";
import Atmosphere from "./Atmosphere.vue";
import {
  STAGES,
  LIFECYCLE_LABELS,
  canvasPath,
  detailWork,
  secondaryFor,
  verbFor,
  type DraftStage,
} from "./data";

const props = defineProps<{
  prototypeId: string;
  stage: DraftStage;
}>();

const work = computed(() => detailWork(props.prototypeId, props.stage));
const stageIndex = computed(() => STAGES.indexOf(props.stage));
</script>

<template>
  <section v-if="work" class="wbp-detail">
    <header class="wbp-hero" :style="work.atmosphere">
      <Atmosphere />
      <div class="wbp-hero-copy">
        <span class="wbp-kicker">{{ work.shortLabel }}</span>
        <h1 :title="work.label">{{ work.label }}</h1>
        <p class="wbp-summary">
          {{ work.summary }} · {{ work.roles.join(" / ") }}
        </p>
        <div class="wbp-hero-actions">
          <span class="wbp-ticket">{{ verbFor(work.stage) }}</span>
          <button
            v-for="action in secondaryFor(work.stage)"
            :key="action"
            type="button"
            class="wbp-quiet"
          >
            {{ action }}
          </button>
        </div>
      </div>
      <div class="wbp-hero-track" aria-label="当前生命周期">
        <span
          v-for="(id, index) in STAGES"
          :key="id"
          :class="{
            'is-done': index < stageIndex,
            'is-here': index === stageIndex,
            'is-archive': id === 'archived',
          }"
        >
          <i aria-hidden="true" />
          {{ LIFECYCLE_LABELS[id] }}
        </span>
      </div>
      <p class="wbp-last">{{ work.lastEvent }}</p>
    </header>

    <div class="wbp-map">
      <section
        v-for="chapter in work.chapters"
        :key="chapter.id"
        class="wbp-chapter"
      >
        <h2>{{ chapter.label }} · {{ chapter.screens.length }} 页</h2>
        <div :class="chapter.sequential ? 'wbp-flow' : 'wbp-destinations'">
          <template
            v-for="(screen, index) in chapter.screens"
            :key="screen.slug"
          >
            <RouterLink
              class="wbp-screen"
              :to="canvasPath(work.id, screen.slug)"
            >
              <span class="wbp-pageface" aria-hidden="true">
                <i class="wbp-pageface-bar" />
                <i class="wbp-pageface-hero" />
                <i class="wbp-pageface-line" />
                <i class="wbp-pageface-line is-short" />
              </span>
              <span class="wbp-screen-copy">
                <strong>{{ screen.label }}</strong>
                <small
                  >{{ screen.variantLabel }} · {{ screen.variantCount }}
                  个状态</small
                >
              </span>
            </RouterLink>
            <span
              v-if="chapter.sequential && index < chapter.screens.length - 1"
              class="wbp-arrow"
              aria-hidden="true"
            >
              <ArrowRight :size="14" class="wbp-arrow-h" />
              <ChevronDown :size="14" class="wbp-arrow-v" />
            </span>
          </template>
        </div>
      </section>
    </div>
  </section>
</template>
