<script setup lang="ts">
import { computed } from "vue";
import { Minus, Plus, X } from "lucide-vue-next";
import HabitGlyph from "../HabitGlyph.vue";
import { HABIT_ICONS } from "../model";
import CheckInScreen from "./CheckInScreen.vue";
import type { StyleDirectionId } from "./sample";

const props = defineProps<{ theme: StyleDirectionId; state: "new" | "error" }>();

const error = computed(() => props.state === "error");
</script>

<template>
  <div class="y-overlay-host">
    <CheckInScreen :theme="theme" state="partial" aria-hidden="true" inert />
    <div class="y-scrim is-editor">
      <section class="y-editor" role="dialog" aria-modal="true" aria-label="新建习惯">
        <header class="y-editor-head">
          <button type="button" class="y-icon-button" aria-label="关闭">
            <X aria-hidden="true" />
          </button>
          <h3>新建习惯</h3>
          <span class="y-editor-spacer" />
        </header>

        <label class="y-field" :class="{ 'is-invalid': error }">
          <span>名称</span>
          <span class="y-input">
            <template v-if="error"><em>比如：早起拉伸</em></template>
            <template v-else>早起拉伸<i class="y-caret" aria-hidden="true" /></template>
          </span>
          <small v-if="error" role="alert">先给习惯起个名字</small>
        </label>

        <div class="y-field">
          <span>图标</span>
          <div class="y-icon-choices" role="radiogroup" aria-label="图标">
            <button
              v-for="icon in HABIT_ICONS"
              :key="icon.value"
              type="button"
              role="radio"
              :aria-checked="icon.value === 'stretch'"
              :aria-label="icon.label"
              :class="{ 'is-active': icon.value === 'stretch' }"
            >
              <HabitGlyph :icon="icon.value" />
            </button>
          </div>
        </div>

        <div class="y-field">
          <span>频率</span>
          <div class="y-segmented" role="radiogroup" aria-label="频率">
            <button type="button" role="radio" :aria-checked="error" :class="{ 'is-active': error }">
              每天
            </button>
            <button type="button" role="radio" :aria-checked="!error" :class="{ 'is-active': !error }">
              每周 N 次
            </button>
          </div>
          <div v-if="!error" class="y-stepper">
            <span>每周</span>
            <button type="button" aria-label="减少一次"><Minus aria-hidden="true" /></button>
            <b>3</b>
            <button type="button" aria-label="增加一次"><Plus aria-hidden="true" /></button>
            <span>次</span>
          </div>
        </div>

        <div class="y-field is-row">
          <span>
            提醒
            <small>每天 07:30</small>
          </span>
          <span class="y-switch is-on" role="switch" aria-checked="true" aria-label="提醒" />
        </div>

        <button type="button" class="y-button is-primary is-block">保存</button>
      </section>
    </div>
  </div>
</template>
