<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import CatalogDirection from "./CatalogDirection.vue";
import DetailDirection from "./DetailDirection.vue";
import {
  LIFECYCLE_LABELS,
  STAGES,
  catalogWorks,
  type DraftStage,
} from "./data";
import "./workbench-prototypes-draft.css";

type ViewId = "catalog" | "detail";

const route = useRoute();
const router = useRouter();

const views: Array<{ id: ViewId; label: string; job: string }> = [
  { id: "catalog", label: "全部原型", job: "认出并选一件" },
  { id: "detail", label: "原型详情", job: "住进这一件并行动" },
];

const view = computed<ViewId>(() =>
  route.query.view === "detail" ? "detail" : "catalog",
);
const prototypeId = computed(() => {
  const value = String(route.query.prototype ?? catalogWorks[0]?.id ?? "");
  return catalogWorks.some((work) => work.id === value)
    ? value
    : (catalogWorks[0]?.id ?? "cold-chain-ops");
});
const stage = computed<DraftStage>(() => {
  const value = String(route.query.stage ?? "active");
  return STAGES.includes(value as DraftStage) ? (value as DraftStage) : "active";
});
const filter = computed<"all" | DraftStage>(() => {
  const value = String(route.query.filter ?? "all");
  if (value === "all") return "all";
  return STAGES.includes(value as DraftStage) ? (value as DraftStage) : "all";
});

const thesis = computed(() =>
  view.value === "catalog"
    ? "每件作品是一间染色的房间，不是一行台账。没有真机。"
    : "房间只承担状态和一个动词；页面地图按产品结构打开画布。",
);

function replaceQuery(
  next: Partial<{
    view: ViewId;
    prototype: string;
    stage: DraftStage;
    filter: "all" | DraftStage;
  }>,
) {
  void router.replace({
    query: {
      ...route.query,
      view: next.view ?? view.value,
      prototype: next.prototype ?? prototypeId.value,
      stage: next.stage ?? stage.value,
      filter: next.filter ?? filter.value,
    },
  });
}

function openWork(id: string) {
  replaceQuery({ view: "detail", prototype: id });
}
</script>

<template>
  <main class="wbp-lab">
    <header class="wbp-lab-head">
      <div>
        <span>PBWork 原型目录 · 方向探索</span>
        <strong>{{
          view === "catalog" ? "认出并选一件" : "住进这一件并行动"
        }}</strong>
        <p>{{ thesis }}</p>
      </div>
      <nav class="wbp-switch" aria-label="页面">
        <button
          v-for="item in views"
          :key="item.id"
          type="button"
          :class="{ 'is-active': view === item.id }"
          :aria-pressed="view === item.id"
          @click="replaceQuery({ view: item.id })"
        >
          <strong>{{ item.label }}</strong>
          <small>{{ item.job }}</small>
        </button>
      </nav>
    </header>

    <div v-if="view === 'detail'" class="wbp-detail-tools">
      <nav class="wbp-subswitch" aria-label="作品">
        <button
          v-for="work in catalogWorks"
          :key="work.id"
          type="button"
          :class="{ 'is-active': prototypeId === work.id }"
          :aria-pressed="prototypeId === work.id"
          @click="replaceQuery({ prototype: work.id })"
        >
          {{ work.shortLabel }}
        </button>
      </nav>
      <nav class="wbp-subswitch" aria-label="预览生命周期">
        <button
          v-for="id in STAGES"
          :key="id"
          type="button"
          :class="{ 'is-active': stage === id }"
          :aria-pressed="stage === id"
          @click="replaceQuery({ stage: id })"
        >
          {{ LIFECYCLE_LABELS[id] }}
        </button>
      </nav>
    </div>

    <section class="wbp-page">
      <CatalogDirection
        v-if="view === 'catalog'"
        :filter="filter"
        @filter="replaceQuery({ filter: $event })"
        @open="openWork"
      />
      <DetailDirection
        v-else
        :prototype-id="prototypeId"
        :stage="stage"
      />
    </section>

    <p class="wbp-note">
      独立视觉探索，不进入 Registry、Capture 或 Handoff。气氛沿用工作台概览的作品地面；阶段切换仅用于预览动词，不是生命周期 Store。
    </p>
  </main>
</template>
