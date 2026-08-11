<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AlertTriangle, Clock3, Snowflake, Thermometer } from "lucide-vue-next";
import Badge from "@/design-system/components/basic/Badge.vue";
import Button from "@/design-system/components/basic/Button.vue";
import Card from "@/design-system/components/basic/Card.vue";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import DataList from "@/design-system/components/complex/DataList.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";
import FilterBar from "@/design-system/components/complex/FilterBar.vue";
import ScrollableDataList from "@/design-system/components/complex/ScrollableDataList.vue";
import SearchBar from "@/design-system/components/complex/SearchBar.vue";
import ColdChainShell from "../ColdChainShell.vue";
import { exceptions } from "../mock";
import { openColdChainScreen, replaceColdChainVariant } from "../nav";

const route = useRoute();
const router = useRouter();
const query = ref("");
const filter = ref("全部");
const refreshing = ref(false);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

watch(
  variant,
  (value) => {
    filter.value = value === "critical-only" ? "严重" : "全部";
    query.value = "";
  },
  { immediate: true },
);

const visibleExceptions = computed(() => {
  if (variant.value === "empty") return [];
  return exceptions.filter((item) => {
    const matchesFilter =
      filter.value === "全部" || item.severity === filter.value;
    const needle = query.value.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      `${item.id} ${item.shipmentId} ${item.lane} ${item.cargo}`
        .toLowerCase()
        .includes(needle);
    return matchesFilter && matchesQuery;
  });
});

const severityCounts = computed(() => ({
  严重: exceptions.filter((item) => item.severity === "严重").length,
  待接手: exceptions.filter((item) => item.status === "待接手").length,
  最长超温: Math.max(...exceptions.map((item) => item.durationMinutes)),
}));

function showCritical() {
  void replaceColdChainVariant(router, route, "critical-only");
}

function openException(shipmentId: string, severity: string) {
  void openColdChainScreen(
    router,
    route,
    "shipment-detail",
    severity === "严重" ? "active-excursion" : "default",
    shipmentId,
  );
}

function retry() {
  void replaceColdChainVariant(router, route, "default");
}

function refresh() {
  refreshing.value = true;
  window.setTimeout(() => {
    refreshing.value = false;
  }, 450);
}
</script>

<template>
  <ColdChainShell title="冷链异常" screen-id="cold-chain-ops.exception-queue">
    <div
      class="queue-page"
      data-pb-id="cold-chain-ops.exception-queue.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
      data-pb-token-spacing="spacing.md"
    >
      <template v-if="variant === 'loading'">
        <div class="center-state">
          <Spinner
            label="正在同步运输监控数据"
            size="lg"
            inspect-id="cold-chain-ops.exception-queue.loading"
          />
        </div>
      </template>

      <template v-else-if="variant === 'error'">
        <section
          class="error-state"
          role="alert"
          data-pb-id="cold-chain-ops.exception-queue.error"
          data-pb-role="error-state"
          data-pb-token-background="color.error-soft"
          data-pb-token-color="color.error"
          data-pb-token-radius="radius.lg"
          data-pb-token-spacing="spacing.md"
        >
          <AlertTriangle :size="28" aria-hidden="true" />
          <strong
            data-pb-id="cold-chain-ops.exception-queue.error.title"
            data-pb-role="text"
            data-pb-token-typography="typography.subtitle"
            data-pb-token-color="color.on-surface"
            >监控数据暂时不可用</strong
          >
          <p
            data-pb-id="cold-chain-ops.exception-queue.error.description"
            data-pb-role="text"
            data-pb-token-typography="typography.content"
            data-pb-token-color="color.on-surface-muted"
          >
            最后一次成功同步为 14:28，请检查连接后重试。
          </p>
          <Button
            label="重新加载"
            bg-color="color.primary"
            border-color="color.primary"
            text-color="color.on-primary"
            inspect-id="cold-chain-ops.exception-queue.retry"
            @click="retry"
          />
        </section>
      </template>

      <ScrollableDataList
        v-else
        class="queue-scroll"
        :pull-refresh="{ enabled: true, mouse: true }"
        :drag-scroll="{ enabled: true, mouse: true, momentum: true }"
        :load-more="true"
        :has-more="false"
        :refreshing="refreshing"
        inspect-id="cold-chain-ops.exception-queue.scroll-list"
        @refresh="refresh"
      >
        <div class="queue-content">
          <Card
            title="当前风险"
            subtitle="华东区域 · 14:35 更新"
            semantic-role="summary"
            inspect-id="cold-chain-ops.exception-queue.summary"
          >
            <div class="metric-grid">
              <div
                class="metric is-critical"
                data-pb-id="cold-chain-ops.exception-queue.summary.metric"
                data-pb-key="critical"
                data-pb-role="status"
                data-pb-token-background="color.error-soft"
                data-pb-token-color="color.error"
                data-pb-token-radius="radius.md"
                data-pb-token-spacing="spacing.sm"
              >
                <AlertTriangle :size="18" />
                <strong>{{ severityCounts.严重 }}</strong>
                <span>严重异常</span>
              </div>
              <div
                class="metric"
                data-pb-id="cold-chain-ops.exception-queue.summary.metric"
                data-pb-key="unassigned"
                data-pb-role="status"
                data-pb-token-background="color.warning-soft"
                data-pb-token-color="color.warning"
                data-pb-token-radius="radius.md"
                data-pb-token-spacing="spacing.sm"
              >
                <Snowflake :size="18" />
                <strong>{{ severityCounts.待接手 }}</strong>
                <span>等待接手</span>
              </div>
              <div
                class="metric"
                data-pb-id="cold-chain-ops.exception-queue.summary.metric"
                data-pb-key="longest"
                data-pb-role="status"
                data-pb-token-background="color.surface-variant"
                data-pb-token-color="color.on-surface"
                data-pb-token-radius="radius.md"
                data-pb-token-spacing="spacing.sm"
              >
                <Clock3 :size="18" />
                <strong>{{ severityCounts.最长超温 }}m</strong>
                <span>最长超温</span>
              </div>
            </div>
            <Button
              label="仅看严重异常"
              bg-color="color.error-soft"
              border-color="color.error-soft"
              text-color="color.error"
              size="sm"
              inspect-id="cold-chain-ops.exception-queue.show-critical"
              data-pb-action="show-critical"
              @click="showCritical"
            />
          </Card>

          <SearchBar
            v-model="query"
            placeholder="搜索异常、运单或线路"
            inspect-id="cold-chain-ops.exception-queue.search"
          />
          <FilterBar
            v-model="filter"
            :items="['全部', '严重', '警告', '关注']"
            inspect-id="cold-chain-ops.exception-queue.filters"
          />

          <EmptyState
            v-if="visibleExceptions.length === 0"
            title="没有待处理异常"
            description="当前筛选范围内的运输温度全部正常。"
            inspect-id="cold-chain-ops.exception-queue.empty"
          />

          <DataList
            v-else
            class="exception-list"
            :divided="false"
            surface="none"
            rounded="none"
            inspect-id="cold-chain-ops.exception-queue.list"
          >
            <button
              v-for="item in visibleExceptions"
              :key="item.id"
              type="button"
              class="exception-row"
              data-pb-id="cold-chain-ops.exception-queue.list.row"
              :data-pb-key="item.id"
              data-pb-role="list-item"
              data-pb-token-background="color.surface"
              data-pb-token-radius="radius.lg"
              data-pb-token-spacing="spacing.md"
              :data-pb-action="
                item.id === 'ex-017' ? 'open-primary-exception' : undefined
              "
              @click="openException(item.shipmentId, item.severity)"
            >
              <div class="row-heading">
                <span
                  data-pb-id="cold-chain-ops.exception-queue.list.row.identity"
                  :data-pb-key="item.id"
                  data-pb-role="text"
                  data-pb-token-typography="typography.caption-strong"
                  data-pb-token-color="color.on-surface-muted"
                  >{{ item.id.toUpperCase() }} · {{ item.shipmentId }}</span
                >
                <Badge
                  :label="item.severity"
                  :tone="
                    item.severity === '严重'
                      ? 'error'
                      : item.severity === '警告'
                        ? 'warning'
                        : 'primary'
                  "
                  inspect-id="cold-chain-ops.exception-queue.list.row.severity"
                  :pb-key="item.id"
                />
              </div>
              <strong
                data-pb-id="cold-chain-ops.exception-queue.list.row.lane"
                :data-pb-key="item.id"
                data-pb-role="text"
                data-pb-token-typography="typography.subtitle"
                data-pb-token-color="color.on-surface"
                >{{ item.lane }}</strong
              >
              <span
                data-pb-id="cold-chain-ops.exception-queue.list.row.cargo"
                :data-pb-key="item.id"
                data-pb-role="text"
                data-pb-token-typography="typography.caption"
                data-pb-token-color="color.on-surface-muted"
                >{{ item.cargo }}</span
              >
              <div class="temperature-line">
                <Thermometer :size="17" aria-hidden="true" />
                <strong
                  data-pb-id="cold-chain-ops.exception-queue.list.row.temperature"
                  :data-pb-key="item.id"
                  data-pb-role="status"
                  data-pb-token-typography="typography.title-sm"
                  :data-pb-token-color="
                    item.severity === '严重' ? 'color.error' : 'color.warning'
                  "
                  >{{ item.currentTemperature.toFixed(1) }}°C</strong
                >
                <span
                  >上限 {{ item.upperLimit }}°C · 已持续
                  {{ item.durationMinutes }} 分钟</span
                >
                <small>{{ item.updatedAt }}</small>
              </div>
            </button>
          </DataList>
        </div>
      </ScrollableDataList>
    </div>
  </ColdChainShell>
</template>

<style scoped>
.queue-page,
.queue-scroll {
  height: 100%;
  min-height: 0;
}
.queue-content {
  display: grid;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--pb-spacing-sm);
  margin-bottom: var(--pb-spacing-sm-plus);
}
.metric {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-variant);
  color: var(--pb-color-on-surface);
}
.metric.is-critical {
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
}
.metric strong {
  font: var(--pb-typography-title-sm);
}
.metric span {
  grid-column: 1 / -1;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.exception-list {
  display: grid;
  gap: var(--pb-spacing-sm-plus);
}
.exception-row {
  display: grid;
  gap: var(--pb-spacing-xs);
  width: 100%;
  padding: var(--pb-spacing-md);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  text-align: left;
}
.row-heading,
.temperature-line {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
}
.row-heading {
  justify-content: space-between;
}
.temperature-line {
  margin-top: var(--pb-spacing-sm);
  padding-top: var(--pb-spacing-sm);
  border-top: 1px solid var(--pb-color-border);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.temperature-line strong {
  color: var(--pb-color-error);
}
.temperature-line small {
  margin-left: auto;
}
.center-state,
.error-state {
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--pb-spacing-sm-plus);
  height: 100%;
  padding: var(--pb-spacing-lg);
  text-align: center;
}
.error-state {
  height: auto;
  margin: var(--pb-spacing-md);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-error-soft);
  color: var(--pb-color-error);
}
.error-state strong,
.error-state p {
  margin: 0;
}
@media (max-width: 360px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
