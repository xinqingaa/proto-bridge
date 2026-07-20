<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import FieldServiceShell from "../FieldServiceShell.vue";
import Avatar from "@/design-system/components/basic/Avatar.vue";
import Badge from "@/design-system/components/basic/Badge.vue";
import EmptyState from "@/design-system/components/complex/EmptyState.vue";

const route = useRoute();
const router = useRouter();
const variant = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "default",
);
const theme = computed(() =>
  typeof route.query.theme === "string" ? route.query.theme : "light",
);
function openOrder() {
  void router.push(
    `/prototype/field-service/work-order-detail?variant=default&theme=${theme.value}`,
  );
}
</script>

<template>
  <FieldServiceShell title="消息中心" active="消息">
    <div
      class="page"
      :class="{ 'is-state': variant === 'empty' }"
      data-pb-id="field-service.messages"
    >
      <EmptyState
        v-if="variant === 'empty'"
        title="暂无新消息"
        description="工单更新和客户回复会出现在这里。"
      />
      <template v-else>
        <button class="message is-unread" @click="openOrder">
          <Avatar name="系统" size="sm" tone="secondary" />
          <span class="body">
            <span class="row">
              <strong>工单即将超时</strong>
              <small>12 分钟前</small>
            </span>
            <p>#WO-1042 距离 SLA 截止还有 30 分钟</p>
          </span>
          <Badge label="1" tone="error" />
        </button>
        <button class="message">
          <Avatar name="王成" size="sm" />
          <span class="body">
            <span class="row">
              <strong>客户补充了现场照片</strong>
              <small>35 分钟前</small>
            </span>
            <p>中央空调异常检修 · 3 张图片</p>
          </span>
        </button>
        <button class="message">
          <Avatar name="调度" size="sm" tone="secondary" />
          <span class="body">
            <span class="row">
              <strong>新工单已分配</strong>
              <small>1 小时前</small>
            </span>
            <p>消防泵例行巡检 · 今天 14:30</p>
          </span>
        </button>
      </template>
    </div>
  </FieldServiceShell>
</template>

<style scoped>
.page {
  display: grid;
  align-content: start;
  grid-auto-rows: min-content;
  min-height: 100%;
  padding: 4px 0;
}
.page.is-state {
  place-content: center;
  justify-items: center;
  padding: 16px;
}
.message {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 0;
  padding: 10px 16px;
  border: 0;
  border-bottom: 1px solid var(--pb-color-divider);
  background: var(--pb-color-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.message.is-unread {
  background: var(--pb-color-primary-soft);
}
.body {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.row strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--pb-typography-content);
  font-weight: 600;
}
.row small {
  flex: none;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  white-space: nowrap;
}
.body p {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
