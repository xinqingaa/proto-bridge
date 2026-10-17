<script setup lang="ts">
import { vPb } from "@/authoring/pb-style";
import { scope } from "./screen";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import {
  themeConstantCss,
  themeConstantNumber,
} from "@/design-system/theme/constants";

import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Badge from "@/design-system/components/display/Badge.vue";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import DialogPanel from "@/design-system/components/feedback/ConfirmDialog.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import ColdChainShell from "../../ColdChainShell.vue";
import { shipmentEvents, temperatureReadings } from "../../mock";
import { openColdChainScreen, replaceColdChainVariant } from "../../nav";
const CHART_MIN = 4;
const CHART_MAX = 12;
const CHART_LIMIT = 8;
const ROUTE_PROGRESS = 68;
const CHART_BAR_MIN_HEIGHT = useTokenNumber("size.icon-compact");
const CHART_PLOT_HEIGHT = themeConstantNumber("layout.chart-plot-height");

const routeStyle = {
  "--pb-route-progress": `${ROUTE_PROGRESS}%`,
};
const chartStyle = {
  "--pb-chart-limit-position": `${((CHART_MAX - CHART_LIMIT) / (CHART_MAX - CHART_MIN)) * 100}%`,
};

function chartBarStyle(value: number) {
  const ratio = Math.max(
    0,
    Math.min(1, (value - CHART_MIN) / (CHART_MAX - CHART_MIN)),
  );
  return {
    "--pb-chart-bar-height": `${Math.max(CHART_BAR_MIN_HEIGHT.value, ratio * CHART_PLOT_HEIGHT)}px`,
  };
}

const route = useRoute();
const router = useRouter();
const sheetOpen = ref(false);
const dialogOpen = ref(false);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const shipmentId = computed(() =>
  typeof route.query.shipment === "string" ? route.query.shipment : "SH-2048",
);
const hasExcursion = computed(() =>
  ["active-excursion", "action-sheet-open", "acknowledge-dialog-open"].includes(
    variant.value,
  ),
);

watch(
  variant,
  (value) => {
    sheetOpen.value = value === "action-sheet-open";
    dialogOpen.value = value === "acknowledge-dialog-open";
  },
  { immediate: true },
);

function openActions() {
  sheetOpen.value = true;
  void replaceColdChainVariant(router, route, "action-sheet-open");
}

function openResolution() {
  sheetOpen.value = false;
  void openColdChainScreen(
    router,
    route,
    "resolution-form",
    "ready-to-submit",
    shipmentId.value,
  );
}

function openAcknowledge() {
  sheetOpen.value = false;
  dialogOpen.value = true;
  void replaceColdChainVariant(router, route, "acknowledge-dialog-open");
}

function closeOverlay() {
  sheetOpen.value = false;
  dialogOpen.value = false;
  void replaceColdChainVariant(
    router,
    route,
    hasExcursion.value ? "active-excursion" : "default",
  );
}
</script>

<template>
  <ColdChainShell
    title="运输详情"
    screen-id="cold-chain-ops.shipment-detail"
    back-to="exception-queue"
  >
    <div
      class="detail-page"
      v-pb="
        scope.node('root', 'page', {
          tokens: {
            background: 'color.background',
            color: 'color.on-background',
            spacing: 'spacing.md',
          },
        })
      "
    >
      <ScrollableDataList
        class="detail-scroll"
        :pull-refresh="false"
        :load-more="false"
        :drag-scroll="{ enabled: true, mouse: true, momentum: true }"
        :inspect-id="scope.id('scroll-list')"
      >
        <div class="detail-content">
          <section
            v-if="hasExcursion"
            class="excursion-alert"
            role="alert"
            v-pb="
              scope.node('alert', 'status', {
                tokens: {
                  background: 'color.error-soft',
                  color: 'color.error',
                  radius: 'radius.surface',
                  spacing: 'spacing.md',
                },
              })
            "
          >
            <Icon name="alert-triangle" size="lg" tone="error" />
            <div>
              <strong
                v-pb="
                  scope.node('alert.title', 'text', {
                    tokens: {
                      typography: 'typography.subtitle',
                      color: 'color.error',
                    },
                  })
                "
                >持续超温 47 分钟</strong
              >
              <span
                v-pb="
                  scope.node('alert.description', 'text', {
                    tokens: {
                      typography: 'typography.caption',
                      color: 'color.on-surface-muted',
                    },
                  })
                "
                >当前 10.8°C，已高于运输上限 2.8°C</span
              >
            </div>
            <Badge
              label="严重"
              tone="error"
              :inspect-id="scope.id('alert.badge')"
            />
          </section>

          <section
            v-if="variant === 'sensor-offline'"
            class="sensor-error"
            role="alert"
            v-pb="
              scope.node('sensor-error', 'error-state', {
                tokens: {
                  background: 'color.warning-soft',
                  color: 'color.warning',
                  radius: 'radius.surface',
                  spacing: 'spacing.md',
                },
              })
            "
          >
            <Icon name="radio" size="lg" tone="warning" />
            <div>
              <strong>探头 T-07 已离线 18 分钟</strong>
              <span>当前温度不可确认，请联系司机检查探头电源。</span>
            </div>
          </section>

          <Card semantic-role="summary" :inspect-id="scope.id('summary')">
            <div
              class="card-body"
              v-pb="
                scope.node('summary.body', 'section', {
                  style: { padding: 'spacing.md', gap: 'spacing.sm-plus' },
                })
              "
            >
              <header class="card-heading">
                <div>
                  <h2>运输概览</h2>
                  <p>{{ shipmentId }} · 预计 16:20 到达</p>
                </div>
              </header>
              <div class="route-line" :style="routeStyle">
                <div>
                  <Icon name="snowflake" size="md" /><span>上海虹桥冷库</span>
                </div>
                <span class="route-progress"><i /></span>
                <div>
                  <Icon name="map-pin" size="md" /><span>杭州临平中心</span>
                </div>
              </div>
              <dl class="shipment-facts">
                <div>
                  <dt>货物</dt>
                  <dd>生物制剂 · 18 箱</dd>
                </div>
                <div>
                  <dt>车辆</dt>
                  <dd>沪A·7K21 · 周其明</dd>
                </div>
                <div>
                  <dt>设备</dt>
                  <dd>探头 T-07 · 2 分钟/次</dd>
                </div>
                <div>
                  <dt>温区</dt>
                  <dd>2–8°C</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card
            semantic-role="section"
            :inspect-id="scope.id('temperature-section')"
          >
            <div
              class="card-body"
              v-pb="
                scope.node('temperature-body', 'section', {
                  style: { padding: 'spacing.md', gap: 'spacing.sm-plus' },
                })
              "
            >
              <header class="card-heading">
                <div>
                  <h2>箱温趋势</h2>
                  <p>最近 70 分钟 · 上限 8°C</p>
                </div>
              </header>
              <div
                class="temperature-chart"
                :style="chartStyle"
                v-pb="
                  scope.node('temperature-chart', 'chart', {
                    style: {
                      background: 'color.surface-variant',
                      radius: 'radius.control',
                    },
                    tokens: {
                      color: 'color.on-surface',
                      spacing: 'spacing.sm',
                    },
                  })
                "
              >
                <div class="chart-scale">
                  <span>12°</span><span>8°</span><span>4°</span>
                </div>
                <div class="chart-bars" aria-label="温度从 5.4 度升至 10.8 度">
                  <div
                    v-for="reading in temperatureReadings"
                    :key="reading.id"
                    class="reading"
                    :class="{ 'is-over': reading.value > 8 }"
                  >
                    <i :style="chartBarStyle(reading.value)" />
                    <span>{{ reading.id }}</span>
                  </div>
                </div>
                <div class="limit-line"><span>8°C 上限</span></div>
              </div>
              <div class="temperature-summary">
                <div
                  v-pb="
                    scope.node('temperature.metric', 'status', {
                      key: 'current',
                      tokens: {
                        typography: 'typography.title',
                        color: 'color.error',
                      },
                    })
                  "
                >
                  <span>当前</span
                  ><strong>{{ hasExcursion ? "10.8°C" : "6.1°C" }}</strong>
                </div>
                <div
                  v-pb="
                    scope.node('temperature.metric', 'status', {
                      key: 'maximum',
                      tokens: {
                        typography: 'typography.title',
                        color: 'color.on-surface',
                      },
                    })
                  "
                >
                  <span>最高</span><strong>10.8°C</strong>
                </div>
                <div
                  v-pb="
                    scope.node('temperature.metric', 'status', {
                      key: 'duration',
                      tokens: {
                        typography: 'typography.title',
                        color: 'color.on-surface',
                      },
                    })
                  "
                >
                  <span>超温</span><strong>47m</strong>
                </div>
              </div>
            </div>
          </Card>

          <Card semantic-role="section" :inspect-id="scope.id('timeline-card')">
            <div
              class="card-body"
              v-pb="
                scope.node('timeline-body', 'section', {
                  style: { padding: 'spacing.md', gap: 'spacing.sm-plus' },
                })
              "
            >
              <header class="card-heading">
                <div>
                  <h2>运输事件</h2>
                  <p>自动记录与人工操作合并展示</p>
                </div>
              </header>
              <div
                class="event-list"
                v-pb="
                  scope.node('timeline', 'list', {
                    tokens: {
                      spacing: 'spacing.md',
                      color: 'color.on-surface',
                    },
                  })
                "
              >
                <div
                  v-for="event in shipmentEvents"
                  :key="event.id"
                  class="event-row"
                  v-pb="
                    scope.node('timeline.event', 'list-item', {
                      key: event.id,
                      tokens: {
                        spacing: 'spacing.sm-plus',
                        color: 'color.on-surface',
                      },
                    })
                  "
                >
                  <i :class="`tone-${event.tone}`" />
                  <time>{{ event.time }}</time>
                  <div>
                    <strong
                      v-pb="
                        scope.node('timeline.event.title', 'text', {
                          key: event.id,
                          tokens: {
                            typography: 'typography.content',
                            color: 'color.on-surface',
                          },
                        })
                      "
                      >{{ event.title }}</strong
                    >
                    <span
                      v-pb="
                        scope.node('timeline.event.detail', 'text', {
                          key: event.id,
                          style: {
                            color: 'color.on-surface-muted',
                            typography: 'typography.caption',
                          },
                        })
                      "
                      >{{ event.detail }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div class="primary-actions">
            <Button
              label="开始处置"
              block
              :inspect-id="scope.id('open-actions')"
              data-pb-action="open-actions"
              @click="openActions"
            >
              <template #prepend><Icon name="truck" size="md" /></template>
            </Button>
          </div>
        </div>
      </ScrollableDataList>

      <BottomSheet
        v-model="sheetOpen"
        title="选择处置方式"
        :inspect-id="scope.id('action-sheet')"
        @update:model-value="(value) => !value && closeOverlay()"
      >
        <div class="sheet-actions">
          <Button
            label="填写处置记录"
            block
            :inspect-id="scope.id('open-resolution')"
            data-pb-action="open-resolution"
            @click="openResolution"
          />
          <Button
            label="仅确认接手"
            kind="outlined"
            block
            :inspect-id="scope.id('acknowledge')"
            @click="openAcknowledge"
          />
          <p>确认接手不会关闭异常，提交处置记录后才会进入持续监控。</p>
        </div>
      </BottomSheet>

      <DialogPanel
        v-model="dialogOpen"
        title="确认接手异常？"
        message="接手后调度中心会将你标记为当前负责人。"
        confirm-label="确认接手"
        :inspect-id="scope.id('ack-dialog')"
        @confirm="closeOverlay"
      />
    </div>
  </ColdChainShell>
</template>

<style scoped>
.detail-page,
.detail-scroll {
  height: var(--pb-layout-fill);
  min-height: var(--pb-layout-zero);
}
.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  padding-bottom: var(--pb-spacing-2xl);
}
.card-body {
  display: flex;
  flex-direction: column;
}
.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}
.card-heading h2,
.card-heading p {
  margin: var(--pb-layout-zero);
}
.card-heading h2 {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.card-heading p {
  margin-top: var(--pb-spacing-xxs);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.excursion-alert,
.sensor-error {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  border-radius: var(--pb-radius-surface);
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
}
.sensor-error {
  background: var(--pb-color-warning-soft);
  color: var(--pb-color-warning);
}
.excursion-alert div,
.sensor-error div {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  gap: var(--pb-spacing-xs);
}
.excursion-alert span,
.sensor-error span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.route-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.route-line > div {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-width: var(--pb-layout-zero);
  font: var(--pb-typography-content);
}
.route-progress {
  flex: none;
  width: var(--pb-size-control-large);
  height: var(--pb-size-stroke);
  background: var(--pb-color-border);
}
.route-progress i {
  display: block;
  width: var(--pb-route-progress);
  height: var(--pb-layout-fill);
  background: var(--pb-color-primary);
}
.shipment-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-md);
  margin: var(--pb-spacing-md) var(--pb-layout-zero) var(--pb-layout-zero);
}
.shipment-facts div {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  min-width: var(--pb-layout-zero);
}
.shipment-facts dt {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.shipment-facts dd {
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-content);
}
.temperature-chart {
  position: relative;
  display: flex;
  min-height: var(--pb-layout-chart-min-height);
  padding: var(--pb-spacing-sm);
}
.chart-scale {
  display: flex;
  flex: none;
  flex-direction: column;
  justify-content: space-between;
  width: var(--pb-size-avatar-compact);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.chart-bars {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  align-items: end;
  gap: var(--pb-spacing-xs);
  min-width: var(--pb-layout-zero);
  border-bottom: var(--pb-border-default);
}
.reading {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--pb-spacing-xs);
  height: var(--pb-layout-chart-plot-height);
}
.reading i {
  width: var(--pb-size-icon-compact);
  max-width: var(--pb-layout-fill);
  height: var(--pb-chart-bar-height);
  border-radius: var(--pb-radius-control-compact)
    var(--pb-radius-control-compact) var(--pb-layout-zero) var(--pb-layout-zero);
  background: var(--pb-color-primary);
}
.reading.is-over i {
  background: var(--pb-color-error);
}
.reading span {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
  white-space: nowrap;
}
.limit-line {
  position: absolute;
  top: var(--pb-chart-limit-position);
  right: var(--pb-spacing-sm);
  left: calc(var(--pb-size-avatar-compact) + var(--pb-spacing-sm));
  border-top: var(--pb-border-width) dashed var(--pb-color-error);
}
.limit-line span {
  position: absolute;
  right: var(--pb-layout-zero);
  bottom: var(--pb-spacing-xs);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
.temperature-summary {
  display: flex;
  margin-top: var(--pb-spacing-md);
}
.temperature-summary div {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  text-align: center;
}
.temperature-summary span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.temperature-summary strong {
  font: var(--pb-typography-title);
}
.event-list {
  display: flex;
  flex-direction: column;
}
.event-row {
  display: flex;
  align-items: flex-start;
  gap: var(--pb-spacing-sm-plus);
  padding-block: var(--pb-spacing-sm-plus);
}
.event-row + .event-row {
  border-top: var(--pb-border-default);
}
.event-row > i {
  flex: none;
  width: var(--pb-size-caret);
  height: var(--pb-size-caret);
  margin-top: var(--pb-spacing-xs);
  border-radius: var(--pb-radius-pill);
  background: var(--pb-color-primary);
}
.event-row > i.tone-error {
  background: var(--pb-color-error);
}
.event-row > i.tone-warning {
  background: var(--pb-color-warning);
}
.event-row > i.tone-success {
  background: var(--pb-color-success);
}
.event-row time {
  flex: none;
  width: var(--pb-spacing-lg-plus);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.event-row div {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  gap: var(--pb-spacing-xs);
}

.sheet-actions {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
}
.sheet-actions p {
  margin: var(--pb-layout-zero);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
