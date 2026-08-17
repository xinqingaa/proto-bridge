<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import ScreenFrame from "../ScreenFrame.vue";
import { focusPrototypes, prototypeStats, wallScreens } from "../data";
</script>

<template>
  <article class="gal">
    <header class="gal-head">
      <div>
        <span>原型收藏</span>
        <h1>两件作品，十三个真实页面。</h1>
      </div>
      <a href="#" @click.prevent>全部原型 <ArrowRight :size="15" /></a>
    </header>

    <section class="gal-shelf">
      <a
        v-for="(item, index) in wallScreens"
        :key="item.key"
        href="#"
        class="gal-work"
        :class="`work-${index + 1}`"
        @click.prevent
      >
        <span class="gal-index">0{{ index + 1 }}</span>
        <ScreenFrame
          :src="item.src"
          :title="`${item.prototypeLabel} · ${item.label}`"
          :scale="index === 0 ? 0.54 : 0.43"
        />
        <span class="gal-caption">
          <strong>{{ item.label }}</strong>
          <small>{{ item.prototypeLabel }}</small>
        </span>
      </a>
    </section>

    <footer class="gal-foot">
      <a
        v-for="prototype in focusPrototypes"
        :key="prototype.id"
        href="#"
        @click.prevent
      >
        <span>{{ prototype.label }}</span>
        <small>
          {{ prototypeStats(prototype.id).screens }} 页面 ·
          {{ prototypeStats(prototype.id).variants }} 状态
        </small>
        <ArrowRight :size="14" />
      </a>
    </footer>
  </article>
</template>
