<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ArrowRight, Smartphone } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";
import PhonePreview from "./PhonePreview.vue";
import {
  sources,
  pack,
  sourceById,
  modeItems,
  cssValue,
  origin,
  type Mode,
} from "../studio-shared/themes";
import "../studio-shared/studio.css";
const route = useRoute();
const router = useRouter();
const component = computed(() =>
  route.query.component === "sheet" || route.query.component === "toast"
    ? route.query.component
    : "button",
);
const componentItems = [
  { value: "button", label: "Button" },
  { value: "sheet", label: "BottomSheet" },
  { value: "toast", label: "Toast" },
];
const source = ref("pbwork-base");
const current = computed(() => sourceById(source.value));
const theme = ref(pack(current.value.packId).defaultTheme);
const mode = ref<Mode>("light");
watch(
  () => current.value.packId,
  () => {
    theme.value = pack(current.value.packId).defaultTheme;
  },
);
const comparison = ref("single");
const viewSize = ref("comfortable");
const stage = ref<HTMLElement>();
const box = ref({ width: 900, height: 600 });
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry)
      box.value = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
  });
  if (stage.value) observer.observe(stage.value);
});
onBeforeUnmount(() => observer?.disconnect());
const previews = computed(() => {
  const currentPreview = {
    packId: current.value.packId,
    theme: theme.value,
    mode: mode.value,
    label: current.value.label,
  };
  if (comparison.value === "modes")
    return [
      { ...currentPreview, mode: "light" as const },
      { ...currentPreview, mode: "dark" as const },
    ];
  if (comparison.value === "packs")
    return current.value.packId === "pbwork-base"
      ? [
          currentPreview,
          {
            packId: "pbwork-sample",
            theme: "garden",
            mode: mode.value,
            label: "样例主题包 · 园色",
          },
        ]
      : [
          {
            packId: "pbwork-base",
            theme: "default",
            mode: mode.value,
            label: "基础 DS",
          },
          currentPreview,
        ];
  return [currentPreview];
});
const fitScale = computed(() =>
  Math.max(
    0.25,
    Math.min(
      1,
      (box.value.height - 40) / 740,
      (box.value.width - 64) / (previews.value.length * 420),
    ),
  ),
);
const scale = computed(() =>
  viewSize.value === "original"
    ? 1
    : viewSize.value === "fit"
      ? fitScale.value
      : Math.max(0.68, fitScale.value),
);
const overflows = computed(
  () =>
    740 * scale.value + 40 > box.value.height ||
    previews.value.length * 420 * scale.value + 64 > box.value.width,
);
const info = computed(
  () =>
    ({
      button: {
        title: "Button",
        description: "用同一台手机比较类型、尺寸和状态。",
        hint: "点击主要操作，观察默认 → 加载 → 完成。",
        keys: ["color.action", "radius.control", "size.control"],
      },
      sheet: {
        title: "BottomSheet",
        description: "在任务上下文中体验打开、高度与关闭。",
        hint: "打开面板，切换高度；确认、关闭或按 Escape 返回。",
        keys: ["color.surface", "radius.surface", "size.panel-medium"],
      },
      toast: {
        title: "Toast",
        description: "在设备内体验短暂反馈与撤销。",
        hint: "移除记录后点击撤销，或等待提示自动消失。",
        keys: ["color.inverse-surface", "toast.duration", "radius.surface"],
      },
    })[component.value],
);
</script>
<template>
  <main class="pvs-lab pvs-component-lab">
    <header class="pvs-heading">
      <div>
        <span class="pvs-kicker">组件资源 · 风格草稿</span>
        <h1>{{ info.title }}</h1>
        <p>{{ info.description }}</p>
      </div>
      <WorkbenchSegmented
        :model-value="component"
        :items="componentItems"
        label="组件选择"
        @update:model-value="
          router.replace({ query: { ...route.query, component: $event } })
        "
      />
    </header>
    <section class="pvs-controls" aria-label="组件预览设置">
      <div>
        <label>查看范围</label
        ><WorkbenchSelect
          v-model="source"
          :items="
            sources.map((s) => ({
              value: s.id,
              label: `${s.label} · ${s.kind}`,
            }))
          "
          aria-label="查看范围"
        />
      </div>
      <div>
        <label>包内主题</label
        ><WorkbenchSelect
          v-model="theme"
          :items="
            pack(current.packId).themes.map((t) => ({
              value: t.id,
              label: t.label,
            }))
          "
          aria-label="包内主题"
          :disabled="pack(current.packId).themes.length === 1"
        />
      </div>
      <div class="pvs-mode-control">
        <label>显示模式</label
        ><WorkbenchSegmented
          :model-value="mode"
          :items="modeItems"
          label="显示模式"
          @update:model-value="mode = $event === 'dark' ? 'dark' : 'light'"
        />
      </div>
      <div>
        <label>对比方式</label
        ><WorkbenchSelect
          v-model="comparison"
          :items="[
            { value: 'single', label: '单机体验' },
            { value: 'packs', label: '基础／主题对比' },
            { value: 'modes', label: '浅色／深色对比' },
          ]"
          aria-label="对比方式"
        />
      </div>
    </section>
    <div class="pvs-context">
      <span
        >基础 DS<template v-if="current.packId !== 'pbwork-base'"
          ><ArrowRight :size="13" />{{ current.label }}</template
        ><template v-else-if="current.kind === '原型'">
          · {{ current.label }}直接使用基础包</template
        ></span
      ><code>{{ current.packId }} / {{ theme }}</code>
    </div>
    <section class="pvs-component-stage">
      <header>
        <span
          ><Smartphone :size="15" />手机舞台
          <small>390 × 740 · {{ Math.round(scale * 100) }}%</small></span
        ><WorkbenchSegmented
          v-model="viewSize"
          :items="[
            { value: 'comfortable', label: '舒适尺寸' },
            { value: 'fit', label: '完整设备' },
            { value: 'original', label: '原尺寸' },
          ]"
          label="设备显示尺寸"
        />
      </header>
      <div
        ref="stage"
        class="pvs-device-stage"
        :class="{ 'is-original': overflows }"
      >
        <PhonePreview
          v-for="(preview, index) in previews"
          :key="`${comparison}-${index}`"
          v-bind="preview"
          :component="component"
          :scale="scale"
        />
      </div>
      <footer>{{ info.hint }}</footer>
    </section>
    <details class="pvs-component-details">
      <summary>当前外观与来源 <span>只读 · 主题切换保持演示状态</span></summary>
      <div v-for="key in info.keys" :key="key">
        <code>{{ key }}</code
        ><strong>{{ cssValue(current.packId, theme, mode, key) }}</strong
        ><span>{{ origin(current.packId, theme, mode, key) }}</span>
      </div>
      <p>
        手机采用容器视口。布局比例在渲染层以设备尺寸为参照，主题解析表保持原值。草稿不产生
        Evidence。
      </p>
    </details>
  </main>
</template>
