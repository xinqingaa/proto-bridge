<script setup lang="ts">
import { ArrowRight, Clock3, MessageCircle, ScanLine } from "lucide-vue-next";
import ScreenFrame from "../ScreenFrame.vue";
import {
  comments,
  focusPrototype,
  LIFECYCLE_LABELS,
  prototypeStats,
  stageScreen,
} from "../data";

const focused = focusPrototype;
</script>

<template>
  <article v-if="focused" class="cnt">
    <header class="cnt-hero">
      <div class="cnt-copy">
        <p>下午好，继续上次的工作</p>
        <h1>{{ focused.label }}</h1>
        <span>{{ stageScreen.label }} · 默认状态</span>
        <a href="#" @click.prevent>继续编辑 <ArrowRight :size="16" /></a>
      </div>
      <div class="cnt-orbit" aria-hidden="true" />
      <div class="cnt-screen">
        <ScreenFrame
          :src="stageScreen.src"
          :title="`${stageScreen.prototypeLabel} · ${stageScreen.label}`"
          :scale="0.54"
        />
      </div>
    </header>

    <section class="cnt-context">
      <div class="cnt-facts">
        <span
          ><b>{{ prototypeStats(focused.id).screens }}</b> 页面</span
        >
        <span
          ><b>{{ prototypeStats(focused.id).variants }}</b> 状态</span
        >
        <span
          ><b>{{ LIFECYCLE_LABELS[focused.lifecycle] }}</b> 当前阶段</span
        >
      </div>
      <div class="cnt-log">
        <p><Clock3 :size="15" /> 12 分钟前停在「今天页」</p>
        <p>
          <MessageCircle :size="15" />
          {{ comments.length }} 条评审与当前原型有关
        </p>
      </div>
    </section>

    <footer class="cnt-attention">
      <span><ScanLine :size="17" /></span>
      <div>
        <small>需要处理</small>
        <strong>1 个 Case 缺少可交付证据</strong>
      </div>
      <a href="#" @click.prevent>查看问题 <ArrowRight :size="15" /></a>
    </footer>
  </article>
</template>
