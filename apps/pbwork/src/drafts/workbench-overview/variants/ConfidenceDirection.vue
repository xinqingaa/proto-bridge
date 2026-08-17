<script setup lang="ts">
import { ArrowRight, CircleAlert, ScanLine } from "lucide-vue-next";
import { caseRows, coverage, LIFECYCLE_LABELS } from "../data";
</script>

<template>
  <article class="cnf">
    <header class="cnf-head">
      <div>
        <span>交付信心</span>
        <h1>证据基本完整，仍有两个缺口。</h1>
        <p>已采集 Case 会固定在这里；问题只在需要处理时出现。</p>
      </div>
      <div class="cnf-score">
        <strong>{{
          Math.round((coverage.captured / coverage.total) * 100)
        }}</strong>
        <span>%</span>
      </div>
    </header>

    <div class="cnf-bar" aria-label="Case 覆盖摘要">
      <i
        v-for="index in coverage.total"
        :key="index"
        :class="{
          'is-gap': index > coverage.captured,
          'is-alert':
            index > coverage.captured &&
            index <= coverage.captured + coverage.attention,
        }"
      />
    </div>

    <section class="cnf-rows">
      <article v-for="row in caseRows" :key="row.id">
        <header>
          <div>
            <h2>{{ row.label }}</h2>
            <span
              >{{ row.caseCount }} Case ·
              {{ LIFECYCLE_LABELS[row.lifecycle] }}</span
            >
          </div>
          <a href="#" @click.prevent>查看证据 <ArrowRight :size="14" /></a>
        </header>
        <div class="cnf-track">
          <span
            v-for="group in row.screens"
            :key="group.slug"
            class="cnf-group"
          >
            <span class="cnf-cells">
              <i
                v-for="cell in group.cells"
                :key="cell.key"
                :class="`is-${cell.status}`"
                :title="`${cell.screenSlug} · ${cell.variantId}`"
              />
            </span>
            <small>{{ group.label }}</small>
          </span>
        </div>
      </article>
    </section>

    <footer class="cnf-foot">
      <span><CircleAlert :size="16" /> 6 个 Case 需要处理</span>
      <span><ScanLine :size="16" /> 10 个 Case 尚未采集</span>
      <a href="#" @click.prevent>打开采集台 <ArrowRight :size="14" /></a>
    </footer>
  </article>
</template>
