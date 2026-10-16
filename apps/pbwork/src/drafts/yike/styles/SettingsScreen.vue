<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import Dial from "./Dial.vue";
import Sheet from "./Sheet.vue";
import { STYLE_DIRECTIONS } from "./directions";
import type { StyleDirectionId } from "./sample";

defineProps<{ theme: StyleDirectionId; state: "default" | "reset"; dark?: boolean }>();

const POMODORO_ROWS = [
  { label: "专注时长", value: "25 分钟" },
  { label: "短休", value: "5 分钟" },
  { label: "长休", value: "15 分钟" },
  { label: "长休间隔", value: "每 4 轮" },
];
</script>

<template>
  <div class="y-screen is-pushed is-settings">
    <nav class="y-nav">
      <button type="button" class="y-nav-back">
        <ChevronLeft aria-hidden="true" />
        专注
      </button>
    </nav>
    <header class="y-head is-tight">
      <h2>设置</h2>
    </header>

    <section class="y-section">
      <h3>表盘</h3>
      <div class="y-faces" role="radiogroup" aria-label="表盘">
        <button
          v-for="face in STYLE_DIRECTIONS"
          :key="face.id"
          type="button"
          role="radio"
          :aria-checked="face.id === theme"
          class="y-face"
          :class="{ 'is-active': face.id === theme }"
        >
          <span class="y-face-preview" :class="[`ys-${face.id}`, { 'is-dark': dark }]">
            <Dial :theme="face.id" :minutes="12.57" :total="25" size="mini" />
          </span>
          <span>{{ face.faceName }}</span>
        </button>
      </div>
      <p class="y-note">表盘决定整个一刻的配色和签名图形，打卡页的打孔卡布局不变。</p>
    </section>

    <section class="y-section">
      <h3>外观</h3>
      <div class="y-segmented" role="radiogroup" aria-label="外观">
        <button type="button" role="radio" aria-checked="false">浅色</button>
        <button type="button" role="radio" aria-checked="false">深色</button>
        <button type="button" role="radio" aria-checked="true" class="is-active">跟随系统</button>
      </div>
    </section>

    <section class="y-section">
      <h3>番茄</h3>
      <ul class="y-list is-values">
        <li v-for="row in POMODORO_ROWS" :key="row.label">
          <button type="button">
            <span>{{ row.label }}</span>
            <em>{{ row.value }}</em>
            <ChevronRight aria-hidden="true" />
          </button>
        </li>
        <li>
          <div class="y-list-row">
            <span>提示音</span>
            <span class="y-switch is-on" role="switch" aria-checked="true" aria-label="提示音" />
          </div>
        </li>
      </ul>
    </section>

    <ul class="y-list">
      <li class="is-danger">
        <button type="button"><span>重置所有数据</span></button>
      </li>
    </ul>
    <p class="y-footnote">一刻只在这台设备上保存数据。</p>

    <Sheet
      v-if="state === 'reset'"
      title="重置所有数据？"
      text="专注记录、习惯和打卡会全部清空，设置恢复默认。这一步无法撤销。"
      :actions="[
        { label: '重置', kind: 'danger' },
        { label: '取消', kind: 'quiet' },
      ]"
    />
  </div>
</template>
