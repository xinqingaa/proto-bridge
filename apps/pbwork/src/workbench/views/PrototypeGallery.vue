<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, FileStack, GitBranch, MessageSquareText, RotateCcw, Users } from "lucide-vue-next";
import type { PrototypeLifecycle, PrototypeRecord } from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { useCommentsStore } from "@/app/stores/comments";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import LifecycleTransitionDialog from "@/workbench/prototypes/LifecycleTransitionDialog.vue";

const props = defineProps<{ lifecycle?: "all" | PrototypeLifecycle | undefined }>();
const state = usePrototypeLifecycleStore();
const comments = useCommentsStore();
const editing = ref<PrototypeRecord | null>(null);
const all = loadPrototypes();
const items = computed(() => all.filter((item) => !props.lifecycle || props.lifecycle === "all" || state.effectiveLifecycle(item) === props.lifecycle));
const title = computed(() => props.lifecycle && props.lifecycle !== "all" ? LIFECYCLE_LABELS[props.lifecycle] : "全部原型");
const stats = (id: string) => {
  const screens = loadPrototypeScreens().filter((screen) => screen.prototypeId === id);
  return { screens: screens.length, variants: screens.reduce((sum, screen) => sum + screen.variants.length, 0), comments: comments.comments.filter((comment) => comment.prototypeId === id && comment.status === "open").length };
};
</script>

<template>
  <ResourcePageShell eyebrow="原型资产" :title="title" description="以独立产品资产管理原型、页面、状态与评审进度；工作台状态可直接流转，不依赖源码写回。">
    <template #stats><span class="gallery-total">{{ items.length }} 个原型</span></template>
    <div v-if="items.length" class="prototype-grid">
      <article v-for="item in items" :key="item.id" class="prototype-card">
        <div class="card-visual" aria-hidden="true"><span /><span /><span /><i /></div>
        <div class="card-heading">
          <div><p>{{ item.id }}</p><h2>{{ item.label }}</h2></div>
          <span class="lifecycle-pill" :data-state="state.effectiveLifecycle(item)">{{ LIFECYCLE_LABELS[state.effectiveLifecycle(item)] }}</span>
        </div>
        <div class="card-metrics">
          <span><FileStack :size="14" />{{ stats(item.id).screens }} 页面</span>
          <span><GitBranch :size="14" />{{ stats(item.id).variants }} 状态</span>
          <span><MessageSquareText :size="14" />{{ stats(item.id).comments }} 评论</span>
        </div>
        <p class="card-people"><Users :size="14" />{{ [...(item.owners ?? []), ...(item.roles ?? [])].join(" · ") || "未设置参与者" }}</p>
        <div v-if="state.hasOverride(item.id)" class="local-state"><span>本地工作台状态</span><button type="button" @click="state.reset(item)"><RotateCcw :size="12" />恢复注册状态</button></div>
        <footer>
          <WorkbenchButton @click="editing = item">流转状态</WorkbenchButton>
          <RouterLink :to="`/workbench/prototypes/${item.id}`">查看原型<ArrowRight :size="14" /></RouterLink>
        </footer>
      </article>
    </div>
    <div v-else class="gallery-empty"><GitBranch :size="30" /><h2>此阶段还没有原型</h2><p>可从其他生命周期流转到「{{ title }}」，列表和原型树会立即同步。</p></div>
  </ResourcePageShell>
  <LifecycleTransitionDialog v-if="editing" :model-value="true" :prototype="editing" @update:model-value="!$event && (editing = null)" />
</template>

<style scoped>
.gallery-total { padding:6px 10px; border-radius:999px; background:rgba(var(--v-theme-on-surface),.06); font-size:.72rem; font-weight:750; }
.prototype-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.prototype-card { overflow:hidden; border:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); border-radius:15px; background:rgb(var(--v-theme-surface)); transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease; }
.prototype-card:hover { transform:translateY(-2px); border-color:color-mix(in srgb,rgb(var(--v-theme-primary)) 40%,transparent); box-shadow:0 14px 30px rgba(15,23,42,.08); }
.card-visual { position:relative; display:grid; grid-template-columns:56px 1fr; grid-template-rows:22px 52px; gap:7px; height:108px; padding:16px; background:linear-gradient(135deg,color-mix(in srgb,rgb(var(--v-theme-primary)) 13%,rgb(var(--v-theme-surface))),rgba(var(--v-theme-on-surface),.025)); border-bottom:1px solid rgba(var(--v-border-color),var(--v-border-opacity)); }
.card-visual span { border-radius:5px; background:rgba(var(--v-theme-on-surface),.1); }.card-visual span:first-child{grid-row:1/3}.card-visual span:nth-child(3){width:70%}.card-visual i{position:absolute;right:17px;bottom:14px;width:46px;height:18px;border-radius:6px;background:color-mix(in srgb,rgb(var(--v-theme-primary)) 55%,transparent)}
.card-heading,.card-metrics,.card-people,.local-state,.prototype-card footer { margin-inline:16px; }.card-heading { display:flex; justify-content:space-between; align-items:start; gap:12px; margin-top:15px; }.card-heading p{margin:0 0 3px;color:rgba(var(--v-theme-on-surface),.45);font:600 .66rem ui-monospace,monospace}.card-heading h2{margin:0;font-size:1.05rem}
.lifecycle-pill{padding:4px 8px;border-radius:999px;background:rgba(var(--v-theme-on-surface),.06);font-size:.68rem;font-weight:750}.lifecycle-pill[data-state="active"]{color:rgb(var(--v-theme-primary));background:color-mix(in srgb,rgb(var(--v-theme-primary)) 12%,transparent)}.lifecycle-pill[data-state="review"]{color:rgb(var(--v-theme-warning));background:color-mix(in srgb,rgb(var(--v-theme-warning)) 13%,transparent)}.lifecycle-pill[data-state="final"]{color:rgb(var(--v-theme-success));background:color-mix(in srgb,rgb(var(--v-theme-success)) 13%,transparent)}
.card-metrics{display:flex;gap:13px;margin-top:15px}.card-metrics span,.card-people{display:flex;align-items:center;gap:5px;color:rgba(var(--v-theme-on-surface),.62);font-size:.72rem}.card-people{margin-top:10px;margin-bottom:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.local-state{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:7px 9px;border-radius:8px;background:color-mix(in srgb,rgb(var(--v-theme-warning)) 9%,transparent);font-size:.68rem}.local-state button{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;font-weight:700}
.prototype-card footer{display:flex;align-items:center;justify-content:space-between;margin-top:15px;padding:13px 0 15px;border-top:1px solid rgba(var(--v-border-color),var(--v-border-opacity))}.prototype-card footer a{display:flex;align-items:center;gap:5px;color:rgb(var(--v-theme-primary));font-size:.75rem;font-weight:750;text-decoration:none}
.gallery-empty{display:grid;justify-items:center;padding:64px 20px;border:1px dashed rgba(var(--v-border-color),var(--v-border-opacity));border-radius:15px;color:rgba(var(--v-theme-on-surface),.52);text-align:center}.gallery-empty h2{margin:12px 0 4px;color:rgb(var(--v-theme-on-surface));font-size:1rem}.gallery-empty p{margin:0;font-size:.78rem}
@media(max-width:860px){.prototype-grid{grid-template-columns:1fr}}
</style>
