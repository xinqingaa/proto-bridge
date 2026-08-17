<script setup lang="ts">
import {
  ArrowRight,
  Check,
  CircleAlert,
  Play,
  ScanLine,
} from "lucide-vue-next";
import { comments, focusPrototypes, prototypeStats } from "../data";

const primary = focusPrototypes[0];
const secondary = focusPrototypes[1];
</script>

<template>
  <article class="que">
    <header class="que-head">
      <div>
        <span>2026 年 8 月 17 日</span>
        <h1>今天，先完成三件事。</h1>
      </div>
      <p><b>2</b> 已完成</p>
    </header>

    <section class="que-list">
      <a href="#" class="que-row is-primary" @click.prevent>
        <span class="que-index">01</span>
        <span class="que-icon"><Play :size="16" fill="currentColor" /></span>
        <span class="que-copy">
          <small>继续设计 · 约 20 分钟</small>
          <strong>{{ primary?.label ?? "恒动 · 健身自律记录" }}</strong>
          <em
            >{{
              prototypeStats(primary?.id ?? "hengdong").screens
            }}
            页面正在推进，返回上次编辑位置</em
          >
        </span>
        <ArrowRight :size="18" />
      </a>

      <a href="#" class="que-row is-warning" @click.prevent>
        <span class="que-index">02</span>
        <span class="que-icon"><CircleAlert :size="17" /></span>
        <span class="que-copy">
          <small>解决阻塞 · 采集</small>
          <strong>1 个 Case 需要处理</strong>
          <em>修复后即可重新采集，不影响其它结果</em>
        </span>
        <ArrowRight :size="18" />
      </a>

      <a href="#" class="que-row" @click.prevent>
        <span class="que-index">03</span>
        <span class="que-icon"><ScanLine :size="17" /></span>
        <span class="que-copy">
          <small>确认结果 · 约 5 分钟</small>
          <strong>{{ secondary?.label ?? "冷链异常处置台" }}</strong>
          <em>最近采集已完成，等待检查结果</em>
        </span>
        <ArrowRight :size="18" />
      </a>
    </section>

    <footer class="que-foot">
      <span><Check :size="15" /> 已完成：更新恒动今天页</span>
      <span
        ><Check :size="15" /> 已完成：检查 {{ comments.length }} 条评审</span
      >
      <a href="#" @click.prevent>查看全部活动 <ArrowRight :size="14" /></a>
    </footer>
  </article>
</template>
