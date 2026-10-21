<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ArrowRight, Check, ChevronRight, Play, Layers } from "lucide-vue-next";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import ThemeSurface from "../studio-shared/ThemeSurface.vue";
import SampleBoard from "../studio-shared/SampleBoard.vue";
import {
  sources,
  pack,
  sourceById,
  differences,
  origin,
  modeItems,
  type Mode,
} from "../studio-shared/themes";
import {
  runtimeThemeSources,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { themePackCssValues } from "@/design-system/theme/presentation";
import "../studio-shared/studio.css";

const mode = ref<Mode>("light");
const selected = ref("yike");
const themeNames = reactive(
  Object.fromEntries(sources.map((s) => [s.id, pack(s.packId).defaultTheme])),
);
const current = computed(() => sourceById(selected.value));
const theme = computed(() => themeNames[current.value.id]!);
const table = computed(() =>
  resolveRuntimeTheme(current.value.packId, theme.value, mode.value),
);
const css = computed(() =>
  themePackCssValues(current.value.packId, theme.value, mode.value),
);
const baseCss = computed(() =>
  themePackCssValues("pbwork-base", "default", mode.value),
);
const tabs = [
  { value: "color", label: "色彩与表面" },
  { value: "type", label: "字阶" },
  { value: "space", label: "空间与形状" },
  { value: "layout", label: "布局与约束" },
  { value: "effects", label: "层级与材质" },
  { value: "motion", label: "动效" },
  { value: "diff", label: "与基础差异" },
  { value: "constants", label: "实现常量" },
];
const tab = ref("color");
const chosen = ref("");
const shifted = ref(false);
const narrow = ref(false);
const playing = ref(false);
watch(tab, () => {
  chosen.value = "";
});
const keys = computed(() => runtimeThemeSources.keyCatalog.keys);
const colorPairs = [
  ["color.on-background", "color.background", "页面"],
  ["color.on-surface", "color.surface", "内容表面"],
  ["color.on-action", "color.action", "主操作"],
  ["color.on-primary", "color.primary", "品牌强调"],
  ["color.on-success", "color.success", "成功"],
  ["color.on-error", "color.error", "错误"],
];
const typography = computed(() =>
  keys.value.filter((k) =>
    [
      "typography.display",
      "typography.headline",
      "typography.title",
      "typography.content",
      "typography.label",
      "typography.caption",
      "typography.numeric-display",
      "typography.numeric-content",
    ].includes(k.id),
  ),
);
const spaces = [
  "spacing.xs",
  "spacing.sm",
  "spacing.md",
  "spacing.lg",
  "spacing.2xl",
];
const radii = [
  "radius.control-compact",
  "radius.control",
  "radius.surface",
  "radius.overlay",
];
const elevation = [
  "elevation.surface",
  "elevation.raised",
  "elevation.floating",
  "elevation.overlay",
];
const changed = computed(() =>
  differences(current.value.packId, theme.value, mode.value),
);
const duration = computed(() => css.value["motion.duration-medium"] ?? "240ms");
const chosenKey = computed(() => keys.value.find((k) => k.id === chosen.value));
const reference = computed(() => table.value.provenance[chosen.value]);
const constants = runtimeThemeSources.constants.constants;
function displayValue(key: string, value: string | undefined) {
  return key.startsWith("asset.")
    ? value === "none"
      ? "未设置"
      : "图形资源"
    : value;
}
function selectSource(id: string) {
  selected.value = id;
  chosen.value = "";
}
</script>

<template>
  <main class="pvs-lab">
    <header class="pvs-heading">
      <div>
        <span class="pvs-kicker">设计资源 · 风格草稿</span>
        <h1>主题与设计基础</h1>
        <p>先看整体性格，再理解每一条设计规则。</p>
      </div>
      <WorkbenchSegmented
        :model-value="mode"
        :items="modeItems"
        label="主题显示模式"
        @update:model-value="mode = $event === 'dark' ? 'dark' : 'light'"
      />
    </header>
    <section class="pvs-pack-gallery" aria-label="主题来源">
      <article
        v-for="source in sources"
        :key="source.id"
        class="pvs-pack-card"
        :class="{ 'is-selected': selected === source.id }"
      >
        <button
          class="pvs-card-pick"
          :aria-pressed="selected === source.id"
          @click="selectSource(source.id)"
        >
          <span class="pvs-card-kind">{{ source.kind }}</span
          ><strong>{{ source.label }}</strong
          ><Check v-if="selected === source.id" :size="17" /><ChevronRight
            v-else
            :size="17"
          />
        </button>
        <p class="pvs-card-note">{{ source.note }}</p>
        <div class="pvs-card-theme">
          <WorkbenchSelect
            :model-value="themeNames[source.id]!"
            :items="
              pack(source.packId).themes.map((t) => ({
                value: t.id,
                label: t.label,
              }))
            "
            :aria-label="`${source.label}的主题`"
            :disabled="pack(source.packId).themes.length === 1"
            @update:model-value="themeNames[source.id] = $event"
          />
        </div>
        <ThemeSurface
          :pack-id="source.packId"
          :theme="themeNames[source.id]!"
          :mode="mode"
          ><SampleBoard compact
        /></ThemeSurface>
        <footer>
          <span>{{
            source.packId === "pbwork-base"
              ? "基础定义"
              : `与基础不同 ${differences(source.packId, themeNames[source.id]!, mode).length} 项`
          }}</span
          ><code>{{ source.packId }}</code>
        </footer>
      </article>
    </section>

    <section class="pvs-foundation" aria-label="设计基础样品">
      <header class="pvs-detail-heading">
        <div>
          <span class="pvs-kicker">正在查看</span>
          <h2>
            {{ current.label }}
            <span
              >·
              {{
                pack(current.packId).themes.find((t) => t.id === theme)?.label
              }}
              / {{ mode === "light" ? "浅色" : "深色" }}</span
            >
          </h2>
        </div>
        <span class="pvs-lineage"
          ><Layers :size="14" />基础 DS<template
            v-if="current.packId !== 'pbwork-base'"
            ><ArrowRight :size="13" />{{ current.label }}</template
          ><template v-else-if="current.kind === '原型'">
            · 原型直接使用基础包</template
          ></span
        >
      </header>
      <nav class="pvs-category-nav" aria-label="设计基础分类">
        <button
          v-for="item in tabs"
          :key="item.value"
          :aria-pressed="tab === item.value"
          @click="tab = item.value"
        >
          {{ item.label }}
        </button>
      </nav>

      <ThemeSurface :pack-id="current.packId" :theme="theme" :mode="mode">
        <div class="pvs-foundation-samples">
          <div v-if="tab === 'color'" class="pvs-color-grid">
            <button
              v-for="[fg, bg, label] in colorPairs"
              :key="bg"
              class="pvs-color-pair"
              :style="{ background: css[bg!], color: css[fg!] }"
              @click="chosen = bg!"
            >
              <strong>{{ label }}</strong
              ><span>正文与背景一起观察</span><small>{{ css[bg!] }}</small>
            </button>
          </div>
          <div v-else-if="tab === 'type'" class="pvs-type-list">
            <button
              v-for="item in typography"
              :key="item.id"
              @click="chosen = item.id"
            >
              <span class="pvs-type-label">{{ item.label ?? item.id }}</span
              ><span :style="{ font: css[item.id] }">{{
                item.id.includes("numeric")
                  ? "12,480.60"
                  : "让每一层信息，都清楚可读。"
              }}</span
              ><code>{{ css[item.id] }}</code>
            </button>
          </div>
          <div v-else-if="tab === 'space'" class="pvs-shape-layout">
            <section>
              <h3>间距 · 相同起点比较长度</h3>
              <button
                v-for="key in spaces"
                :key="key"
                class="pvs-space-item"
                @click="chosen = key"
              >
                <code>{{ key }}</code
                ><i :style="{ width: css[key] }" /><strong>{{
                  css[key]
                }}</strong>
              </button>
            </section>
            <section>
              <h3>圆角 · 相同表面比较轮廓</h3>
              <div class="pvs-radius-row">
                <button v-for="key in radii" :key="key" @click="chosen = key">
                  <i :style="{ borderRadius: css[key] }" /><span>{{
                    css[key]
                  }}</span
                  ><code>{{ key }}</code>
                </button>
              </div>
              <div class="pvs-control-measure">
                <span>控件高度</span
                ><i :style="{ height: css['size.control'] }" /><strong>{{
                  css["size.control"]
                }}</strong>
              </div>
            </section>
          </div>
          <div v-else-if="tab === 'layout'" class="pvs-relationship-grid">
            <section>
              <h3>填充比例</h3>
              <p>实色是元素，虚线是父容器。</p>
              <div class="pvs-fill-track">
                <i style="width: var(--pb-layout-fill)">100%</i>
              </div>
              <div class="pvs-fill-track">
                <i style="width: var(--pb-layout-half)">50%</i>
              </div>
              <code>layout.fill / layout.half</code>
            </section>
            <section>
              <h3>负向位移</h3>
              <p>按元素自身宽度向左移动一半。</p>
              <div class="pvs-shift-track">
                <span>原位</span
                ><i :class="{ 'is-shifted': shifted }">{{
                  shifted ? "−50%" : "原位"
                }}</i>
              </div>
              <WorkbenchButton @click="shifted = !shifted">{{
                shifted ? "恢复原位" : "向左移动"
              }}</WorkbenchButton>
            </section>
            <section>
              <h3>容器约束</h3>
              <p>不超过 320px，也不超出父容器。</p>
              <div class="pvs-constraint" :class="{ 'is-narrow': narrow }">
                <div>内容宽度受上限约束</div>
              </div>
              <WorkbenchButton @click="narrow = !narrow">{{
                narrow ? "恢复容器" : "收窄容器"
              }}</WorkbenchButton
              ><code>layout.dialog-max-width · 实现常量</code>
            </section>
          </div>
          <div v-else-if="tab === 'effects'" class="pvs-effect-layout">
            <section>
              <h3>阴影 · 同一背景观察浮起程度</h3>
              <div class="pvs-elevation-row">
                <button
                  v-for="key in elevation"
                  :key="key"
                  @click="chosen = key"
                >
                  <i :style="{ boxShadow: css[key] }" /><code>{{ key }}</code>
                </button>
              </div>
            </section>
            <section>
              <h3>材质 · 背景参与效果</h3>
              <div class="pvs-material-scene">
                <div
                  class="pvs-material-card"
                  :style="{
                    backdropFilter:
                      table.values['surface.treatment'] === 'glass'
                        ? css['surface.glass-backdrop']
                        : 'none',
                    background:
                      table.values['surface.treatment'] === 'glass'
                        ? 'color-mix(in srgb,var(--pb-color-surface) 60%,transparent)'
                        : 'var(--pb-color-surface)',
                  }"
                >
                  <strong>{{ table.values["surface.treatment"] }}</strong
                  ><span>{{
                    table.values["surface.treatment"] === "glass"
                      ? "透过表面观察背景图形"
                      : "当前实色表面覆盖背景图形"
                  }}</span>
                </div>
              </div>
              <button
                class="pvs-text-link"
                @click="chosen = 'surface.glass-backdrop'"
              >
                查看材质取值 <ChevronRight :size="13" />
              </button>
            </section>
            <section class="pvs-layers-section">
              <h3>层级 · 页面、遮罩与浮层</h3>
              <div class="pvs-layer-scene">
                <span>页面内容</span>
                <div class="pvs-layer-scrim" />
                <div class="pvs-layer-panel">
                  <strong>当前任务</strong
                  ><span>浮层在遮罩之上，背景仍保留上下文。</span>
                </div>
              </div>
              <p>层级由共享机制管理，主题控制表面、阴影与遮罩颜色。</p>
            </section>
          </div>
          <div v-else-if="tab === 'motion'" class="pvs-motion-demo">
            <div>
              <h3>动效需要播放，才能比较</h3>
              <p>同一段距离，体验当前主题的时长与缓动。</p>
              <WorkbenchButton @click="playing = !playing"
                ><Play :size="14" />{{
                  playing ? "返回起点" : "播放位移"
                }}</WorkbenchButton
              >
            </div>
            <div class="pvs-motion-track">
              <i
                :class="{ 'is-playing': playing }"
                :style="{
                  transitionDuration: duration,
                  transitionTimingFunction: css['motion.easing-standard'],
                }"
              />
            </div>
            <button
              class="pvs-text-link"
              @click="chosen = 'motion.duration-medium'"
            >
              {{ duration }} · {{ table.values["motion.personality"] }}
              <ChevronRight :size="13" />
            </button>
          </div>
          <div v-else-if="tab === 'diff'" class="pvs-difference">
            <p v-if="!changed.length" class="pvs-empty">
              {{
                current.packId === "pbwork-base"
                  ? "当前就是基础包。"
                  : "当前主题与基础包解析值一致。"
              }}原型可以直接使用基础，无需创建另一份包。
            </p>
            <template v-else
              ><p>仅列出与基础不同的语义键与组件键；“不同”不等于直接覆盖。</p>
              <table>
                <thead>
                  <tr>
                    <th>设计项</th>
                    <th>基础值</th>
                    <th>当前值</th>
                    <th>来源关系</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in changed" :key="item.id">
                    <td>
                      <button @click="chosen = item.id">
                        {{ item.label ?? item.id }}<code>{{ item.id }}</code>
                      </button>
                    </td>
                    <td>{{ displayValue(item.id, baseCss[item.id]) }}</td>
                    <td>{{ displayValue(item.id, css[item.id]) }}</td>
                    <td>{{ origin(current.packId, theme, mode, item.id) }}</td>
                  </tr>
                </tbody>
              </table></template
            >
          </div>
          <div v-else class="pvs-constants">
            <p>只读实现参考，不随主题包覆盖，也不进入可绑定 Token 清单。</p>
            <div v-for="constant in constants" :key="constant.id">
              <code>{{ constant.id }}</code
              ><span>{{ constant.value }}</span>
            </div>
          </div>
        </div>
      </ThemeSurface>
      <section v-if="chosen" class="pvs-key-detail" aria-live="polite">
        <header>
          <strong>{{ chosenKey?.label ?? chosen }}</strong
          ><WorkbenchButton size="small" tone="ghost" @click="chosen = ''"
            >收起</WorkbenchButton
          >
        </header>
        <div>
          <code>{{ chosen }}</code
          ><b>{{ displayValue(chosen, css[chosen]) }}</b
          ><span>{{ origin(current.packId, theme, mode, chosen) }}</span>
        </div>
        <details>
          <summary>CSS 与引用来源</summary>
          <code>--pb-{{ chosen.replaceAll(".", "-") }}</code>
          <p>{{ reference?.chain.join(" → ") }}</p>
        </details>
      </section>
    </section>
    <footer class="pvs-disclaimer">
      主题与基础展示草稿 · 样品使用真实解析表与 DS 组件 · 不产生采集证据
    </footer>
  </main>
</template>
