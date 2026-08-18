<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Badge from "@/design-system/components/display/Badge.vue";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import Spinner from "@/design-system/components/display/Spinner.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import SearchBar from "@/design-system/components/input/SearchBar.vue";
import ColdChainShell from "../ColdChainShell.vue";
import { exceptions, type ColdChainException } from "../mock";
import { openColdChainScreen, replaceColdChainVariant } from "../nav";

const route = useRoute();
const router = useRouter();
const query = ref("");
const severityTabs = [
  { value: "all", label: "全部" },
  { value: "critical", label: "严重" },
  { value: "warning", label: "警告" },
  { value: "attention", label: "关注" },
] satisfies Array<{ value: string; label: string }>;
type SeverityTab = (typeof severityTabs)[number]["value"];

const severityByTab: Record<SeverityTab, ColdChainException["severity"] | undefined> = {
  all: undefined,
  critical: "严重",
  warning: "警告",
  attention: "关注",
};
const variantByTab: Record<SeverityTab, string> = {
  all: "default",
  critical: "critical-only",
  warning: "warning-only",
  attention: "attention-only",
};
const tabByVariant: Record<string, SeverityTab> = {
  default: "all",
  "critical-only": "critical",
  "warning-only": "warning",
  "attention-only": "attention",
};
const filter = ref<SeverityTab>("all");
const refreshing = ref(false);
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);

watch(
  variant,
  (value) => {
    filter.value = tabByVariant[value] ?? "all";
    query.value = "";
  },
  { immediate: true },
);

function exceptionsForTab(tab: SeverityTab) {
  if (variant.value === "empty") return [];
  const severity = severityByTab[tab];
  const needle = query.value.trim().toLowerCase();
  return exceptions.filter((item) => {
    const matchesFilter = !severity || item.severity === severity;
    const matchesQuery =
      !needle ||
      `${item.id} ${item.shipmentId} ${item.lane} ${item.cargo}`
        .toLowerCase()
        .includes(needle);
    return matchesFilter && matchesQuery;
  });
}

const emptyTitle = computed(() =>
  query.value.trim() ? "没有匹配的异常" : "没有待处理异常",
);
const emptyDescription = computed(() =>
  query.value.trim()
    ? "可以尝试搜索其他运单、线路或异常编号。"
    : "当前筛选范围内的运输温度全部正常。",
);

const severityCounts = computed(() => ({
  严重: exceptions.filter((item) => item.severity === "严重").length,
  待接手: exceptions.filter((item) => item.status === "待接手").length,
  最长超温: Math.max(...exceptions.map((item) => item.durationMinutes)),
}));

function selectSeverity(value: string) {
  if (!severityTabs.some((tab) => tab.value === value)) return;
  const tab = value as SeverityTab;
  const nextVariant = variantByTab[tab];
  if (!nextVariant) return;
  void replaceColdChainVariant(router, route, nextVariant);
}

function showCritical() {
  selectSeverity("critical");
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
          <Icon name="alert-triangle" size="lg" tone="error" />
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
            inspect-id="cold-chain-ops.exception-queue.retry"
            @click="retry"
          />
        </section>
      </template>

      <ScrollableDataList
        v-else
        class="queue-scroll"
        :pull-refresh="{ enabled: true, mouse: false }"
        :load-more="false"
        :refreshing="refreshing"
        inspect-id="cold-chain-ops.exception-queue.scroll-list"
        @refresh="refresh"
      >
        <div class="queue-content">
          <Card
            semantic-role="summary"
            inspect-id="cold-chain-ops.exception-queue.summary"
          >
            <div
              class="card-body"
              data-pb-id="cold-chain-ops.exception-queue.summary.body"
              data-pb-role="group"
              data-pb-token-spacing="spacing.md"
            >
              <header class="card-heading">
                <div>
                  <h2
                    data-pb-id="cold-chain-ops.exception-queue.summary.title"
                    data-pb-role="text"
                    data-pb-token-color="color.on-surface"
                    data-pb-token-typography="typography.subtitle"
                  >
                    当前风险
                  </h2>
                  <p
                    data-pb-id="cold-chain-ops.exception-queue.summary.subtitle"
                    data-pb-role="text"
                    data-pb-token-color="color.on-surface-muted"
                    data-pb-token-typography="typography.caption"
                  >
                    华东区域 · 14:35 更新
                  </p>
                </div>
              </header>
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
                <Icon name="alert-triangle" size="md" />
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
                <Icon name="snowflake" size="md" />
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
                <Icon name="clock" size="md" />
                <strong>{{ severityCounts.最长超温 }}m</strong>
                <span>最长超温</span>
              </div>
              </div>
              <Button
                label="仅看严重异常"
                kind="secondary"
                block
                inspect-id="cold-chain-ops.exception-queue.show-critical"
                data-pb-action="show-critical"
                @click="showCritical"
              />
            </div>
          </Card>

          <SearchBar
            v-model="query"
            placeholder="搜索异常、运单或线路"
            inspect-id="cold-chain-ops.exception-queue.search"
          />
          <PrimaryTabs
            v-model="filter"
            :items="severityTabs"
            grow
            inspect-id="cold-chain-ops.exception-queue.severity-tabs"
            @update:model-value="selectSeverity"
          >
            <template
              v-for="tab in severityTabs"
              :key="tab.value"
              #[tab.value]
            >
              <EmptyState
                v-if="exceptionsForTab(tab.value).length === 0"
                :title="emptyTitle"
                :description="emptyDescription"
                :inspect-id="
                  tab.value === filter
                    ? 'cold-chain-ops.exception-queue.empty'
                    : 'cold-chain-ops.exception-queue.empty.' + tab.value
                "
              />

              <DataList
                v-else
                class="exception-list"
                :divided="false"
                surface="none"
                rounded="none"
                :inspect-id="
                  tab.value === filter
                    ? 'cold-chain-ops.exception-queue.list'
                    : 'cold-chain-ops.exception-queue.list.' + tab.value
                "
              >
                <button
                  v-for="item in exceptionsForTab(tab.value)"
                  :key="item.id"
                  type="button"
                  class="exception-row"
                  data-pb-id="cold-chain-ops.exception-queue.list.row"
                  :data-pb-key="tab.value + '-' + item.id"
                  data-pb-role="list-item"
                  data-pb-token-background="color.surface"
                  data-pb-token-radius="radius.lg"
                  data-pb-token-spacing="spacing.md"
                  :data-pb-action="
                    tab.value === filter && item.id === 'ex-017'
                      ? 'open-primary-exception'
                      : undefined
                  "
                  @click="openException(item.shipmentId, item.severity)"
                >
                    <div class="row-heading">
                      <span
                        data-pb-id="cold-chain-ops.exception-queue.list.row.identity"
                        :data-pb-key="tab.value + '-' + item.id"
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
                        :inspect-id="
                          tab.value === filter
                            ? 'cold-chain-ops.exception-queue.list.row.severity'
                            : 'cold-chain-ops.exception-queue.list.row.severity.' + tab.value
                        "
                        :pb-key="tab.value + '-' + item.id"
                      />
                    </div>
                    <strong
                      data-pb-id="cold-chain-ops.exception-queue.list.row.lane"
                      :data-pb-key="tab.value + '-' + item.id"
                      data-pb-role="text"
                      data-pb-token-typography="typography.subtitle"
                      data-pb-token-color="color.on-surface"
                      >{{ item.lane }}</strong
                    >
                    <span
                      data-pb-id="cold-chain-ops.exception-queue.list.row.cargo"
                      :data-pb-key="tab.value + '-' + item.id"
                      data-pb-role="text"
                      data-pb-token-typography="typography.caption"
                      data-pb-token-color="color.on-surface-muted"
                      >{{ item.cargo }}</span
                    >
                    <div class="temperature-line">
                      <Icon name="thermometer" size="sm" />
                      <strong
                        data-pb-id="cold-chain-ops.exception-queue.list.row.temperature"
                        :data-pb-key="tab.value + '-' + item.id"
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
            </template>
          </PrimaryTabs>
        </div>
      </ScrollableDataList>
    </div>
  </ColdChainShell>
</template>

<style scoped>
.queue-page,
.queue-scroll {
  height: var(--pb-layout-fill);
  min-height: var(--pb-spacing-none);
}
.queue-content {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
}
.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}
.card-heading h2,
.card-heading p {
  margin: var(--pb-spacing-none);
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
.metric-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-sm);
}
.metric {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pb-spacing-xs);
  min-width: var(--pb-sizing-control-lg);
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
  flex-basis: var(--pb-layout-fill);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.exception-list {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
}
.exception-row {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  width: var(--pb-layout-fill);
  padding: var(--pb-spacing-md);
  border: var(--pb-border-default);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  text-align: left;
}
.exception-row:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
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
  border-top: var(--pb-border-default);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.temperature-line span {
  min-width: var(--pb-spacing-none);
}
.temperature-line strong {
  color: var(--pb-color-error);
}
.temperature-line small {
  margin-left: auto;
}
.center-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-sm-plus);
  height: var(--pb-layout-fill);
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
  margin: var(--pb-spacing-none);
}
</style>
