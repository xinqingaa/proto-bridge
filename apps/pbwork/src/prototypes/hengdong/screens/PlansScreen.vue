<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Chip from "@/design-system/components/display/Chip.vue";
import EmptyState from "@/design-system/components/display/EmptyState.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import FilterBar from "@/design-system/components/navigation/FilterBar.vue";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
import SearchBar from "@/design-system/components/input/SearchBar.vue";
import HengdongRoot from "../HengdongRoot.vue";
import { openHengdongScreen } from "../nav";
import { getPlans } from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const query = ref("");
const tab = ref("我的计划");
const filter = ref("全部");
const storedPlans = ref(getPlans());
const variant = computed(() => String(route.query.variant ?? "default"));
const tabItems = [
  { value: "我的计划", label: "我的计划" },
  { value: "推荐", label: "推荐" },
];
const visiblePlans = computed(() =>
  variant.value === "empty"
    ? []
    : storedPlans.value.filter((plan) => {
        const matchesFilter =
          filter.value === "全部" || plan.level === filter.value;
        return matchesFilter && plan.name.includes(query.value.trim());
      }),
);
</script>

<template>
  <HengdongRoot active="plans" screen-id="hengdong.plans">
    <section
      class="hd-page"
      data-pb-id="hengdong.plans.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="variant === 'default'"
        :load-more="false"
        inspect-id="hengdong.plans.scroll-list"
      >
        <div class="hd-content">
          <div class="hd-row-head">
            <div class="hd-row-main">
              <span class="hd-eyebrow">训练计划</span>
              <h1 class="hd-card-title">为下一次行动准备好</h1>
            </div>
            <Button
              label="新建"
              size="sm"
              inspect-id="hengdong.plans.create"
              data-pb-action="create-plan"
              @click="
                openHengdongScreen(router, route, 'plan-editor', 'default')
              "
            />
          </div>
          <PrimaryTabs
            v-model="tab"
            :items="tabItems"
            :swipe="false"
            :mouse-swipe="false"
            inspect-id="hengdong.plans.tabs"
          >
            <template #我的计划><span /></template>
            <template #推荐><span /></template>
          </PrimaryTabs>
          <SearchBar
            v-model="query"
            placeholder="搜索训练计划"
            inspect-id="hengdong.plans.search"
          />
          <FilterBar
            v-model="filter"
            :items="['全部', '入门', '进阶']"
            inspect-id="hengdong.plans.filters"
          />
          <EmptyState
            v-if="visiblePlans.length === 0"
            title="还没有训练计划"
            description="从一个 15 分钟计划开始，不追求一次做很多。"
            action-label="创建计划"
            inspect-id="hengdong.plans.empty"
            @action="openHengdongScreen(router, route, 'plan-editor')"
          />
          <DataList
            v-else
            :divided="false"
            surface="none"
            rounded="none"
            inspect-id="hengdong.plans.list"
          >
            <button
              v-for="plan in visiblePlans"
              :key="plan.id"
              type="button"
              class="hd-row hd-list-button hd-plan-row"
              data-pb-id="hengdong.plans.list.row"
              :data-pb-key="plan.id"
              data-pb-role="list-item"
              data-pb-token-background="color.surface"
              data-pb-token-radius="radius.lg"
              data-pb-token-spacing="spacing.md"
              :data-pb-action="
                plan.id === 'wake-up-15' ? 'open-primary-plan' : undefined
              "
              @click="
                openHengdongScreen(router, route, 'plan-detail', 'default', {
                  plan: plan.id,
                })
              "
            >
              <span class="hd-row-main"
                ><span class="hd-inline"
                  ><Chip
                    :label="plan.level"
                    :tone="plan.level === '入门' ? 'success' : 'primary'"
                  /><span class="hd-caption"
                    >每周 {{ plan.weeklyTarget }} 次</span
                  ></span
                >
                <h3>{{ plan.name }}</h3>
                <span class="hd-muted">{{ plan.description }}</span></span
              >
              <strong>{{ plan.minutes }}′</strong>
            </button>
          </DataList>
        </div>
      </ScrollableDataList>
    </section>
  </HengdongRoot>
</template>

<style scoped>
.hd-plan-row {
  margin-bottom: var(--pb-spacing-sm);
  border: var(--pb-border-default);
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-surface);
}
</style>
