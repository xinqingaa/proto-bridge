<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import FieldServiceShell from "../FieldServiceShell.vue";
import Card from "@/design-system/components/basic/Card.vue";
import Avatar from "@/design-system/components/basic/Avatar.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import Divider from "@/design-system/components/basic/Divider.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";

const route = useRoute();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
</script>

<template>
  <FieldServiceShell title="客户详情" active="工单" back-to="work-order-detail">
    <div
      class="page"
      :class="{ 'is-state': variant === 'empty' }"
      data-pb-id="field-service.customer-detail"
    >
      <EmptyState v-if="variant === 'empty'" title="暂无服务记录" />
      <template v-else>
        <div class="profile">
          <Avatar name="远景科技" size="lg" />
          <div>
            <h1>上海远景科技有限公司</h1>
            <p>重点客户 · 合作 3 年</p>
          </div>
          <Chip label="服务中" tone="success" />
        </div>
        <Card title="主要联系人" subtitle="设施管理">
          <div class="contact">
            <Avatar name="王成" /><span
              ><strong>王成</strong
              ><small>设施主管 · 138****8821</small></span
            >
          </div>
        </Card>
        <Card title="服务地址" subtitle="上海市浦东新区">
          <p>张江科学城科苑路 88 号 A3 栋</p>
          <Divider /><small>服务时间：工作日 09:00–18:00</small>
        </Card>
        <Card title="最近工单" subtitle="近 30 天">
          <ul>
            <li>
              <strong>中央空调异常检修</strong><span>处理中</span>
            </li>
            <li>
              <strong>消防泵例行巡检</strong><span>已完成</span>
            </li>
          </ul>
        </Card>
      </template>
    </div>
  </FieldServiceShell>
</template>

<style scoped>
.page {
  display: grid;
  gap: 14px;
  min-height: 100%;
  padding: 16px;
}
.page.is-state {
  place-content: center;
  justify-items: center;
}
.profile {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}
.profile h1 {
  margin: 0;
  font: var(--pb-typography-subtitle);
}
.profile p,
.contact small,
small {
  margin: 2px 0 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.contact {
  display: flex;
  align-items: center;
  gap: 10px;
}
.contact span {
  display: grid;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}
li {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--pb-color-divider);
  font: var(--pb-typography-content);
}
li span {
  color: var(--pb-color-primary);
  font: var(--pb-typography-caption);
}
</style>
