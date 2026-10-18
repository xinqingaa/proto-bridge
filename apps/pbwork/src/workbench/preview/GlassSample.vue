<script setup lang="ts">
import { ref, useId } from "vue";
import GlassSurface from "@/design-system/components/display/GlassSurface.vue";
const moved = ref(false);
const instance = useId();
</script>
<template>
  <section class="glass-exhibit">
    <aside
      class="glass-system-note"
      role="note"
      aria-label="macOS 玻璃效果设置"
    >
      <strong>macOS 设置提示</strong>
      <p>
        若 Chrome 中没有玻璃效果，请在「系统设置 → 辅助功能（无障碍）→
        显示」中关闭「降低透明度」，然后刷新页面。
      </p>
      <p class="glass-preference-active">
        当前浏览器启用了降低透明度，预览会使用不透明背景。
      </p>
    </aside>
    <div class="glass-scene" :class="{ 'is-moved': moved }">
      <div class="scene-copy">
        <p>今晚复核东区入库，冷链温度保持在要求区间。</p>
        <p>运输单 1842 待确认签收，异常项已单独列出。</p>
        <p>仓内货位 A-12 完成盘点，差异两件待补录。</p>
        <p>下一班次 06:30 发车，司机与封签号已登记。</p>
      </div>
      <div class="glass-host">
        <GlassSurface :inspect-id="`preview.glass.${instance}.regular`"
          ><div class="glass-copy">
            <span>REGULAR</span><strong>让正文透过来</strong
            ><small>前景保持清晰，背后的文字被轻轻磨砂。</small>
          </div></GlassSurface
        >
      </div>
    </div>
    <div class="glass-scene is-clear" data-preview-state="clear">
      <div class="scene-copy">
        <p>签收备注写在单据背面，照片与温度曲线放在同一页。</p>
        <p>若读数越界，页面只标出这一条，不把整单标红。</p>
        <p>调度可以在这里改派，历史记录留在下方。</p>
      </div>
      <div class="glass-host">
        <GlassSurface clear :inspect-id="`preview.glass.${instance}.clear`"
          ><div class="glass-copy">
            <span>CLEAR</span><strong>更清透的表面</strong
            ><small>同一材质，跟随宿主的轮廓。</small>
          </div></GlassSurface
        >
      </div>
    </div>
    <button type="button" :aria-pressed="moved" @click="moved = !moved">
      {{ moved ? "复位背景" : "移动背景，观察材质" }}
    </button>
  </section>
</template>
<style scoped>
.glass-exhibit {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
  padding: var(--pb-spacing-md);
}
.glass-system-note {
  padding: var(--pb-spacing-sm-plus);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.glass-system-note strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}
.glass-system-note p {
  margin: var(--pb-spacing-xs) var(--pb-layout-zero) var(--pb-layout-zero);
}
.glass-preference-active {
  display: none;
}
@media (prefers-reduced-transparency: reduce) {
  .glass-preference-active {
    display: block;
  }
}
.glass-scene {
  position: relative;
  min-height: calc(var(--pb-size-plot) + var(--pb-spacing-2xl));
  overflow: clip;
  border-radius: var(--pb-radius-overlay);
  background: var(--pb-color-surface-recessed);
}
.scene-copy {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-lg);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
  transform: translateY(var(--pb-layout-zero));
  transition: transform var(--pb-motion-duration-long)
    var(--pb-motion-easing-standard);
}
.scene-copy p {
  margin: var(--pb-layout-zero);
}
.is-moved .scene-copy {
  transform: translateY(var(--pb-spacing-2xl));
}
.glass-host {
  position: absolute;
  inset: var(--pb-spacing-2xl) var(--pb-spacing-md) var(--pb-spacing-md);
  border-radius: var(--pb-radius-overlay);
}
.is-clear .glass-host {
  border-radius: var(--pb-radius-control);
}
.glass-copy {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  color: var(--pb-color-on-surface);
}
.glass-copy span {
  font: var(--pb-typography-micro);
}
.glass-copy strong {
  font: var(--pb-typography-subtitle);
}
.glass-copy small {
  font: var(--pb-typography-caption);
}
.glass-exhibit button {
  align-self: flex-start;
  padding: var(--pb-spacing-sm) var(--pb-spacing-sm-plus);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  color: var(--pb-color-on-surface);
  background: var(--pb-color-surface);
  font: var(--pb-typography-label);
}
.glass-exhibit button:focus-visible {
  outline: var(--pb-border-focus);
}
@media (prefers-reduced-motion: reduce) {
  .scene-copy {
    transition: none;
  }
}
</style>
