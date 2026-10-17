<script setup lang="ts">
import { ref, useId } from "vue";
import PbButton from "@/design-system/components/action/Button.vue";
import { useToken } from "@/design-system/theme/runtime-theme";
const brandMark = useToken("asset.brand-mark");
const compact = defineProps<{ compact?: boolean }>();
const saved = ref(false);
const id = useId();
</script>
<template>
  <div class="pvs-board" :class="{ 'is-compact': compact.compact }">
    <div class="pvs-board-title">
      <span
        class="pvs-brand-mark"
        :class="{ 'has-asset': brandMark !== 'none' }"
        ><i v-if="brandMark !== 'none'" /><template v-else>P</template></span
      >
      <div>
        <strong>每一天，都有新的进展</strong
        ><span>同样的内容，观察不同主题</span>
      </div>
    </div>
    <div class="pvs-metric">
      <strong>24<span>项</span></strong
      ><span>本周已完成 <b>+12%</b></span>
    </div>
    <div class="pvs-board-buttons">
      <PbButton
        :label="saved ? '已保存' : '主要操作'"
        :inspect-id="`${id}.primary`"
        @click="saved = !saved"
      /><PbButton
        label="次要操作"
        kind="secondary"
        :inspect-id="`${id}.secondary`"
        @click="saved = !saved"
      />
    </div>
    <p class="pvs-board-caption" role="status">
      {{
        saved
          ? "保存成功 · 主题切换保留当前状态"
          : "文字、表面、圆角与控件尺寸一起变化"
      }}
    </p>
  </div>
</template>
