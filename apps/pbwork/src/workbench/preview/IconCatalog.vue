<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  PB_ICON_NAMES,
  PB_ICON_ARTWORK,
  resolvePbIcon,
  type PbIconName,
} from "@/design-system/components/_shared/icons";
import { svgForView } from "@/design-system/components/_shared/svg-artwork.mjs";
import { loadPrototypes } from "@/design-system/loaders";
import { themeArtworks } from "./theme-artwork";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";
import WorkbenchTextField from "@/workbench/ui/WorkbenchTextField.vue";

type Resource = {
  key: string;
  id: string;
  label: string;
  owner: string;
  kind: string;
  svg: string;
  width: number;
  height: number;
  viewBox: string;
  views: Array<{ id: string; label: string; viewBox: string }>;
  usage: string;
  colorMode?: string;
};
const resources: Resource[] = [
  ...PB_ICON_NAMES.map((id) => ({
    ...PB_ICON_ARTWORK.icons[id],
    id,
    key: id,
    label: id,
    kind: "icon",
    views: [],
    usage: "界面图标",
  })),
  ...themeArtworks.map((asset) => ({
    ...asset,
    owner: asset.packId,
    kind: "artwork",
  })),
];
const prototypes = loadPrototypes();
const ownerLabel = (owner: string) =>
  owner === "shared"
    ? "通用"
    : (prototypes.find((p) => p.id === owner || p.themePackId === owner)
        ?.label ?? owner);
const owners = [
  { value: "all", label: "全部来源" },
  ...[...new Set(resources.map((r) => r.owner))].map((owner) => ({
    value: owner,
    label: ownerLabel(owner),
  })),
];
const kind = ref("icon"),
  owner = ref("all"),
  query = ref("");
const selectedKey = ref("home"),
  viewId = ref(""),
  multiplier = ref("3"),
  background = ref("light");
const status = ref(""),
  error = ref(""),
  busy = ref(false);
const filtered = computed(() =>
  resources.filter(
    (r) =>
      r.kind === kind.value &&
      (owner.value === "all" || r.owner === owner.value) &&
      `${r.id} ${r.label}`
        .toLowerCase()
        .includes(query.value.toLowerCase().trim()),
  ),
);
watch(
  filtered,
  (entries) => {
    if (!entries.some((r) => r.key === selectedKey.value))
      selectedKey.value = entries[0]?.key ?? "";
  },
  { immediate: true },
);
const selected = computed(() =>
  resources.find((r) => r.key === selectedKey.value),
);
watch(kind, () => {
  multiplier.value = kind.value === "artwork" ? "1" : "3";
});
watch(selectedKey, () => {
  viewId.value = "";
  status.value = "";
  error.value = "";
});
const viewBox = computed(
  () =>
    selected.value?.views.find((v) => v.id === viewId.value)?.viewBox ??
    selected.value?.viewBox,
);
const bounds = computed(
  () => viewBox.value?.split(/\s+/).map(Number) ?? [0, 0, 0, 0],
);
const ink = computed(() =>
  background.value === "dark" ? "#f2f5f8" : "#253442",
);
const currentSvg = computed(() =>
  selected.value
    ? viewId.value
      ? svgForView(selected.value.svg, viewBox.value)
      : selected.value.svg
    : "",
);
const previewUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const filename = computed(() =>
  selected.value
    ? `pbwork-${selected.value.kind === "artwork" ? selected.value.owner + "-" : ""}${selected.value.id}${viewId.value ? "--" + viewId.value : ""}`
    : "",
);
function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function download(format: "svg" | "png") {
  if (!selected.value) return;
  const resource = selected.value;
  const svg = currentSvg.value,
    name = filename.value,
    ratio = multiplier.value;
  const width = bounds.value[2]!,
    height = bounds.value[3]!,
    color = ink.value;
  busy.value = true;
  error.value = "";
  status.value = "";
  try {
    if (format === "svg")
      save(new Blob([svg], { type: "image/svg+xml" }), `${name}.svg`);
    else {
      const source =
        resource.colorMode === "theme"
          ? svgForView(svg, undefined, color)
          : svg;
      const url = URL.createObjectURL(
        new Blob([source], { type: "image/svg+xml" }),
      );
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * Number(ratio));
        canvas.height = Math.round(height * Number(ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("当前浏览器无法导出 PNG");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("PNG 导出失败"))),
            "image/png",
          ),
        );
        save(blob, `${name}@${ratio}x.png`);
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    status.value = `${format.toUpperCase()} 下载已开始`;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "下载失败，请重试";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="icon-catalog" data-testid="artwork-catalog">
    <div class="catalog-toolbar">
      <WorkbenchSegmented
        v-model="kind"
        :items="[
          { value: 'icon', label: '图标' },
          { value: 'artwork', label: '主题图形' },
        ]"
        label="资源类型"
      />
      <WorkbenchTextField
        v-model="query"
        aria-label="搜索图形"
        placeholder="搜索名称"
      />
      <WorkbenchSelect v-model="owner" :items="owners" aria-label="图形来源" />
      <span class="result-count">{{ filtered.length }} 项</span>
    </div>
    <div class="catalog-layout">
      <div class="catalog-results">
        <p class="catalog-note">
          {{
            kind === "icon"
              ? "选择图标，查看完整轮廓并下载。"
              : "表盘、主题容器与分层图形；与界面图标分开管理。"
          }}
        </p>
        <div class="icon-options">
          <button
            v-for="resource in filtered"
            :key="resource.key"
            type="button"
            :aria-label="`选择 ${resource.label}`"
            :aria-pressed="selectedKey === resource.key"
            @click="selectedKey = resource.key"
          >
            <component
              v-if="resource.kind === 'icon'"
              :is="resolvePbIcon(resource.id as PbIconName)"
              :size="40"
              aria-hidden="true"
            />
            <img v-else :src="previewUrl(resource.svg)" alt="" />
            <strong>{{ resource.label }}</strong
            ><small>{{ ownerLabel(resource.owner) }}</small>
          </button>
        </div>
        <p v-if="!filtered.length" role="status">没有匹配的图形</p>
      </div>
      <aside
        v-if="selected && filtered.length"
        class="export-panel"
        aria-label="图形预览与下载"
      >
        <header>
          <small
            >{{ ownerLabel(selected.owner) }} ·
            {{ selected.kind === "icon" ? "界面图标" : "主题图形" }}</small
          >
          <h2>{{ selected.label }}</h2>
        </header>
        <div
          class="large-preview"
          :class="{ 'is-dark': background === 'dark' }"
          :style="{ color: ink }"
        >
          <component
            v-if="selected.kind === 'icon'"
            :is="resolvePbIcon(selected.id as PbIconName)"
            :size="160"
            aria-hidden="true"
          />
          <img v-else :src="previewUrl(currentSvg)" :alt="selected.label" />
        </div>
        <WorkbenchSegmented
          v-model="background"
          :items="[
            { value: 'light', label: '浅色背景' },
            { value: 'dark', label: '深色背景' },
          ]"
          label="预览背景"
          fill
        />
        <WorkbenchSelect
          v-if="selected.views.length"
          v-model="viewId"
          :items="[
            { value: '', label: '默认视图' },
            ...selected.views.map((v) => ({ value: v.id, label: v.label })),
          ]"
          label="图层"
          aria-label="图层"
        />
        <p class="catalog-note">
          {{ selected.usage }} · {{ bounds[2] }} × {{ bounds[3] }}
        </p>
        <div class="png-settings">
          <span>PNG 倍率</span
          ><WorkbenchSegmented
            v-model="multiplier"
            :items="['1', '2', '3', '5', '8'].map((v) => ({ value: v, label: v + '×' }))"
            label="导出倍率"
          />
        </div>
        <small class="catalog-note"
          >{{ Math.round(bounds[2]! * Number(multiplier)) }} ×
          {{ Math.round(bounds[3]! * Number(multiplier)) }} px ·
          预览底色不导出</small
        >
        <div class="download-actions">
          <WorkbenchButton :disabled="busy" @click="download('svg')"
            >下载 SVG</WorkbenchButton
          ><WorkbenchButton
            tone="primary"
            :loading="busy"
            @click="download('png')"
            >下载 PNG</WorkbenchButton
          >
        </div>
        <small class="catalog-note"
          >SVG 保留源图形；PNG 使用当前图层与倍率。</small
        >
        <p v-if="error" role="alert">{{ error }}</p>
        <p v-else role="status">{{ status }}</p>
      </aside>
    </div>
  </section>
</template>
<style scoped>
.icon-catalog {
  width: 100%;
  color: rgb(var(--v-theme-on-surface));
}
.catalog-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.catalog-toolbar :deep(.wb-text-field) {
  flex: 1;
  min-width: 180px;
}
.catalog-toolbar :deep(.wb-select) {
  max-width: 200px;
}
.result-count,
.catalog-note {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 12px;
}
.catalog-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-top: 20px;
}
.catalog-results {
  flex: 1;
  min-width: 0;
}
.catalog-note {
  margin: 0 0 12px;
  line-height: 1.6;
}
.icon-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}
.icon-options button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 148px;
  padding: 16px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
}
.icon-options button[aria-pressed="true"] {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}
.icon-options button:hover {
  border-color: rgba(var(--v-theme-primary), 0.6);
}
button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.icon-options strong {
  font-size: 12px;
  font-weight: 550;
  overflow-wrap: anywhere;
  text-align: center;
}
.icon-options small {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.icon-options img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.export-panel {
  position: sticky;
  top: 20px;
  width: 304px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}
.export-panel h2 {
  margin: 6px 0 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}
.export-panel header small {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.large-preview {
  height: 232px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background-color: #f5f7fa;
  background-image:
    linear-gradient(45deg, #e9edf2 25%, transparent 25%),
    linear-gradient(-45deg, #e9edf2 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e9edf2 75%),
    linear-gradient(-45deg, transparent 75%, #e9edf2 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
}
.large-preview.is-dark {
  background-color: #20252c;
  background-image: none;
}
.large-preview img {
  max-width: 88%;
  max-height: 88%;
  object-fit: contain;
}
.png-settings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
.download-actions {
  display: flex;
  gap: 8px;
}
.download-actions > * {
  flex: 1;
}
.export-panel > p {
  margin: 0;
  font-size: 12px;
}
@media (max-width: 1000px) {
  .catalog-layout {
    flex-direction: column-reverse;
  }
  .export-panel {
    position: static;
    width: 100%;
    box-sizing: border-box;
  }
  .large-preview {
    height: 200px;
  }
  .catalog-results {
    width: 100%;
  }
}
</style>
