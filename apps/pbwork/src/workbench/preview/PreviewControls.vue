<script setup lang="ts">
import { loadPrototypes } from "@/design-system/loaders";
import { previewExtensions } from "./extensions/registry";
import { extensionsForComponent } from "./extensions/model";
import { computed } from "vue";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import {
  defaultPreviewSelection,
  type PreviewContext,
  type PreviewDeviceSession,
} from "./model";
const prototypes = loadPrototypes();
const props = defineProps<{
  resourceId?: string;
  device: PreviewDeviceSession;
  contexts: PreviewContext[];
  comparing: boolean;
}>();
const context = computed(() =>
  props.contexts.find((c) => c.id === props.device.selection.contextId),
);
const manifest = computed(
  () => runtimeThemeSources.packs.get(context.value?.packId ?? "")?.manifest,
);
const items = computed(() =>
  props.contexts.map((c) => ({ value: c.id, label: c.label })),
);
function setContext(id: string) {
  const next = props.contexts.find((c) => c.id === id);
  if (next)
    props.device.selection = defaultPreviewSelection(
      next,
      runtimeThemeSources.packs,
    );
}
function setExtension(id: string) {
  const extension = previewExtensions.find((entry) => entry.id === id);
  const packId = prototypes.find(
    (owner) => owner.id === extension?.ownerPrototypeId,
  )?.themePackId;
  const next = props.contexts.find((context) => context.packId === packId);
  if (next) setContext(next.id);
  props.device.demo.extensionId = id;
}
const extensions = computed(() =>
  extensionsForComponent(previewExtensions, props.resourceId ?? ""),
);
</script>
<template>
  <section
    class="device-settings"
    :data-preview-settings="device.id"
    :aria-label="`手机 ${device.id} 预览设置`"
  >
    <h3>
      <span v-if="comparing" class="settings-marker">{{ device.id }}</span
      >{{
        comparing ? (device.id === "A" ? "当前样品" : "对照样品") : "预览设置"
      }}
    </h3>
    <div class="setting-field">
      <span>主题包</span>
      <WorkbenchSelect
        v-if="contexts.length > 1"
        :model-value="device.selection.contextId"
        :items="items"
        aria-label="主题包"
        @update:model-value="setContext"
      />
      <strong v-else>{{ context?.label ?? "未知主题包" }}</strong>
    </div>
    <div class="setting-dimensions">
      <div class="setting-field">
        <span>主题</span>
        <WorkbenchSelect
          v-if="(manifest?.themes.length ?? 0) > 1"
          :model-value="device.selection.theme"
          :items="
            manifest!.themes.map((t) => ({ value: t.id, label: t.label }))
          "
          aria-label="主题"
          @update:model-value="device.selection.theme = $event"
        />
        <strong v-else>{{ manifest?.themes[0]?.label ?? "主题未知" }}</strong>
      </div>
      <div class="setting-field">
        <span>模式</span>
        <WorkbenchSelect
          v-if="(manifest?.modes.length ?? 0) > 1"
          :model-value="device.selection.mode"
          :items="
            manifest!.modes.map((value) => ({
              value,
              label: value === 'dark' ? '深色' : '浅色',
            }))
          "
          aria-label="模式"
          @update:model-value="device.selection.mode = $event"
        />
        <strong v-else>{{ device.selection.mode }}</strong>
      </div>
    </div>
    <p v-if="context?.kind === 'sample'" class="setting-note">
      仅用于演示主题效果
    </p>
    <div v-if="extensions.length" class="setting-field">
      <span>组件实现</span
      ><WorkbenchSelect
        :model-value="device.demo.extensionId ?? ''"
        :items="[
          { value: '', label: 'DS 基础组件' },
          ...extensions.map((entry) => ({
            value: entry.id,
            label: `${entry.label} · ${entry.ownerPrototypeId}`,
          })),
        ]"
        aria-label="组件实现"
        @update:model-value="setExtension(String($event))"
      />
    </div>
  </section>
</template>
<style scoped>
.device-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 650;
}
.settings-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(var(--v-theme-primary), 0.09);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
}
.setting-dimensions {
  display: flex;
  gap: 10px;
}
.setting-dimensions > .setting-field {
  flex: 1;
}
.setting-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.setting-field > span {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.58);
}
.setting-field > strong {
  font-size: 12px;
  font-weight: 500;
  min-height: 34px;
  display: flex;
  align-items: center;
}
.setting-note {
  margin: 0;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  line-height: 1.5;
}
</style>
