<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FastForward, Moon, RotateCcw, Sun } from "lucide-vue-next";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import FreeDirection from "./free/FreeDirection.vue";
import {
  FREE_ACCENTS,
  type FreeAccent,
  type FreeAppearance,
} from "./free/accents";
import { DIRECTION_NOTES } from "./data";
import { ROOT_TABS, type RootTab, type YikeModel } from "./model";
import YikeScreen from "./styles/YikeScreen.vue";
import { STYLE_DIRECTIONS } from "./styles/directions";
import { GALLERY, GALLERY_SCREEN_COUNT } from "./styles/gallery";
import type { StyleDirectionId } from "./styles/sample";
import "./yike-draft.css";
import "./styles/styles.css";

type LabView = "suite" | "a";

const route = useRoute();
const router = useRouter();

const view = computed<LabView>(() => (route.query.view === "a" ? "a" : "suite"));
const face = computed<StyleDirectionId>(() => {
  const value = String(route.query.face ?? "mechanical");
  return STYLE_DIRECTIONS.some((item) => item.id === value)
    ? (value as StyleDirectionId)
    : "mechanical";
});
const direction = computed(() => STYLE_DIRECTIONS.find((item) => item.id === face.value)!);
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

const freeRef = ref<{ model: YikeModel } | null>(null);

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
}

function reset() {
  freeRef.value?.model.reset();
  freeAppearance.value = "light";
  void router.replace({
    query: { view: view.value, face: "mechanical", tab: "focus", theme: "light", accent: "tomato" },
  });
}
</script>

<template>
  <main class="yk-lab" :style="labStyle">
    <header class="yk-lab-header">
      <div class="yk-lab-title">
        <span>一刻 / 风格草稿</span>
        <strong>
          {{ view === "suite" ? `全部页面 · ${direction.label}` : "可交互版 A" }}
        </strong>
      </div>

      <div class="yk-lab-actions">
        <nav v-if="view === 'suite'" class="yk-lab-tabs" aria-label="表盘主题">
          <button
            v-for="item in STYLE_DIRECTIONS"
            :key="item.id"
            type="button"
            :class="{ 'is-active': face === item.id }"
            :aria-pressed="face === item.id"
            @click="updateQuery({ face: item.id })"
          >
            {{ item.faceName }}
          </button>
        </nav>
        <nav v-else class="yk-lab-tabs" aria-label="页面">
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
        <nav class="yk-lab-tabs" aria-label="视图">
          <button
            type="button"
            :class="{ 'is-active': view === 'suite' }"
            :aria-pressed="view === 'suite'"
            @click="updateQuery({ view: 'suite' })"
          >
            全部页面
          </button>
          <button
            type="button"
            :class="{ 'is-active': view === 'a' }"
            :aria-pressed="view === 'a'"
            @click="updateQuery({ view: 'a' })"
          >
            可交互 A
          </button>
        </nav>
        <button
          v-if="view === 'a'"
          class="yk-lab-icon"
          type="button"
          title="快进到本轮最后 3 秒"
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

    <div v-if="view === 'suite'" class="yk-suite">
      <header class="yk-lab-column-head">
        <p>{{ direction.thesis }}</p>
        <p class="yk-compare-signature">{{ direction.signature }}</p>
        <ul class="yk-compare-palette" aria-label="色板">
          <li v-for="swatch in direction.palette" :key="swatch.hex">
            <i :style="{ background: swatch.hex }" />
            <span>{{ swatch.name }}</span>
          </li>
        </ul>
        <p class="yk-compare-type">
          {{ direction.type }} · 共 {{ GALLERY_SCREEN_COUNT }} 屏 · 在「设置」里切换表盘
        </p>
        <details class="yk-lab-gaps">
          <summary>与正式原型的差距（{{ direction.gaps.length }}）</summary>
          <ul>
            <li v-for="gap in direction.gaps" :key="gap">{{ gap }}</li>
          </ul>
        </details>
      </header>

      <section v-for="section in GALLERY" :key="section.id" class="yk-suite-section">
        <h2>
          {{ section.title }}
          <span>{{ section.screens.length }} 屏</span>
        </h2>
        <div class="yk-suite-row">
          <YikeScreen
            v-for="spec in section.screens"
            :key="`${face}-${spec.page}-${spec.state}`"
            :spec="spec"
            :theme="face"
            :dark="dark"
          />
        </div>
      </section>
    </div>

    <section v-else class="yk-lab-stage">
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
    </section>
  </main>
</template>
