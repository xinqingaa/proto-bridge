<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Icon from "@/design-system/components/action/Icon.vue";
import {
  PB_ICON_NAMES,
  PB_ICON_ARTWORK,
  type PbIconName,
} from "@/design-system/components/_shared/icons";
import { useTokenNumber, useToken } from "@/design-system/theme/runtime-theme";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import WorkbenchTextField from "@/workbench/ui/WorkbenchTextField.vue";
const props = defineProps<{ device: import("./model").PreviewDeviceSession }>();
const saved = props.device.demo.session?.iconCatalog as
  Record<string, unknown> | undefined;
const selected = ref<PbIconName>("home"),
  query = ref(""),
  format = ref("svg"),
  multiplier = ref("2"),
  status = ref(""),
  busy = ref(false);
if (saved) {
  if (PB_ICON_NAMES.includes(saved.selected as PbIconName))
    selected.value = saved.selected as PbIconName;
  if (saved.format === "png" || saved.format === "svg")
    format.value = saved.format;
  if (["1", "2", "3", "4"].includes(String(saved.multiplier)))
    multiplier.value = String(saved.multiplier);
  if (typeof saved.query === "string") query.value = saved.query;
}
watch(
  [selected, query, format, multiplier],
  () => {
    props.device.demo.session = {
      ...props.device.demo.session,
      iconCatalog: {
        selected: selected.value,
        query: query.value,
        format: format.value,
        multiplier: multiplier.value,
      },
    };
  },
  { flush: "sync" },
);
const size = useTokenNumber("size.icon");
const color = useToken("color.on-surface");
const names = computed(() =>
  PB_ICON_NAMES.filter((n) => n.includes(query.value.toLowerCase().trim())),
);
function svg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.value}" height="${size.value}" viewBox="${PB_ICON_ARTWORK.viewBox}" fill="none" stroke="${color.value}" stroke-width="${PB_ICON_ARTWORK.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="${PB_ICON_ARTWORK.paths[selected.value]}"/></svg>`;
}
function save(blob: Blob, extension: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pbwork-${selected.value}${extension === "png" ? "@" + multiplier.value + "x" : ""}.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function download() {
  busy.value = true;
  status.value = "";
  try {
    const blob = new Blob([svg()], { type: "image/svg+xml" });
    if (format.value === "svg") save(blob, "svg");
    else {
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("图形无法载入"));
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.round(
          size.value * Number(multiplier.value),
        );
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("当前浏览器无法生成 PNG");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const png = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("PNG 生成失败"))),
            "image/png",
          ),
        );
        save(png, "png");
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    status.value = "已准备下载";
  } catch (e) {
    status.value = e instanceof Error ? e.message : "下载失败，请重试";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="icon-catalog">
    <header>
      <h2>Icon</h2>
      <p>PBWork 自绘图形 · {{ PB_ICON_NAMES.length }} 枚</p>
    </header>
    <WorkbenchTextField
      v-model="query"
      aria-label="搜索图标"
      placeholder="搜索图标名称"
    />
    <div class="icon-options">
      <button
        v-for="name in names"
        :key="name"
        :data-preview-state="name"
        type="button"
        :aria-label="`选择 ${name}`"
        :aria-pressed="name === selected"
        @click="selected = name"
      >
        <Icon
          :inspect-id="`preview.${device.id}.icon.${name}`"
          :name="name"
          size="lg"
        /><span>{{ name }}</span>
      </button>
    </div>
    <p v-if="!names.length">没有匹配的图标</p>
    <div class="export-panel">
      <div class="selection">
        <Icon
          :inspect-id="`preview.${device.id}.icon.export`"
          :name="selected"
          size="lg"
        /><strong>{{ selected }}</strong>
      </div>
      <WorkbenchSegmented
        v-model="format"
        :items="[
          { value: 'svg', label: 'SVG' },
          { value: 'png', label: 'PNG' },
        ]"
        label="导出格式"
      /><template v-if="format === 'png'"
        ><WorkbenchSegmented
          v-model="multiplier"
          :items="
            ['1', '2', '3', '4'].map((value) => ({ value, label: value + '×' }))
          "
          label="导出倍率"
        /><small
          >{{ Math.round(size * Number(multiplier)) }} ×
          {{ Math.round(size * Number(multiplier)) }} px · 透明背景</small
        ></template
      ><small v-else>矢量图形 · 透明背景</small
      ><WorkbenchButton :loading="busy" @click="download"
        >下载 {{ format.toUpperCase() }}</WorkbenchButton
      ><span role="status">{{ status }}</span>
    </div>
  </section>
</template>
<style scoped>
.icon-catalog {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
h2,
p {
  margin: 0;
}
h2 {
  font: var(--pb-typography-title);
}
header p {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
  margin-top: 6px;
}
.icon-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.icon-options button {
  flex: 0 0 calc((100% - 16px) / 3);
  min-width: 0;
  min-height: 86px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  cursor: pointer;
}
.icon-options button[aria-pressed="true"] {
  background: var(--pb-color-primary-soft);
  border-color: var(--pb-color-primary);
  color: var(--pb-color-primary);
}
.icon-options button:focus-visible {
  outline: var(--pb-border-focus);
}
.icon-options span {
  font: var(--pb-typography-micro);
  overflow-wrap: anywhere;
  max-width: 100%;
  padding-inline: 4px;
}
.export-panel {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--pb-color-surface);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-surface);
  box-shadow: var(--pb-elevation-raised);
  z-index: 2;
}
.selection {
  display: flex;
  align-items: center;
  gap: 12px;
}
.export-panel small,
.export-panel [role="status"] {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
</style>
