<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FastForward, Moon, RotateCcw, Sun } from "lucide-vue-next";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import DsDirection from "./ds/DsDirection.vue";
import FreeDirection from "./free/FreeDirection.vue";
import {
  FREE_ACCENTS,
  type FreeAccent,
  type FreeAppearance,
} from "./free/accents";
import { DIRECTION_NOTES } from "./data";
import { ROOT_TABS, type RootTab, type YikeModel } from "./model";
import "./yike-draft.css";

const route = useRoute();
const router = useRouter();

const tab = computed<RootTab>(() => {
  const value = String(route.query.tab ?? "focus");
  return ROOT_TABS.some((item) => item.value === value)
    ? (value as RootTab)
    : "focus";
});
const dark = computed(() => route.query.theme === "dark");
const accent = computed<FreeAccent>(() => {
  const value = String(route.query.accent ?? "tomato");
  return value in FREE_ACCENTS ? (value as FreeAccent) : "tomato";
});

const freeAppearance = ref<FreeAppearance>(dark.value ? "dark" : "light");
const systemDark = ref(
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);
const media = window.matchMedia("(prefers-color-scheme: dark)");
const onMedia = (event: MediaQueryListEvent) => {
  systemDark.value = event.matches;
};
media.addEventListener("change", onMedia);
onBeforeUnmount(() => media.removeEventListener("change", onMedia));

const freeDark = computed(() =>
  freeAppearance.value === "system"
    ? systemDark.value
    : freeAppearance.value === "dark",
);

const labStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens(dark.value ? "dark" : "light")),
);

const freeNote = DIRECTION_NOTES.find((note) => note.id === "free")!;
const dsNote = DIRECTION_NOTES.find((note) => note.id === "ds")!;

const freeRef = ref<{ model: YikeModel } | null>(null);
const dsRef = ref<{ model: YikeModel } | null>(null);

function updateQuery(next: Record<string, string>) {
  void router.replace({ query: { ...route.query, ...next } });
}

function setTab(next: RootTab) {
  updateQuery({ tab: next });
}

function setDark(next: boolean) {
  freeAppearance.value = next ? "dark" : "light";
  updateQuery({ theme: next ? "dark" : "light" });
}

function setFreeAppearance(next: FreeAppearance) {
  freeAppearance.value = next;
}

function fastForward() {
  freeRef.value?.model.fastForward();
  dsRef.value?.model.fastForward();
}

function reset() {
  freeRef.value?.model.reset();
  dsRef.value?.model.reset();
  freeAppearance.value = "light";
  void router.replace({
    query: { tab: "focus", theme: "light", accent: "tomato" },
  });
}
</script>

<template>
  <main class="yk-lab" :style="labStyle">
    <header class="yk-lab-header">
      <div class="yk-lab-title">
        <span>一刻 / 视觉草稿</span>
        <strong>同一个专注与打卡工具，两条实现路径</strong>
      </div>

      <div class="yk-lab-actions">
        <nav class="yk-lab-tabs" aria-label="页面">
          <button
            v-for="item in ROOT_TABS"
            :key="item.value"
            type="button"
            :class="{ 'is-active': tab === item.value }"
            :aria-pressed="tab === item.value"
            @click="setTab(item.value)"
          >
            {{ item.label }}
          </button>
        </nav>
        <button
          class="yk-lab-icon"
          type="button"
          title="两版都快进到本轮最后 3 秒"
          aria-label="快进到本轮结束"
          @click="fastForward"
        >
          <FastForward aria-hidden="true" />
        </button>
        <button
          class="yk-lab-icon"
          type="button"
          :aria-label="dark ? '切换浅色' : '切换深色'"
          @click="setDark(!dark)"
        >
          <Sun v-if="dark" aria-hidden="true" />
          <Moon v-else aria-hidden="true" />
        </button>
        <button
          class="yk-lab-icon"
          type="button"
          aria-label="重置草稿状态"
          @click="reset"
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </header>

    <section class="yk-lab-stage">
      <article class="yk-lab-column">
        <header class="yk-lab-column-head">
          <strong>{{ freeNote.label }}</strong>
          <p>{{ freeNote.thesis }}</p>
        </header>
        <div class="yk-lab-device is-free">
          <FreeDirection
            ref="freeRef"
            :tab="tab"
            :dark="freeDark"
            :appearance="freeAppearance"
            :accent="accent"
            @update:tab="setTab"
            @update:appearance="setFreeAppearance"
            @update:accent="updateQuery({ accent: $event })"
          />
        </div>
        <details class="yk-lab-gaps">
          <summary>与正式原型的差距（{{ freeNote.gaps.length }}）</summary>
          <ul>
            <li v-for="gap in freeNote.gaps" :key="gap">{{ gap }}</li>
          </ul>
        </details>
      </article>

      <article class="yk-lab-column">
        <header class="yk-lab-column-head">
          <strong>{{ dsNote.label }}</strong>
          <p>{{ dsNote.thesis }}</p>
        </header>
        <div class="yk-lab-device is-ds">
          <DsDirection
            ref="dsRef"
            :tab="tab"
            :dark="dark"
            @update:tab="setTab"
            @update:dark="setDark"
          />
        </div>
        <details class="yk-lab-gaps">
          <summary>与正式原型的差距（{{ dsNote.gaps.length }}）</summary>
          <ul>
            <li v-for="gap in dsNote.gaps" :key="gap">{{ gap }}</li>
          </ul>
        </details>
      </article>
    </section>
  </main>
</template>
