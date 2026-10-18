<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  nextTick,
  useId,
  onBeforeUnmount,
} from "vue";
import { loadPrototypes } from "@/design-system/loaders";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import WorkbenchSwitch from "@/workbench/ui/WorkbenchSwitch.vue";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import { usePreviewPreferences } from "./preferences";
import { previewExtensions } from "./extensions/registry";
import { extensionApplicable } from "./extensions/model";
import PreviewControls from "./PreviewControls.vue";
import PreviewDevice from "./PreviewDevice.vue";
import PreviewValueTable from "./PreviewValueTable.vue";
import { DEFAULT_DEVICE_ID, getDevicePreset } from "@/workbench/canvas/devices";
import {
  fitPreviewScale,
  previewContexts,
  previewAlternatives,
  defaultPreviewSelection,
  createPreviewDevice,
} from "./model";
const props = defineProps<{
  resourceId: string;
  tokenIds?: string[];
  initialMode?: string;
  initialContext?: string | undefined;
}>();
const contexts = previewContexts(runtimeThemeSources.packs, loadPrototypes());
const preferences = usePreviewPreferences();
const settings = computed(() => preferences.settings);
const devices = ref([
  createPreviewDevice("A", {
    ...(settings.value.selections.A ??
      defaultPreviewSelection(contexts[0]!, runtimeThemeSources.packs)),
    ...(props.initialMode ? { mode: props.initialMode } : {}),
    ...(props.initialContext
      ? defaultPreviewSelection(
          contexts.find((context) => context.id === props.initialContext)!,
          runtimeThemeSources.packs,
        )
      : {}),
  }),
]);
const deviceBindings = computed(() =>
  Object.fromEntries(
    devices.value.map((device) => {
      const extension = previewExtensions.find(
        (entry) => entry.id === (device.demo.extensionId || props.resourceId),
      );
      return [
        device.id,
        extension
          ? extensionApplicable(extension, device.selection.contextId)
            ? extension.tokenIds
            : []
          : (props.tokenIds ?? []),
      ];
    }),
  ),
);
const effectiveTokenIds = computed(() => [
  ...new Set(Object.values(deviceBindings.value).flat()),
]);
const alternatives = previewAlternatives(contexts, runtimeThemeSources.packs);
const alternative = computed(() =>
  alternatives.find((s) => {
    const first = devices.value[0]!.selection;
    const firstContext = contexts.find((c) => c.id === first.contextId);
    const nextContext = contexts.find((c) => c.id === s.contextId);
    return (
      nextContext?.packId !== firstContext?.packId ||
      s.theme !== first.theme ||
      s.mode !== first.mode
    );
  }),
);
const track = ref<HTMLElement | null>(null);
const activeView = ref("preview");
const panelId = `preview-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const direction = ref("forward");
function setView(view: string) {
  direction.value = view === "source" ? "forward" : "backward";
  activeView.value = view;
}
// Ignore scroll events caused by our own writes, without blocking either device.
const scrollWrites = new WeakMap<HTMLElement, number>();
function syncScroll(event: Event) {
  if (activeView.value !== "preview") return;
  const source = event.target;
  if (
    !(source instanceof HTMLElement) ||
    !source.matches(
      '[data-preview-scroll], [data-pb-component="ds.scrollable-data-list"]',
    )
  )
    return;
  const expected = scrollWrites.get(source);
  scrollWrites.delete(source);
  if (expected !== undefined && Math.abs(source.scrollTop - expected) < 1)
    return;
  if (!settings.value.syncScroll || devices.value.length !== 2) return;
  const range = source.scrollHeight - source.clientHeight;
  const progress = range > 0 ? source.scrollTop / range : 0;
  const selector = source.matches("[data-preview-scroll]")
    ? "[data-preview-scroll]"
    : '[data-pb-component="ds.scrollable-data-list"]';
  const sourceDevice = source.closest("[data-preview-device]");
  const ordinal = Array.from(
    sourceDevice?.querySelectorAll(selector) ?? [],
  ).indexOf(source);
  track.value?.querySelectorAll("[data-preview-device]").forEach((device) => {
    if (device === sourceDevice) return;
    const target = device.querySelectorAll<HTMLElement>(selector)[ordinal];
    if (!target) return;
    const top =
      progress * Math.max(0, target.scrollHeight - target.clientHeight);
    if (Math.abs(target.scrollTop - top) < 1) return;
    scrollWrites.set(target, top);
    target.scrollTop = top;
  });
}
watch(
  () => [settings.value.syncScroll, devices.value.length, activeView.value],
  async () => {
    await nextTick();
    const first = track.value?.querySelector<HTMLElement>(
      "[data-preview-scroll]",
    );
    if (first) syncScroll({ target: first } as unknown as Event);
  },
);
const viewport = ref({ width: 0, height: 0 });
const sizeMode = computed({
  get: () => settings.value.sizeMode,
  set: (value: string) => {
    if (value === "fit" || value === "actual") settings.value.sizeMode = value;
  },
});
const preset = getDevicePreset(DEFAULT_DEVICE_ID);
const scale = computed(() =>
  sizeMode.value === "actual"
    ? Math.min(1, Math.max(0.1, (viewport.value.width - 24) / preset.width))
    : sizeMode.value === "custom"
      ? Math.min(
          settings.value.scale,
          Math.max(0.1, (viewport.value.width - 24) / preset.width),
        )
      : fitPreviewScale(
          viewport.value.width,
          Math.max(560, Math.min(760, viewport.value.height - 240)) - 54,
          devices.value.length === 2 && viewport.value.width >= 500 ? 2 : 1,
          preset.width,
          preset.height,
        ),
);
let observer: ResizeObserver | undefined;
function measureStage() {
  if (!track.value || !track.value.clientWidth) return;
  const style = getComputedStyle(track.value);
  viewport.value = {
    width:
      track.value.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    height: window.innerHeight,
  };
}
onMounted(() => {
  observer = new ResizeObserver(measureStage);
  if (track.value) observer.observe(track.value);
  window.addEventListener("resize", measureStage);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", measureStage);
});
function resizeDevice(value: number) {
  settings.value.scale = Math.max(0.25, Math.min(1.5, value));
  settings.value.sizeMode = "custom";
}
function setLayout(layout: string) {
  settings.value.layout = layout === "compare" ? "compare" : "single";
  if (layout === "single") {
    devices.value.splice(1);
    return;
  }
  if (layout !== "compare" || devices.value.length !== 1 || !alternative.value)
    return;
  devices.value.push(
    createPreviewDevice(
      "B",
      settings.value.selections.B ?? alternative.value,
      devices.value[0]!.demo,
    ),
  );
}
watch(() => settings.value.layout, setLayout, { immediate: true });
watch(
  () => devices.value.map((d) => ({ id: d.id, selection: d.selection })),
  (values) => {
    for (const { id, selection } of values) {
      if (
        JSON.stringify(settings.value.selections[id]) !==
        JSON.stringify(selection)
      )
        settings.value.selections[id] = { ...selection };
    }
  },
  { deep: true, immediate: true },
);
watch(
  () => settings.value.selections,
  (values) => {
    for (const device of devices.value) {
      const selection = values[device.id];
      if (
        selection &&
        JSON.stringify(selection) !== JSON.stringify(device.selection)
      )
        device.selection = { ...selection };
    }
  },
  { deep: true },
);
</script>
<template>
  <section
    class="preview-comparison"
    :class="{ 'is-comparing': devices.length === 2 }"
    :data-preview-resource="props.resourceId"
  >
    <header class="preview-toolbar">
      <div class="preview-tabs" role="tablist" aria-label="预览资料">
        <button
          v-for="view in [
            { id: 'preview', label: '预览' },
            { id: 'source', label: '来源' },
          ]"
          :id="`${panelId}-${view.id}-tab`"
          :key="view.id"
          type="button"
          role="tab"
          :aria-selected="activeView === view.id"
          :aria-controls="`${panelId}-${view.id}`"
          :tabindex="activeView === view.id ? 0 : -1"
          @click="setView(view.id)"
          @keydown.right.prevent="
            setView(view.id === 'preview' ? 'source' : 'preview');
            ($event.currentTarget as HTMLElement).parentElement
              ?.querySelector<HTMLElement>(`#${panelId}-${activeView}-tab`)
              ?.focus();
          "
          @keydown.left.prevent="
            setView(view.id === 'preview' ? 'source' : 'preview');
            ($event.currentTarget as HTMLElement).parentElement
              ?.querySelector<HTMLElement>(`#${panelId}-${activeView}-tab`)
              ?.focus();
          "
        >
          {{ view.label }}
        </button>
      </div>
    </header>
    <div class="comparison-layout">
      <aside
        v-show="activeView === 'preview'"
        class="comparison-settings"
        aria-label="预览控制"
      >
        <div class="display-settings">
          <WorkbenchSegmented
            v-if="alternative || devices.length === 2"
            :model-value="devices.length === 1 ? 'single' : 'compare'"
            :items="[
              { value: 'single', label: '单机' },
              { value: 'compare', label: '对比' },
            ]"
            label="预览布局"
            fill
            @update:model-value="setLayout"
          />
          <div class="size-control">
            <span
              >{{ preset.width }} × {{ preset.height }} ·
              {{ Math.round(scale * 100) }}%</span
            ><WorkbenchSegmented
              v-model="sizeMode"
              :items="[
                { value: 'fit', label: '适应视区' },
                { value: 'actual', label: '100%' },
              ]"
              label="预览尺寸"
              fill
            />
            <small v-if="sizeMode === 'actual' && scale < 1"
              >当前宽度不足，已缩小以完整显示</small
            >
            <small v-else>拖动手机右下角等比调整显示尺寸</small>
          </div>
        </div>
        <PreviewControls
          :resource-id="resourceId"
          v-for="device in devices"
          :key="device.id"
          :device="device"
          :contexts="contexts"
          :comparing="devices.length === 2"
        />
      </aside>
      <div class="comparison-pages" :data-direction="direction">
        <Transition name="preview-page">
          <div
            v-show="activeView === 'preview'"
            :id="`${panelId}-preview`"
            role="tabpanel"
            :aria-labelledby="`${panelId}-preview-tab`"
            ref="track"
            class="comparison-track"
            :data-size-mode="sizeMode"
            @scroll.capture="syncScroll"
          >
            <div
              v-if="devices.length === 2"
              class="stage-tools"
              aria-label="舞台控制"
            >
              <WorkbenchSwitch v-model="settings.syncScroll" label="共同滚动" />
            </div>
            <PreviewDevice
              v-for="device in devices"
              :key="device.id"
              :device="device"
              :contexts="contexts"
              :comparing="devices.length === 2"
              :scale="scale"
              @resize="resizeDevice"
            >
              <template #default="sample"><slot v-bind="sample" /></template>
            </PreviewDevice>
          </div>
        </Transition>
        <Transition name="preview-page">
          <div
            v-show="activeView === 'source'"
            :id="`${panelId}-source`"
            role="tabpanel"
            :aria-labelledby="`${panelId}-source-tab`"
            class="source-page"
          >
            <PreviewValueTable
              :devices="devices"
              :contexts="contexts"
              :token-ids="effectiveTokenIds"
              :device-bindings="deviceBindings"
            />
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>
<style scoped>
.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  min-height: 52px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.preview-toolbar :deep(.wb-checkbox) {
  flex: none;
}
.preview-tabs {
  display: flex;
  gap: 24px;
  align-self: stretch;
}
.preview-tabs button {
  position: relative;
  padding: 15px 2px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.preview-tabs button[aria-selected="true"] {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.preview-tabs button[aria-selected="true"]::after {
  content: "";
  position: absolute;
  height: 2px;
  bottom: 0;
  left: 0;
  right: 0;
  background: currentColor;
  border-radius: 2px;
}
.preview-tabs button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -4px;
  border-radius: 4px;
}
.comparison-pages {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: clip;
}
.source-page {
  min-height: 420px;
}
.source-page :deep(.preview-values) {
  border-top: 0;
}
.preview-page-enter-active,
.preview-page-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.preview-page-leave-active {
  position: absolute;
  top: 0;
  width: 100%;
  pointer-events: none;
}
.preview-page-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.preview-page-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}
[data-direction="backward"] .preview-page-enter-from {
  transform: translateX(-24px);
}
[data-direction="backward"] .preview-page-leave-to {
  transform: translateX(24px);
}
@media (prefers-reduced-motion: reduce) {
  .preview-page-enter-active,
  .preview-page-leave-active {
    transition: none;
  }
}
.preview-comparison {
  width: 100%;
  max-width: 880px;
  margin-inline: 0;
  min-width: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  overflow: hidden;
  container-type: inline-size;
  background: rgb(var(--v-theme-surface));
}
.preview-comparison.is-comparing {
  max-width: 1120px;
}
.comparison-layout {
  display: flex;
  min-width: 0;
}
.comparison-settings {
  flex: 0 0 220px;
  min-width: 0;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-self: stretch;
  box-sizing: border-box;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.comparison-settings :deep(.device-settings + .device-settings) {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 20px;
}
.stage-tools {
  display: flex;
  flex: 0 0 100%;
  justify-content: flex-end;
  margin-top: -12px;
  margin-bottom: -8px;
}
.comparison-track {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: safe center;
  align-items: flex-start;
  gap: 16px;
  overflow: visible;
  box-sizing: border-box;
  padding: 24px 16px 36px;
  background: rgba(var(--v-theme-on-surface), 0.022);
}
.display-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.size-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.size-control > small {
  font-size: 10px;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.size-control > span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 11px;
}
.comparison-track::-webkit-scrollbar,
.comparison-settings::-webkit-scrollbar {
  display: none;
}
@container (max-width: 760px) {
  .comparison-layout {
    flex-direction: column;
    height: auto;
  }
  .comparison-pages {
    width: 100%;
  }
  .size-control {
    flex: 0 0 160px;
  }
  .comparison-settings {
    flex: auto;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px;
    border-right: 0;
    border-bottom: 1px solid
      rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .display-settings {
    flex: 0 0 100%;
    flex-direction: row;
    gap: 16px;
    align-items: flex-start;
  }
  .display-settings > :deep(.wb-segmented) {
    width: auto;
    flex: 0 0 112px;
    align-self: flex-start;
  }
  .comparison-settings > :deep(.device-settings) {
    flex: 1 1 200px;
  }
  .comparison-settings :deep(.device-settings + .device-settings) {
    border-top: 0;
    padding-top: 0;
  }
}
</style>
