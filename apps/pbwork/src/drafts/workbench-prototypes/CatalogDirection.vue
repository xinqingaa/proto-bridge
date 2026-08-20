<script setup lang="ts">
import { computed } from "vue";
import Atmosphere from "./Atmosphere.vue";
import {
  LIFECYCLE_LABELS,
  catalogWorks,
  stageCounts,
  verbFor,
  type DraftStage,
} from "./data";

const props = defineProps<{
  filter: "all" | DraftStage;
}>();

const emit = defineEmits<{
  filter: [value: "all" | DraftStage];
  open: [prototypeId: string];
}>();

const works = catalogWorks;
const rail = stageCounts(works);
const visible = computed(() =>
  props.filter === "all"
    ? works
    : works.filter((work) => work.stage === props.filter),
);

function screensLine(
  sequential: boolean,
  labels: string[],
) {
  return labels.join(sequential ? " → " : " · ");
}
</script>

<template>
  <section class="wbp-catalog">
    <header class="wbp-catalog-head">
      <h1>全部原型</h1>
      <p>{{ works.length }} 件在制作品</p>
    </header>

    <nav class="wbp-rail" aria-label="按生命周期看作品">
      <button
        type="button"
        class="wbp-all"
        :class="{ 'is-current': filter === 'all' }"
        :aria-pressed="filter === 'all'"
        @click="emit('filter', 'all')"
      >
        <small>目录</small>
        <strong>全部</strong>
        <b>{{ works.length }}</b>
      </button>

      <div class="wbp-track">
        <button
          v-for="station in rail"
          :key="station.id"
          type="button"
          :class="{
            'is-empty': station.count === 0,
            'is-current': filter === station.id,
            'is-archive': station.id === 'archived',
          }"
          :aria-pressed="filter === station.id"
          @click="emit('filter', station.id)"
        >
          <i class="wbp-station" aria-hidden="true" />
          <strong>{{ station.label }}</strong>
          <b>{{ station.count }}</b>
        </button>
      </div>
    </nav>

    <div v-if="visible.length" class="wbp-wall">
      <button
        v-for="work in visible"
        :key="work.id"
        type="button"
        class="wbp-room"
        :style="work.atmosphere"
        :aria-label="`打开 ${work.label}`"
        @click="emit('open', work.id)"
      >
        <Atmosphere compact />
        <div class="wbp-room-top">
          <span class="wbp-kicker">{{ work.shortLabel }}</span>
          <span class="wbp-stage">{{ LIFECYCLE_LABELS[work.stage] }}</span>
        </div>
        <h2>{{ work.label }}</h2>
        <p class="wbp-summary">{{ work.summary }}</p>
        <p class="wbp-people">
          {{ work.roles.join(" / ") }}
          <template v-if="work.owners.length">
            · {{ work.owners.join("、") }}
          </template>
        </p>

        <ul class="wbp-chapters">
          <li v-for="chapter in work.chapters" :key="chapter.id">
            <em>{{ chapter.label }}</em>
            <span>{{
              screensLine(
                chapter.sequential,
                chapter.screens.map((screen) => screen.label),
              )
            }}</span>
          </li>
        </ul>

        <div class="wbp-metrics">
          <span><b>{{ work.screens }}</b> 页面</span>
          <span><b>{{ work.variants }}</b> 状态</span>
          <span><b>{{ work.chapters.length }}</b> 模块</span>
        </div>
        <span class="wbp-verb">{{ verbFor(work.stage) }}</span>
      </button>
    </div>
    <p v-else class="wbp-empty">此阶段还没有作品。</p>
  </section>
</template>
