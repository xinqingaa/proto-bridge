<script setup lang="ts">
import type {
  ResolvedThemeTypography,
  ResolvedThemeValue,
} from "@proto-bridge/core/v2";
import { computed, ref } from "vue";
import WorkbenchTextField from "@/workbench/ui/WorkbenchTextField.vue";
import SourceValuePreview from "./SourceValuePreview.vue";
import {
  runtimeThemeSources,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { themeTableToCssVars } from "@/design-system/theme/css-vars";
import { themeAssetUrl } from "@/design-system/theme/sources";
import { normalizeTokenCssVarName } from "@/design-system/theme/presentation";
import {
  resolvePreviewDevice,
  type PreviewDeviceSession,
  type PreviewContext,
} from "./model";
const props = defineProps<{
  devices: PreviewDeviceSession[];
  contexts: PreviewContext[];
  tokenIds: string[];
  deviceBindings?: Record<string, string[]>;
}>();
function typographyDetails(value: ResolvedThemeValue | undefined) {
  if (!value || typeof value !== "object" || !("size" in value))
    return "未知值";
  const type = value as ResolvedThemeTypography;
  return `字号 ${typeof type.size === "number" ? type.size + "px" : type.size} · 字重 ${type.weight} · 行高 ${type.lineHeight} · 字体 ${type.family.join(", ")}${type.features.length ? " · 特性 " + type.features.join(", ") : ""}`;
}
const query = ref("");
const entries = computed(() =>
  props.devices.map((device) => {
    const result = resolvePreviewDevice(
      device,
      props.contexts,
      runtimeThemeSources.packs,
      resolveRuntimeTheme,
    );
    return {
      ...result,
      css: result.table
        ? themeTableToCssVars(
            result.table,
            runtimeThemeSources.keyCatalog,
            runtimeThemeSources.constants,
            themeAssetUrl,
          )
        : {},
    };
  }),
);
const rows = computed(() => {
  const keys = new Map<
    string,
    {
      id: string;
      label?: string | undefined;
      description?: string | undefined;
      valueType: string;
      constant: boolean;
    }
  >([
    ...runtimeThemeSources.keyCatalog.keys.map(
      (key) => [key.id, { ...key, constant: false }] as const,
    ),
    ...runtimeThemeSources.constants.constants.map(
      (key) => [key.id, { ...key, constant: true }] as const,
    ),
  ]);
  const search = query.value.trim().toLowerCase();
  return props.tokenIds
    .map((id) => keys.get(id))
    .filter((key) => key !== undefined)
    .filter(
      (key) =>
        !search ||
        `${key.id} ${key.label ?? ""} ${key.description ?? ""}`
          .toLowerCase()
          .includes(search),
    );
});
</script>
<template>
  <section class="preview-values" aria-label="值与来源">
    <header class="value-toolbar">
      <div>
        <h2>值与来源</h2>
        <span>{{ rows.length }} 项</span>
      </div>
      <WorkbenchTextField
        v-model="query"
        aria-label="搜索键值"
        placeholder="搜索名称或 Key"
      />
    </header>
    <p
      v-for="entry in entries.filter((e) => e.error)"
      :key="entry.device.id"
      role="alert"
    >
      {{ entry.device.id }}：{{ entry.error }}
    </p>
    <details class="pack-metadata">
      <summary>主题包信息</summary>
      <div v-for="entry in entries" :key="entry.device.id">
        <template v-if="entry.table && entry.context"
          ><strong>{{ entry.context.label }}</strong
          ><code
            >{{ entry.device.id }} · {{ entry.table.identity.packId }} /
            {{ entry.table.identity.theme }} /
            {{ entry.table.identity.mode }}</code
          ><code>{{ entry.table.identity.packDigest }}</code></template
        >
      </div>
    </details>
    <div class="value-table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">名称 / Key</th>
            <th v-for="entry in entries" :key="entry.device.id" scope="col">
              {{ entries.length === 2 ? entry.device.id + " · " : ""
              }}{{ entry.context?.label
              }}<small
                >{{ entry.device.selection.theme }} ·
                {{ entry.device.selection.mode }}</small
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in rows" :key="key.id" :data-value-key="key.id">
            <th scope="row">
              <strong>{{ key.label ?? key.id }}</strong
              ><code>{{ key.id }}</code
              ><small>{{ key.description }}</small
              ><small v-if="key.constant">只读常量 · 不可覆盖、不可绑定</small>
            </th>
            <td v-for="entry in entries" :key="entry.device.id">
              <span
                v-if="
                  deviceBindings &&
                  !deviceBindings?.[entry.device.id]?.includes(key.id)
                "
                >不适用</span
              >
              <template v-else>
                <SourceValuePreview
                  v-if="entry.table"
                  :token-id="key.id"
                  :value-type="key.valueType"
                  :value="
                    key.constant
                      ? entry.table.constants[key.id]
                      : entry.table.values[key.id]
                  "
                  :css-value="entry.css[normalizeTokenCssVarName(key.id)] ?? ''"
                  :css-values="entry.css"
                />
                <code v-if="key.valueType === 'typography'">{{
                  typographyDetails(entry.table?.values[key.id])
                }}</code>
                <code v-else>{{
                  entry.table
                    ? (entry.css[normalizeTokenCssVarName(key.id)] ?? "未知值")
                    : "不可读取"
                }}</code
                ><small v-if="entry.table"
                  >{{
                    key.constant
                      ? "PBWork 常量表"
                      : entry.table.provenance[key.id]?.sourcePackId
                  }}
                  ·
                  {{
                    key.constant
                      ? "只读常量"
                      : entry.table.provenance[key.id]?.inherited
                        ? "继承定义"
                        : "当前包定义"
                  }}</small
                >
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!rows.length" class="empty-values">没有匹配的键值。</p>
  </section>
</template>
<style scoped>
.preview-values {
  padding: 20px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.value-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}
.value-toolbar > div:first-child {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-right: auto;
}
h2 {
  font-size: 14px;
  margin: 0;
}
.value-toolbar span {
  font-size: 11px;
  opacity: 0.6;
}
.value-toolbar :deep(.wb-text-field) {
  flex: 0 1 260px;
  min-width: 160px;
}
.pack-metadata {
  margin-bottom: 12px;
}
.pack-metadata > div {
  margin-top: 10px;
}
.value-table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
}
th,
td {
  text-align: left;
  vertical-align: top;
  padding: 12px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow-wrap: anywhere;
}
thead th:first-child {
  width: 24%;
}
thead th {
  font-weight: 600;
  background: rgba(var(--v-theme-on-surface), 0.025);
}
tbody th {
  min-width: 140px;
  max-width: 240px;
  font-weight: 400;
}
code,
small {
  display: block;
}
code {
  font-size: 11px;
  line-height: 1.6;
}
small {
  margin-top: 4px;
  opacity: 0.6;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
}
summary {
  font-size: 11px;
  cursor: pointer;
  opacity: 0.65;
  margin-top: 5px;
}
.empty-values {
  font-size: 12px;
  opacity: 0.6;
}
</style>
