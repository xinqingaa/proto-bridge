<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AlertTriangle,
  MapPin,
  Radio,
  Snowflake,
  Truck,
} from "lucide-vue-next";
import Badge from "@/design-system/components/basic/Badge.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Card from "@/design-system/components/basic/Card.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import DialogPanel from "@/design-system/components/complex/DialogPanel.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";
import ColdChainShell from "../ColdChainShell.vue";
import { shipmentEvents, temperatureReadings } from "../mock";
import { openColdChainScreen, replaceColdChainVariant } from "../nav";

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
      data-pb-id="cold-chain-ops.shipment-detail.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
      data-pb-token-spacing="spacing.md"
    >
      <ScrollableDataList
        class="detail-scroll"
        :pull-refresh="false"
        :load-more="false"
        :drag-scroll="{ enabled: true, mouse: true, momentum: true }"
        inspect-id="cold-chain-ops.shipment-detail.scroll-list"
      >
        <div class="detail-content">
          <section
            v-if="hasExcursion"
            class="excursion-alert"
            role="alert"
            data-pb-id="cold-chain-ops.shipment-detail.alert"
            data-pb-role="status"
            data-pb-token-background="color.error-soft"
            data-pb-token-color="color.error"
            data-pb-token-radius="radius.lg"
            data-pb-token-spacing="spacing.md"
          >
            <AlertTriangle :size="22" />
            <div>
              <strong
                data-pb-id="cold-chain-ops.shipment-detail.alert.title"
                data-pb-role="text"
                data-pb-token-typography="typography.subtitle"
                data-pb-token-color="color.error"
                >持续超温 47 分钟</strong
              >
              <span
                data-pb-id="cold-chain-ops.shipment-detail.alert.description"
                data-pb-role="text"
                data-pb-token-typography="typography.caption"
                data-pb-token-color="color.on-surface-muted"
                >当前 10.8°C，已高于运输上限 2.8°C</span
              >
            </div>
            <Badge
              label="严重"
              tone="error"
              inspect-id="cold-chain-ops.shipment-detail.alert.badge"
            />
          </section>

          <section
            v-if="variant === 'sensor-offline'"
            class="sensor-error"
            role="alert"
            data-pb-id="cold-chain-ops.shipment-detail.sensor-error"
            data-pb-role="error-state"
            data-pb-token-background="color.warning-soft"
            data-pb-token-color="color.warning"
            data-pb-token-radius="radius.lg"
            data-pb-token-spacing="spacing.md"
          >
            <Radio :size="22" />
            <div>
              <strong>探头 T-07 已离线 18 分钟</strong>
              <span>当前温度不可确认，请联系司机检查探头电源。</span>
            </div>
          </section>

          <Card
            title="运输概览"
            :subtitle="`${shipmentId} · 预计 16:20 到达`"
            semantic-role="summary"
            inspect-id="cold-chain-ops.shipment-detail.summary"
          >
            <div class="route-line">
              <div><Snowflake :size="20" /><span>上海虹桥冷库</span></div>
              <span class="route-progress"><i /></span>
              <div><MapPin :size="20" /><span>杭州临平中心</span></div>
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
          </Card>

          <Card
            title="箱温趋势"
            subtitle="最近 70 分钟 · 上限 8°C"
            semantic-role="section"
            inspect-id="cold-chain-ops.shipment-detail.temperature-section"
          >
            <div
              class="temperature-chart"
              data-pb-id="cold-chain-ops.shipment-detail.temperature-chart"
              data-pb-role="chart"
              data-pb-token-background="color.surface-variant"
              data-pb-token-color="color.on-surface"
              data-pb-token-radius="radius.md"
              data-pb-token-spacing="spacing.sm"
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
                  <i
                    :style="{ height: `${Math.max(18, reading.value * 7)}px` }"
                  />
                  <span>{{ reading.id }}</span>
                </div>
              </div>
              <div class="limit-line"><span>8°C 上限</span></div>
            </div>
            <div class="temperature-summary">
              <div
                data-pb-id="cold-chain-ops.shipment-detail.temperature.metric"
                data-pb-key="current"
                data-pb-role="status"
                data-pb-token-typography="typography.title"
                data-pb-token-color="color.error"
              >
                <span>当前</span
                ><strong>{{ hasExcursion ? "10.8°C" : "6.1°C" }}</strong>
              </div>
              <div
                data-pb-id="cold-chain-ops.shipment-detail.temperature.metric"
                data-pb-key="maximum"
                data-pb-role="status"
                data-pb-token-typography="typography.title"
                data-pb-token-color="color.on-surface"
              >
                <span>最高</span><strong>10.8°C</strong>
              </div>
              <div
                data-pb-id="cold-chain-ops.shipment-detail.temperature.metric"
                data-pb-key="duration"
                data-pb-role="status"
                data-pb-token-typography="typography.title"
                data-pb-token-color="color.on-surface"
              >
                <span>超温</span><strong>47m</strong>
              </div>
            </div>
          </Card>

          <Card
            title="运输事件"
            subtitle="自动记录与人工操作合并展示"
            semantic-role="section"
            inspect-id="cold-chain-ops.shipment-detail.timeline-card"
          >
            <div
              class="event-list"
              data-pb-id="cold-chain-ops.shipment-detail.timeline"
              data-pb-role="list"
              data-pb-token-spacing="spacing.md"
              data-pb-token-color="color.on-surface"
            >
              <div
                v-for="event in shipmentEvents"
                :key="event.id"
                class="event-row"
                data-pb-id="cold-chain-ops.shipment-detail.timeline.event"
                :data-pb-key="event.id"
                data-pb-role="list-item"
                data-pb-token-spacing="spacing.sm-plus"
                data-pb-token-color="color.on-surface"
              >
                <i :class="`tone-${event.tone}`" />
                <time>{{ event.time }}</time>
                <div>
                  <strong
                    data-pb-id="cold-chain-ops.shipment-detail.timeline.event.title"
                    :data-pb-key="event.id"
                    data-pb-role="text"
                    data-pb-token-typography="typography.content"
                    data-pb-token-color="color.on-surface"
                    >{{ event.title }}</strong
                  >
                  <span
                    data-pb-id="cold-chain-ops.shipment-detail.timeline.event.detail"
                    :data-pb-key="event.id"
                    data-pb-role="text"
                    data-pb-token-typography="typography.caption"
                    data-pb-token-color="color.on-surface-muted"
                    >{{ event.detail }}</span
                  >
                </div>
              </div>
            </div>
          </Card>

          <div class="primary-actions">
            <Button
              label="开始处置"
              block
              inspect-id="cold-chain-ops.shipment-detail.open-actions"
              data-pb-action="open-actions"
              @click="openActions"
            >
              <template #prepend><Truck :size="18" /></template>
            </Button>
          </div>
        </div>
      </ScrollableDataList>

      <BottomSheet
        v-model="sheetOpen"
        title="选择处置方式"
        inspect-id="cold-chain-ops.shipment-detail.action-sheet"
        @update:model-value="(value) => !value && closeOverlay()"
      >
        <div class="sheet-actions">
          <Button
            label="填写处置记录"
            block
            inspect-id="cold-chain-ops.shipment-detail.open-resolution"
            data-pb-action="open-resolution"
            @click="openResolution"
          />
          <Button
            label="仅确认接手"
            bg-color="transparent"
            border-color="color.action"
            text-color="color.action"
            block
            inspect-id="cold-chain-ops.shipment-detail.acknowledge"
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
        inspect-id="cold-chain-ops.shipment-detail.ack-dialog"
        @confirm="closeOverlay"
      />
    </div>
  </ColdChainShell>
</template>

<style scoped>
.detail-page,
.detail-scroll {
  height: 100%;
  min-height: 0;
}
.detail-content {
  display: grid;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  padding-bottom: var(--pb-spacing-2xl);
}
.excursion-alert,
.sensor-error {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
}
.sensor-error {
  grid-template-columns: auto minmax(0, 1fr);
  background: var(--pb-color-warning-soft);
  color: var(--pb-color-warning);
}
.excursion-alert div,
.sensor-error div {
  display: grid;
  gap: var(--pb-spacing-xs);
}
.excursion-alert span,
.sensor-error span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.route-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.route-line > div {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  font: var(--pb-typography-content);
}
.route-progress {
  height: 2px;
  background: var(--pb-color-border);
}
.route-progress i {
  display: block;
  width: 68%;
  height: 100%;
  background: var(--pb-color-primary);
}
.shipment-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--pb-spacing-md);
  margin: var(--pb-spacing-md) 0 0;
}
.shipment-facts div {
  display: grid;
  gap: var(--pb-spacing-xs);
}
.shipment-facts dt {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.shipment-facts dd {
  margin: 0;
  font: var(--pb-typography-content);
}
.temperature-chart {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  min-height: 154px;
  padding: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-variant);
}
.chart-scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.chart-bars {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  align-items: end;
  gap: var(--pb-spacing-xs);
  border-bottom: 1px solid var(--pb-color-border);
}
.reading {
  display: grid;
  justify-items: center;
  align-items: end;
  gap: var(--pb-spacing-xs);
  height: 124px;
}
.reading i {
  width: min(18px, 70%);
  border-radius: var(--pb-radius-sm) var(--pb-radius-sm) 0 0;
  background: var(--pb-color-primary);
}
.reading.is-over i {
  background: var(--pb-color-error);
}
.reading span {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
  transform: rotate(-45deg);
  white-space: nowrap;
}
.limit-line {
  position: absolute;
  top: 58px;
  right: var(--pb-spacing-sm);
  left: 36px;
  border-top: 1px dashed var(--pb-color-error);
}
.limit-line span {
  position: absolute;
  right: 0;
  bottom: var(--pb-spacing-xs);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
.temperature-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: var(--pb-spacing-md);
}
.temperature-summary div {
  display: grid;
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
  display: grid;
}
.event-row {
  display: grid;
  grid-template-columns: 10px 42px minmax(0, 1fr);
  gap: var(--pb-spacing-sm-plus);
  padding-block: var(--pb-spacing-sm-plus);
}
.event-row + .event-row {
  border-top: 1px solid var(--pb-color-border);
}
.event-row > i {
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: var(--pb-radius-full);
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
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.event-row div {
  display: grid;
  gap: var(--pb-spacing-xs);
}
.event-row span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.sheet-actions {
  display: grid;
  gap: var(--pb-spacing-sm-plus);
}
.sheet-actions p {
  margin: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
@media (max-width: 360px) {
  .shipment-facts {
    grid-template-columns: 1fr;
  }
  .route-line {
    grid-template-columns: 1fr;
  }
  .route-progress {
    display: none;
  }
}
</style>
